import {useEffect,useState} from 'react'
import {useWorkspace} from '../data/WorkspaceProvider'
import {buildReport,type ReportType} from '../domain/reports'
import {businessDate} from '../domain/money'
import {recordName} from './RecordEditor'
import {Button} from '../components/ui/button'
import {useSearchParams} from 'react-router'

export function Reports({clientId}:{clientId?:string}) {
  const {records,queue}=useWorkspace()
  const [params]=useSearchParams()
  const [type,setType]=useState<ReportType>('client');const [subject,setSubject]=useState(clientId??params.get('client')??'')
  const [from,setFrom]=useState(`${businessDate().slice(0,7)}-01`);const [to,setTo]=useState(businessDate())
  const [file,setFile]=useState<File|null>(null);const [url,setUrl]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  useEffect(()=>{if(!file){setUrl('');return}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next)},[file])
  const kind=type==='acknowledgement'?'payment':type
  const options=records.filter(record=>record.kind===kind&&record.state!=='cancelled')
  async function generate() {
    setBusy(true);setMessage('');setFile(null)
    try {if(type!=='expense'&&!subject)throw new Error('Choose who this report is for.');const report=buildReport(records,type,subject,from,to);const {createReportPdf}=await import('./reportPdf');const blob=await createReportPdf(report);setFile(new File([blob],`gaadihisaab-${type}-${to}.pdf`,{type:'application/pdf'}))}
    catch(error){setMessage(error instanceof Error?error.message:'Could not generate this report.')}finally{setBusy(false)}
  }
  async function share() {try{if(file&&navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'GaadiHisaab report'});else setMessage('Open or download the PDF, then use your phone’s share action.')}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))setMessage('Sharing did not complete. Your PDF is still available.')}}
  return <><div className="page-heading"><h1>Clear on paper, too.</h1><p>Generate on this device. No PDF is uploaded or saved to the database.</p></div><form className="entry-form record-card" onSubmit={event=>{event.preventDefault();void generate()}}><label>Report<select value={type} onChange={event=>{setType(event.target.value as ReportType);setSubject('');setFile(null)}}>{(['client','vehicle','driver','expense','acknowledgement'] as ReportType[]).map(value=><option value={value} key={value}>{value==='acknowledgement'?'Payment acknowledgement':`${value[0].toUpperCase()}${value.slice(1)} report`}</option>)}</select></label>{type!=='expense'&&<label>For<select required value={subject} onChange={event=>{setSubject(event.target.value);setFile(null)}}><option value="">Choose a {kind}</option>{options.map(record=><option key={record.id} value={record.id}>{record.kind==='payment'?`${record.data.business_date} · ${record.data.amount_paise/100} · ${recordName(records.find(client=>client.id===record.data.client_id))}`:recordName(record)}</option>)}</select></label>}<div className="date-range"><label>From<input required type="date" value={from} max={to} onChange={event=>{setFrom(event.target.value);setFile(null)}}/></label><label>To<input required type="date" value={to} min={from} onChange={event=>{setTo(event.target.value);setFile(null)}}/></label></div><Button disabled={busy} type="submit">{busy?'Generating on this device…':'Generate PDF'}</Button></form>{queue.length>0&&<p className="panel-note">{queue.length} local entries are waiting. Reports include confirmed records only.</p>}{message&&<p role="status" className="form-error">{message}</p>}{file&&<div className="record-card"><h2>Your PDF is ready.</h2><div className="detail-actions"><a className="settings-link" href={url} target="_blank" rel="noreferrer">Open PDF</a><a className="settings-link" href={url} download={file.name}>Download</a><Button onClick={()=>void share()}>Share PDF</Button></div></div>}</>
}
