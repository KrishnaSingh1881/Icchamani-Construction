import type {AnyRecord,Operation} from './records.ts'

/** Pending records are selectable locally; financial totals still use accepted records. */
export function localChoices(records:AnyRecord[],pending:{operation:Operation;status:string}[],subject:string):AnyRecord[] {
  const choices=new Map(records.map(record=>[record.id,record]))
  for(const {operation:op,status} of pending) {
    if(!['queued','sending','waiting_auth'].includes(status))continue
    const current=choices.get(op.record_id)
    choices.set(op.record_id,{...current,id:op.record_id,kind:op.kind,data:{...current?.data,...op.data},state:op.state,version:current?.version??0,created_by:current?.created_by??subject,updated_by:subject,created_at:current?.created_at??op.client_time,updated_at:op.client_time,change_seq:current?.change_seq??0} as AnyRecord)
  }
  return [...choices.values()]
}

export function changedFields(before:Record<string,unknown>,after:Record<string,unknown>) {
  return Object.fromEntries(Object.entries(after).filter(([key,value])=>JSON.stringify(before[key])!==JSON.stringify(value)))
}

export function repeatedWork(record:AnyRecord,date:string):Record<string,unknown> {
  const data={...record.data} as Record<string,unknown>
  if('business_date'in data)data.business_date=date
  if(record.kind==='work'){data.started_at=null;data.ended_at=null}
  return data
}
