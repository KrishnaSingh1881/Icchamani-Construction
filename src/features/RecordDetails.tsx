import {useWorkspace} from '../data/WorkspaceProvider'
import {Button} from '../components/ui/button'
import {RecordProvenance} from './RecordProvenance'
import {History} from './Activity'
import {kindLabels,recordName} from './RecordEditor'
import {formatMoney} from '../domain/money'
import {canManageBusiness} from '../domain/permissions'
import type {AnyRecord} from '../domain/records'

export function RecordDetails({record,edit}:{record:AnyRecord;edit:(record:AnyRecord)=>void}) {
  const {choices,member,records}=useWorkspace()
  const current=records.find(row=>row.id===record.id)??record
  const display=(key:string,value:unknown):string=>{
    if(value==null||value==='')return '—'
    if(key.endsWith('_id'))return String(recordName(choices.find(row=>row.id===value)))
    if(key==='amount_paise'&&typeof value==='number')return formatMoney(value)
    if(typeof value==='boolean')return value?'Yes':'No'
    if(typeof value==='object')return Object.entries(value).map(([label,entry])=>`${label}: ${String(entry)}`).join(' · ')
    return String(value)
  }
  return <div className="record-details"><RecordProvenance record={current}/><dl className="record-values">{Object.entries(current.data).filter(([,value])=>value!==null&&value!==''&&!(typeof value==='object'&&Object.keys(value??{}).length===0)).map(([key,value])=><div key={key}><dt>{key==='amount_paise'?'Amount':key==='extras'?'Additional details':key.replace(/_id$/,'').replaceAll('_',' ')}</dt><dd>{display(key,value)}</dd></div>)}</dl><p className="panel-note">{kindLabels[current.kind]} · {current.state.replaceAll('_',' ')} · version {current.version}</p>
    {canManageBusiness(member)&&!['cancelled','inactive'].includes(current.state)&&current.kind!=='material'&&<Button type="button" variant="outline" onClick={()=>edit(current)}>Edit entry</Button>}
    <History recordId={record.id}/>
  </div>
}
