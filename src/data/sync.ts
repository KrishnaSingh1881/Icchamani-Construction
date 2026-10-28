import type {WriteResult} from '../domain/records.ts'
import {WorkspaceDatabase} from './database.ts'
import {AccessError,type SyncTransport} from './transport.ts'

export class SyncEngine {
  private running:Promise<void>|null=null
  constructor(readonly db:WorkspaceDatabase,readonly transport:SyncTransport) {}
  run(force=false):Promise<void> {
    if(this.running)return this.running
    const work=()=>this.sync(force)
    this.running=(typeof navigator!=='undefined'&&navigator.locks?navigator.locks.request(`gaadihisaab-sync-${this.db.subject}`,work):work()).finally(()=>{this.running=null})
    return this.running
  }
  private async sync(force:boolean) {
    const queue=(await this.db.outbox.orderBy('created_at').toArray()).filter(item=>item.status==='queued'||item.status==='sending'||item.status==='waiting_auth')
    for(const item of queue) {
      if(!force&&item.next_attempt_at>Date.now())continue
      const parents=await this.db.receipts.bulkGet(item.dependencies??[])
      if(parents.some(parent=>parent?.result.status==='rejected')) {
        await this.db.outbox.update(item.id,{status:'failed',error:'A related entry was rejected or its review was resolved. Review these saved details against the accepted record before creating a replacement.'})
        await this.db.receipts.put({id:item.id,result:{status:'rejected',code:'DEPENDENCY_REVIEW',message:'Related entry needs attention.'}})
        continue
      }
      if(parents.some(parent=>parent?.result.status!=='accepted'))continue
      const parent=parents.find(parent=>parent?.result.status==='accepted'&&parent.result.record.id===item.operation.record_id)
      if(item.attempts===0&&parent?.result.status==='accepted')item.operation={...item.operation,expected_version:parent.result.record.version}
      await this.db.outbox.update(item.id,{operation:item.operation,status:'sending',attempts:item.attempts+1})
      let result:WriteResult
      try {result=await this.transport.submit(item.operation)} catch(error) {
        const auth=error instanceof AccessError
        await this.db.outbox.update(item.id,{status:auth?'waiting_auth':'queued',error:error instanceof Error?error.message:'Connection unavailable.',next_attempt_at:Date.now()+Math.min(30000,1000*2**Math.min(item.attempts,5))})
        throw error
      }
      await this.db.transaction('rw',this.db.outbox,this.db.receipts,this.db.records,async()=>{
        await this.db.receipts.put({id:item.id,result})
        if(result.status==='accepted') {
          const current=await this.db.records.get(result.record.id)
          if(!current||current.version<result.record.version)await this.db.records.put(result.record)
          await this.db.outbox.delete(item.id)
        } else if(result.status==='needs_review')await this.db.outbox.update(item.id,{status:'needs_review',conflict_id:result.conflict_id,error:'The involved users need to review this entry.'})
        else await this.db.outbox.update(item.id,{status:'failed',error:result.message})
      })
    }
    let more=true
    while(more) {
      const cursor=Number((await this.db.metadata.get('cursor'))?.value??0)
      const page=await this.transport.pull(cursor)
      if(page.cursor<cursor||(page.has_more&&page.cursor===cursor))throw new Error('Invalid server cursor. Sync paused without discarding local work.')
      await this.db.storeRecords(page.records,page.cursor)
      more=page.has_more
    }
    await this.db.metadata.put({key:'last_sync',value:new Date().toISOString()})
    const pendingReviews=await this.db.outbox.where('status').equals('needs_review').toArray()
    const ids=pendingReviews.flatMap(item=>item.conflict_id?[item.conflict_id]:[])
    if(ids.length&&this.transport.reviews) {
      const reviews=await this.transport.reviews(ids)
      await this.db.transaction('rw',this.db.outbox,this.db.receipts,async()=>{
        for(const item of pendingReviews) {
          const review=reviews.find(review=>review.id===item.conflict_id)
          if(review?.status!=='resolved')continue
          // A resolution may choose a different record. Never silently replay dependent edits over that decision.
          const message=`Review resolved: ${review.resolution?.replaceAll('_',' ')}. Original local details are preserved.`
          await this.db.outbox.update(item.id,{status:'resolved',error:message})
          await this.db.receipts.put({id:item.id,result:{status:'rejected',code:'REVIEW_RESOLVED',message}})
        }
      })
    }
  }
}
