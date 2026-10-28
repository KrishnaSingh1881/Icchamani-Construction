import {useState} from 'react'
import {NavLink} from 'react-router'
import {useWorkspace} from '../data/WorkspaceProvider'
import {Icon} from '../components/Icon'
import {Button} from '../components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'
import {kindLabels,recordName} from './RecordEditor'
import {History} from './Activity'
import {useFavourites} from '../data/useFavourites'
import {formatMoney} from '../domain/money'
import type {AnyRecord,RecordKind,RecordState} from '../domain/records'

export function RecordsPage({title,kinds,add,edit,repeat}:{title:string;kinds:RecordKind[];add:(kind:RecordKind)=>void;edit:(record:AnyRecord)=>void;repeat:(record:AnyRecord)=>void}) {
  const {records,queue,change,member}=useWorkspace()
  const {favourites,toggle}=useFavourites()
  const [search,setSearch]=useState('');const [kind,setKind]=useState(kinds[0]);const [from,setFrom]=useState('');const [to,setTo]=useState('')
  const [history,setHistory]=useState<AnyRecord|null>(null);const [correction,setCorrection]=useState<{record:AnyRecord;restore:boolean}|null>(null)
  const [reason,setReason]=useState('');const [message,setMessage]=useState('');const [saving,setSaving]=useState(false)
  const name=(id:unknown)=>recordName(records.find(record=>record.id===id))
  const filtered=records.filter(record=>record.kind===kind&&(!('business_date'in record.data)||(!from||record.data.business_date>=from)&&(!to||record.data.business_date<=to))&&[JSON.stringify(record.data),...Object.entries(record.data).filter(([key])=>key.endsWith('_id')).map(([,value])=>name(value))].join(' ').toLowerCase().includes(search.toLowerCase())).sort((a,b)=>('business_date'in b.data?b.data.business_date:b.created_at).localeCompare('business_date'in a.data?a.data.business_date:a.created_at))
  async function correct() {
    if(!correction)return
    setSaving(true);setMessage('')
    try {
      const record=correction.record
      const master=['vehicle','client','driver','partner','material','route','site','expense_category','field_template'].includes(record.kind)
      const state:RecordState=correction.restore?(record.kind==='work'?'completed':'active'):(master?'inactive':'cancelled')
      await change(record,{},state,correction.restore?'restore':'cancel',reason)
      setCorrection(null);setReason('')
    }catch(error){setMessage(error instanceof Error?error.message:'Could not save this correction.')}finally{setSaving(false)}
  }
  return <><div className="page-heading"><h1>{title}</h1><p>Accepted records, with their history preserved.</p></div><div className="work-toolbar"><div className="search-box"><Icon name="magnifier-linear" size={20}/><input aria-label="Search records" placeholder="Client, vehicle, route or note" value={search} onChange={event=>setSearch(event.target.value)}/></div>{member.role==='business_user'&&kind!=='material'&&<button className="round-add" aria-label={`Add ${kindLabels[kind]}`} onClick={()=>add(kind)}><Icon name="add-linear"/></button>}</div><div className="filter-chips" aria-label="Record type">{kinds.map(type=><button key={type} aria-pressed={kind===type} onClick={()=>setKind(type)}>{kindLabels[type]}</button>)}</div>{!['vehicle','client','driver','partner','material','route','site','expense_category'].includes(kind)&&<div className="date-range"><label>From<input type="date" value={from} max={to||undefined} onChange={event=>setFrom(event.target.value)}/></label><label>To<input type="date" value={to} min={from||undefined} onChange={event=>setTo(event.target.value)}/></label></div>}{message&&<p className="form-error" role="alert">{message}</p>}<div className="record-list">{filtered.map(record=>{
    const inactive=['cancelled','inactive'].includes(record.state)
    return <article className="record-card" key={record.id}><div className="record-top"><span>{kindLabels[record.kind]}</span>{'amount_paise'in record.data&&record.data.amount_paise!=null&&<strong>{formatMoney(record.data.amount_paise)}</strong>}</div><h3>{recordName(record)}</h3><p>{'business_date'in record.data?record.data.business_date:record.state}</p><dl className="record-values">{Object.entries(record.data).filter(([key,value])=>value!=null&&value!==''&&['vehicle_id','client_id','driver_id','partner_id','material_id','route_id','site_id','category_id','quantity','unit','registration','phone','payment_mode','entry_type','payment_type','counterparty','note'].includes(key)).map(([key,value])=><div key={key}><dt>{key.replace(/_id$/,'').replaceAll('_',' ')}</dt><dd>{key.endsWith('_id')?name(value):String(value)}</dd></div>)}</dl><div className="record-meta"><span>Version {record.version}</span><span className="badge">{record.state.replaceAll('_',' ')}</span></div><div className="detail-actions"><Button variant="outline" onClick={()=>setHistory(record)}>History</Button>{["vehicle","client","route"].includes(record.kind)&&<Button variant="outline" aria-pressed={favourites.has(record.id)} onClick={()=>{void toggle(record.id).catch(()=>setMessage("Could not save this favourite on this device."))}}>{favourites.has(record.id)?"Unpin":"Pin"}</Button>}{member.role==='business_user'&&record.kind!=='material'&&<><Button variant="outline" onClick={()=>edit(record)} disabled={inactive}>{record.kind==='work'&&record.state==='in_progress'?'Complete / edit':'Edit'}</Button>{!inactive&&record.kind==='work'&&<Button variant="outline" onClick={()=>repeat(record)}>Add another</Button>}<Button variant="outline" onClick={()=>{setReason('');setCorrection({record,restore:inactive})}}>{inactive?'Restore':'Cancel / inactive'}</Button></>}</div></article>
  })}</div>{!filtered.length&&<div className="empty-state"><h3>No matching {kindLabels[kind].toLowerCase()} records.</h3><p>Try another filter, or add a new entry.</p></div>}{queue.some(item=>item.operation.kind===kind)&&<NavLink className="settings-link" to="/sync">See local entries waiting to sync or review</NavLink>}<Dialog open={!!history} onOpenChange={open=>{if(!open)setHistory(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Record history</DialogTitle><DialogDescription>Who changed this entry, when and why.</DialogDescription></DialogHeader>{history&&<History recordId={history.id}/>}</DialogContent></Dialog><Dialog open={!!correction} onOpenChange={open=>{if(!open&&!saving)setCorrection(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>{correction?.restore?'Restore this record':'Cancel or make inactive'}</DialogTitle><DialogDescription>The original record stays in history. Explain this correction.</DialogDescription></DialogHeader><form className="entry-form" onSubmit={event=>{event.preventDefault();void correct()}}><label>Reason<textarea required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>{message&&<p className="form-error" role="alert">{message}</p>}<Button type="submit" disabled={saving||!reason.trim()}>{saving?'Saving…':'Save correction'}</Button></form></DialogContent></Dialog></>
}
