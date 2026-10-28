import type {AuditEvent} from './records.ts'

function fields(snapshot:unknown):Record<string,unknown> {
  if(!snapshot||typeof snapshot!=='object')return {}
  const row=snapshot as Record<string,unknown>
  const data=row.data&&typeof row.data==='object'?row.data as Record<string,unknown>:row
  const result:Record<string,unknown>={}
  for(const [key,value]of Object.entries(data)) {
    if(key==='extras'&&value&&typeof value==='object')for(const [label,extra]of Object.entries(value))result[`extras.${label}`]=extra
    else if(!['id','version','created_at','updated_at','created_by','updated_by','change_seq','kind'].includes(key))result[key]=value
  }
  if(row.state!==undefined)result.state=row.state
  return result
}
export function auditChanges(event:Pick<AuditEvent,'before_data'|'after_data'>) {
  const before=fields(event.before_data),after=fields(event.after_data)
  return [...new Set([...Object.keys(before),...Object.keys(after)])].filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map(key=>({key,before:before[key],after:after[key]}))
}
