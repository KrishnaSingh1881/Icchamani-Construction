import {useState,type FormEvent} from 'react'
import {useWorkspace} from '../data/WorkspaceProvider'
import {useWorkspaceRows} from '../data/useWorkspaceRows'
import {Button} from '../components/ui/button'
import {History} from './Activity'
import type {Membership} from '../domain/records'

export function Admin() {
  const {queue,member,client,sync,db}=useWorkspace();const directory=useWorkspaceRows<Membership>('app_members')
  const backups=useWorkspaceRows<{id:number;success:boolean;filename:string;size_bytes:number;created_at:string}>('backup_runs')
  const [subject,setSubject]=useState('');const [name,setName]=useState('');const [active,setActive]=useState(true);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setMessage('')
    try {if(!navigator.onLine)throw new Error('Connect to change workspace access.');const {error}=await client.rpc('set_member',{subject:subject.trim(),display_name:name.trim(),active});if(error)throw new Error(error.message);await sync();setMessage('Workspace access updated. Revoke Clerk sessions separately if needed.');setSubject('');setName('')}
    catch(error){setMessage(error instanceof Error?error.message:'Could not change access.')}finally{setBusy(false)}
  }
  async function exportLocal() {
    try {
      const [records,outbox,receipts,drafts]=await Promise.all([db.records.toArray(),db.outbox.toArray(),db.receipts.toArray(),db.drafts.toArray()])
      const blob=new Blob([JSON.stringify({format:'gaadihisaab-device-export-v1',exported_at:new Date().toISOString(),subject:member.clerk_subject,records,outbox,receipts,drafts},null,2)],{type:'application/json'})
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`gaadihisaab-device-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
      setMessage('Device export downloaded. This includes unsynced work on this device; it is not a complete server backup.')
    }catch(error){setMessage(error instanceof Error?error.message:'Could not export device data.')}
  }
  return <><div className="page-heading"><h1>Workspace health.</h1><p>Technical administration for {member.display_name}.</p></div><section className="record-card"><h2>Local sync queue</h2><p>{queue.length} pending or failed operations on this device.</p><Button variant="outline" onClick={()=>void exportLocal()}>Export device data</Button><p className="panel-note">Server backups and restoring them require the Supabase connection. This export does not include other devices’ unsynced entries.</p></section><section className="record-card"><h2>Server backups</h2>{backups.rows.length?backups.rows.slice(0,5).map(backup=><div className="member-row" key={backup.id}><span><strong>{backup.success?"Database export encrypted":"Backup failed"}</strong><small>{new Date(backup.created_at).toLocaleString("en-IN")} · {Math.round(backup.size_bytes/1024)} KB</small></span></div>):<p className="panel-note">No recorded backup runs. Configure the private repository workflow and verify its retained artifact before relying on it.</p>}{backups.error&&<p className="form-error">{backups.error}</p>}<p className="panel-note">Database status records export completion. Confirm upload and retention in GitHub Actions. Delayed or missing scheduled runs must be checked there.</p></section><section className="record-card"><h2>Approved accounts</h2>{directory.rows.map(person=><div className="member-row" key={person.clerk_subject}><span><strong>{person.display_name}</strong><small>{person.role.replaceAll('_',' ')} · {person.active?'active':'revoked'}</small></span>{person.role==='business_user'&&<Button variant="outline" onClick={()=>{setSubject(person.clerk_subject);setName(person.display_name);setActive(person.active)}}>Manage</Button>}</div>)}{directory.error&&<p className="form-error">{directory.error}</p>}</section><form className="entry-form record-card" onSubmit={save}><h2>Add or change business access</h2><label>Clerk user ID<input required value={subject} maxLength={200} onChange={event=>setSubject(event.target.value)}/></label><label>Display name<input required value={name} maxLength={100} onChange={event=>setName(event.target.value)}/></label><label>Workspace access<select value={active?'active':'revoked'} onChange={event=>setActive(event.target.value==='active')}><option value="active">Approved</option><option value="revoked">Revoked</option></select></label><Button disabled={busy||!subject.trim()||!name.trim()} type="submit">{busy?'Saving…':'Save access'}</Button></form>{message&&<p className="panel-note" role="status">{message}</p>}<p className="panel-note">Clerk account and session administration remains in the Clerk dashboard. Business reviews belong to the involved users.</p><History/></>
}
