import Dexie, {type EntityTable} from 'dexie'
import type {AnyRecord,Operation,WriteResult,Membership} from '../domain/records.ts'

export type QueueItem = {id:string;operation:Operation;status:'queued'|'sending'|'needs_review'|'failed'|'waiting_auth'|'resolved';attempts:number;created_at:number;next_attempt_at:number;dependencies:string[];error?:string;conflict_id?:string}
export class WorkspaceDatabase extends Dexie {
  records!:EntityTable<AnyRecord,'id'>
  outbox!:EntityTable<QueueItem,'id'>
  receipts!:EntityTable<{id:string;result:WriteResult},'id'>
  metadata!:EntityTable<{key:string;value:unknown},'key'>
  drafts!:EntityTable<{key:string;data:Record<string,unknown>;updated_at:number},'key'>
  constructor(readonly subject:string) {
    super(`gaadihisaab-${encodeURIComponent(subject)}`)
    this.version(1).stores({records:'id,kind,state,change_seq',outbox:'id,status,created_at,[operation.record_id+created_at]',receipts:'id',metadata:'key',drafts:'key'})
  }
  async queue(operation:Operation,draftKey?:string) {
    return this.transaction('rw',this.outbox,this.drafts,async()=>{
      const existing=await this.outbox.get(operation.id)
      if(existing) {
        if(JSON.stringify(existing.operation)!==JSON.stringify(operation))throw new Error('A submission ID cannot be reused with different details.')
        return existing
      }
      const all=await this.outbox.toArray()
      const previous=all.filter(item=>item.operation.record_id===operation.record_id).sort((a,b)=>b.created_at-a.created_at)[0]
      const references=new Set(Object.entries(operation.data).filter(([key,value])=>key.endsWith('_id')&&typeof value==='string').map(([,value])=>value))
      const dependencies=Array.from(new Set([...(previous?[previous.id]:[]),...all.filter(item=>references.has(item.operation.record_id)).map(item=>item.id)]))
      const created_at=Math.max(Date.now(),...all.map(item=>item.created_at+1))
      const item:QueueItem={id:operation.id,operation,status:'queued',attempts:0,created_at,next_attempt_at:0,dependencies}
      await this.outbox.add(item)
      if(draftKey)await this.drafts.delete(draftKey)
      return item
    })
  }
  async storeRecords(records:AnyRecord[],cursor?:number) {
    await this.transaction('rw',this.records,this.metadata,async()=>{
      for(const incoming of records) {
        const current=await this.records.get(incoming.id)
        if(!current||incoming.version>=current.version)await this.records.put(incoming)
      }
      if(cursor!==undefined) {
        const previous=Number((await this.metadata.get('cursor'))?.value??0)
        await this.metadata.put({key:'cursor',value:Math.max(previous,cursor)})
      }
    })
  }
  async storeMembership(member:Membership) {await this.metadata.put({key:'membership',value:member})}
  async archiveRejected(id:string) {
    await this.transaction('rw',this.outbox,this.receipts,async()=>{
      const item=await this.outbox.get(id);const receipt=await this.receipts.get(id)
      if(item?.status!=='failed'||receipt?.result.status!=='rejected')throw new Error('Only a confirmed rejected submission can be archived. Pending entries must keep their retry ID.')
      await this.outbox.update(id,{status:'resolved'})
    })
  }
}
