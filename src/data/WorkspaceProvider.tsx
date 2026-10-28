import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react'
import {useAuth} from '@clerk/react'
import {useLiveQuery} from 'dexie-react-hooks'
import {WorkspaceDatabase,type QueueItem} from './database'
import {createWorkspaceClient,getMembership,supabaseTransport,AccessError} from './transport'
import {SyncEngine} from './sync'
import {newOperation,validateRecord,type AnyRecord,type Membership,type RecordKind,type RecordState,type Operation} from '../domain/records'
import type {PublicEnvironment} from '../config/environment'
import {localChoices} from '../domain/local-records'

type Context = {
  records:AnyRecord[]; choices:AnyRecord[]; queue:QueueItem[];
  member:Membership;db:WorkspaceDatabase;client:ReturnType<typeof createWorkspaceClient>;sync:()=>Promise<void>;
  syncing:boolean;syncError:string;create:(kind:RecordKind,data:Record<string,unknown>,state:RecordState,draftKey?:string)=>Promise<string>;
  change:(record:AnyRecord,patch:Record<string,unknown>,state:RecordState,action?:Operation['action'],reason?:string,draftKey?:string)=>Promise<void>
}
const Workspace=createContext<Context|null>(null)
export function useWorkspace() {const context=useContext(Workspace);if(!context)throw new Error('Workspace provider is missing.');return context}

export function WorkspaceProvider({config,children,offlineSubject}:{config:PublicEnvironment;children:ReactNode;offlineSubject?:string}) {
  const {userId,getToken,isLoaded,isSignedIn}=useAuth()
  const subject=userId??offlineSubject
  const db=useMemo(()=>new WorkspaceDatabase(subject!),[subject])
  const client=useMemo(()=>createWorkspaceClient(config,()=>getToken()),[config,getToken])
  const engine=useMemo(()=>new SyncEngine(db,supabaseTransport(client)),[db,client])
  const [member,setMember]=useState<Membership|null>(null)
  const [loading,setLoading]=useState(true)
  const [accessError,setAccessError]=useState('')
  const [syncing,setSyncing]=useState(false)
  const [syncError,setSyncError]=useState('')
  const records=useLiveQuery(()=>db.records.toArray(),[db],[])
  const queue=useLiveQuery(()=>db.outbox.orderBy('created_at').filter(item=>item.status!=='resolved').toArray(),[db],[])
  const sync=useCallback(async()=>{
    if(!navigator.onLine||!isLoaded||!isSignedIn)return
    setSyncing(true);setSyncError('')
    try {
      const current=await getMembership(client)
      await db.storeMembership(current);setMember(current)
      await engine.run(true)
    } catch(error) {
      if(error instanceof AccessError){setMember(null);setAccessError(error.message);await db.metadata.put({key:'membership',value:null})}
      else setSyncError(error instanceof Error?error.message:'Unable to connect. Local work is preserved.')
    } finally {setSyncing(false)}
  },[client,db,engine,isLoaded,isSignedIn])
  useEffect(()=>{
    let disposed=false
    async function start() {
      try {
        await db.open()
        if(disposed)return
        const cached=(await db.metadata.get('membership'))?.value as Membership|undefined
        if(!disposed&&!navigator.onLine&&cached?.active){setMember(cached);setLoading(false);return}
        await sync()
      } catch(error) {if(!disposed)setAccessError(error instanceof Error?error.message:'Cannot open device storage.')} finally {if(!disposed)setLoading(false)}
    }
    void start()
    const refresh=()=>{void sync()}
    const focus=()=>{if(document.visibilityState==='visible')refresh()}
    window.addEventListener('online',refresh);document.addEventListener('visibilitychange',focus)
    const timer=setInterval(refresh,30000)
    const channel=client.channel(`workspace-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'business_records'},refresh).subscribe()
    // React replays effects in development; the same database must remain reopenable.
    return ()=>{disposed=true;clearInterval(timer);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',focus);void client.removeChannel(channel);db.close({disableAutoOpen:false})}
  },[db,client,userId,sync])
  async function enqueue(operation:Operation,draftKey?:string) {if(member?.role!=='business_user')throw new Error('Only business users can add or change business entries.');await db.queue(operation,draftKey);void sync()}
  async function create(kind:RecordKind,data:Record<string,unknown>,state:RecordState,draftKey?:string) {const operation=newOperation(kind,data,state);await enqueue(operation,draftKey);return operation.record_id}
  async function change(record:AnyRecord,patch:Record<string,unknown>,state:RecordState,action:Operation['action']='update',reason='',draftKey?:string) {
    validateRecord(record.kind,{...record.data,...patch},state)
    await enqueue({id:crypto.randomUUID(),record_id:record.id,kind:record.kind,action,expected_version:record.version,data:patch,state,reason,client_time:new Date().toISOString()},draftKey)
  }
  if(loading)return <div className="connection-screen" role="status"><span className="loading-orbit"/><h1>Opening your workspace…</h1><p>Checking this account’s access.</p></div>
  if(!member)return <div className="connection-screen"><h1>{accessError?'Access needs attention.':'Your workspace is not connected yet.'}</h1><p>{accessError||syncError||'Connect to the internet to verify this account. A previously approved account can use its available offline records.'}</p><button className="plain-primary" onClick={()=>{setAccessError('');void sync()}}>Check access again</button><p className="setup-small">The administrator must approve your Clerk user ID in app_members.</p></div>
  const choices=localChoices(records,queue,member.clerk_subject)
  return <Workspace.Provider value={{records,choices,queue,member,db,client,sync,syncing,syncError,create,change}}>{children}</Workspace.Provider>
}
