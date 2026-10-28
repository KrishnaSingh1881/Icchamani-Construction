import {useWorkspace} from '../data/WorkspaceProvider'
import {useWorkspaceRows} from '../data/useWorkspaceRows'
import type {AnyRecord,Membership} from '../domain/records'

export function RecordProvenance({record}:{record?:AnyRecord}) {
  const {member}=useWorkspace()
  const {rows:members}=useWorkspaceRows<Membership>('app_members')
  const name=(subject:string)=>subject===member.clerk_subject?member.display_name:members.find(person=>person.clerk_subject===subject)?.display_name??subject
  const date=(value:string)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))
  return <dl className="record-provenance"><div><dt>Entered by</dt><dd>{record?name(record.created_by):member.display_name}</dd></div>
    {record&&<><div><dt>Created</dt><dd>{date(record.created_at)}</dd></div><div><dt>Last updated by</dt><dd>{name(record.updated_by)}</dd></div><div><dt>Last updated</dt><dd>{date(record.updated_at)}</dd></div></>}
  </dl>
}
