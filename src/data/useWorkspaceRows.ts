import {useEffect,useState} from 'react'
import {useLiveQuery} from 'dexie-react-hooks'
import {useWorkspace} from './WorkspaceProvider'

type Table='notifications'|'review_conflicts'|'audit_events'|'app_members'|'backup_runs'
export function useWorkspaceRows<T>(table:Table,recordId?:string) {
  const {db,client}=useWorkspace()
  const key=`rows:${table}:${recordId??'all'}`
  const cached=useLiveQuery(()=>db.metadata.get(key),[db,key])
  const synced=useLiveQuery(()=>db.metadata.get('last_sync'),[db])
  const [page,setPage]=useState(0);const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [more,setMore]=useState(false)
  useEffect(()=>{
    let active=true
    if(!navigator.onLine)return
    setLoading(true)
    async function load() {
      let query=client.from(table).select('*').order(table==='app_members'?'display_name':'created_at',{ascending:table==='app_members'}).order(table==='audit_events'?'id':table==='app_members'?'clerk_subject':'id')
      if(recordId)query=query.eq('record_id',recordId)
      // Read the loaded prefix in bounded pages so PostgREST's per-request row cap cannot hide records.
      const rows:T[]=[]
      for(let index=0;index<=page;index++) {
        const {data,error}=await query.range(index*100,index*100+99)
        if(error)throw new Error(error.message)
        rows.push(...data as T[])
        if(data.length<100){if(active)setMore(false);break}
        if(active)setMore(true)
      }
      if(active){await db.metadata.put({key,value:rows});setError('')}
    }
    void load().catch(error=>{if(active)setError(error instanceof Error?error.message:'Could not refresh. Cached information remains available.')}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[client,db,key,table,recordId,page,synced?.value])
  return {rows:(cached?.value??[]) as T[],loading,error,more,loadMore:()=>setPage(value=>value+1)}
}
