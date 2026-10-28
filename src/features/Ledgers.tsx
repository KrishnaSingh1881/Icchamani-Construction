import {useState} from 'react'
import {NavLink} from 'react-router'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '../components/ui/tabs'
import {Button} from '../components/ui/button'
import {useWorkspace} from '../data/WorkspaceProvider'
import {summary,accepted} from '../domain/accounting'
import {formatMoney} from '../domain/money'
import {RecordDetails} from './RecordDetails'
import {recordName} from './RecordEditor'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'
import type {AnyRecord,RecordKind} from '../domain/records'

export function Ledgers({add,edit}:{add:(kind:RecordKind,data?:Record<string,unknown>)=>void;edit:(record:AnyRecord)=>void}) {
  const {records,choices}=useWorkspace()
  const [tab,setTab]=useState('driver'),[selected,setSelected]=useState(''),[detail,setDetail]=useState<AnyRecord|null>(null)
  const [from,setFrom]=useState(''),[to,setTo]=useState('')
  const entities=choices.filter(row=>row.kind===tab&&row.state==='active')
  const entity=entities.find(row=>row.id===selected)
  const entries=records.filter(row=>{
    if(!entity||!('business_date'in row.data))return false
    if(from&&row.data.business_date<from||to&&row.data.business_date>to)return false
    return tab==='driver'?row.kind==='driver_payment'&&row.data.driver_id===selected:tab==='vehicle'?'vehicle_id'in row.data&&row.data.vehicle_id===selected:row.kind==='partner_entry'&&row.data.partner_id===selected
  }).sort((a,b)=>('business_date'in b.data?b.data.business_date:b.created_at).localeCompare('business_date'in a.data?a.data.business_date:a.created_at))
  const totals=summary(entries)
  const partnerRows=accepted(entries).filter(row=>row.kind==='partner_entry')
  const incoming=partnerRows.filter(row=>row.data.entry_type==='Contribution').reduce((sum,row)=>sum+row.data.amount_paise,0)
  const outgoing=partnerRows.filter(row=>row.data.entry_type!=='Contribution').reduce((sum,row)=>sum+row.data.amount_paise,0)
  return <><div className="page-heading"><h1>Every ledger. <strong>One place.</strong></h1><p>Driver payments, vehicle performance, and partner money.</p></div>
    <Tabs value={tab} onValueChange={value=>{setTab(value);setSelected('');setFrom('');setTo('')}}>
      <TabsList className="ledger-tabs"><TabsTrigger value="driver">Drivers</TabsTrigger><TabsTrigger value="vehicle">Vehicles</TabsTrigger><TabsTrigger value="partner">Partners</TabsTrigger></TabsList>
      {['driver','vehicle','partner'].map(kind=><TabsContent key={kind} value={kind}>
        {!entity?<><div className="section-heading"><h2>{kind==='driver'?'Driver ledgers':kind==='vehicle'?'Vehicle ledgers':'Partner ledgers'}</h2>{kind!=='vehicle'&&<Button type="button" variant="outline" onClick={()=>add(kind as RecordKind)}>Add {kind}</Button>}</div><div className="ledger-entities">{entities.map(row=><Button key={row.id} type="button" variant="outline" className="ledger-entity" onClick={()=>setSelected(row.id)}><span><strong>{recordName(row)}</strong><small>{row.kind==='vehicle'?row.data.registration:row.kind==='driver'?row.data.phone:'Contributions and withdrawals'}{row.version===0?' · saved on this device':''}</small></span><span aria-hidden="true">→</span></Button>)}</div>{!entities.length&&<div className="empty-state"><h3>No {kind==='vehicle'?'vehicles':kind==='driver'?'drivers':'partners'} yet.</h3><p>{kind==='vehicle'?'Add vehicles in More to start their ledgers.':`Add a ${kind} to start recording entries.`}</p>{kind==='vehicle'&&<NavLink className="settings-link" to="/more">Go to More</NavLink>}</div>}</>:<>
          <Button type="button" variant="ghost" onClick={()=>setSelected('')}>← All {kind==='vehicle'?'vehicles':kind==='driver'?'drivers':'partners'}</Button>
          <div className="section-heading"><h2>{recordName(entity)}</h2><Button type="button" variant="outline" disabled={entity.version===0} onClick={()=>edit(entity)}>Edit {kind}</Button></div>
          <div className="date-range"><label>From<input type="date" value={from} max={to||undefined} onChange={event=>setFrom(event.target.value)}/></label><label>To<input type="date" value={to} min={from||undefined} onChange={event=>setTo(event.target.value)}/></label></div>
          <dl className="ledger-totals">{(kind==='vehicle'?[['Completed work',totals.billed],['Costs',totals.expenses],['Profit / loss',totals.margin]]:kind==='driver'?[['Total paid',totals.expenses]]:[['Contributions',incoming],['Withdrawals & payments',outgoing]]).map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{formatMoney(Number(value))}</dd></div>)}</dl>
          <div className="detail-actions">{kind==='vehicle'?<><Button onClick={()=>add('work',{vehicle_id:entity.id,work_type:entity.kind==='vehicle'?entity.data.vehicle_type:'Hyva'})}>Add work</Button><Button variant="outline" onClick={()=>add('expense',{vehicle_id:entity.id})}>Add expense</Button></>:<Button onClick={()=>add(kind==='driver'?'driver_payment':'partner_entry',{[kind==='driver'?'driver_id':'partner_id']:entity.id})}>{kind==='driver'?'Record payment':'Add partner entry'}</Button>}</div>
          <div className="record-list">{entries.map(row=><Button type="button" variant="ghost" className="ledger-entry" key={row.id} onClick={()=>setDetail(row)}><span><strong>{row.kind==='expense'?recordName(choices.find(category=>category.id===row.data.category_id)):row.kind==='driver_payment'?row.data.payment_type:row.kind==='partner_entry'?row.data.entry_type:recordName(row)}</strong><small>{'business_date'in row.data?row.data.business_date:''} · {row.state.replaceAll('_',' ')}</small></span><strong>{'amount_paise'in row.data&&row.data.amount_paise!=null?formatMoney(row.data.amount_paise):'Not priced'}</strong></Button>)}</div>
          {!entries.length&&<p className="panel-note">No entries in this period. Add an entry above to start this ledger.</p>}
          <p className="panel-note">Totals use confirmed records and exclude cancelled entries. Vehicle costs include driver payments once.</p>
        </>}
      </TabsContent>)}
    </Tabs>
    <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>Entry details</DialogTitle><DialogDescription>Recorded details and the full change trail.</DialogDescription></DialogHeader>{detail&&<RecordDetails record={detail} edit={row=>{setDetail(null);edit(row)}}/>}</DialogContent></Dialog>
  </>
}
