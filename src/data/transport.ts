import {createClient,type SupabaseClient} from '@supabase/supabase-js'
import type {PublicEnvironment} from '../config/environment.ts'
import type {AnyRecord,Operation,WriteResult,Membership,Conflict} from '../domain/records.ts'

export class AccessError extends Error {}
export type SyncTransport = {
  submit:(operation:Operation)=>Promise<WriteResult>
  pull:(cursor:number)=>Promise<{records:AnyRecord[];cursor:number;has_more:boolean}>
  reviews?:(ids:string[])=>Promise<Conflict[]>
}
export function createWorkspaceClient(config:PublicEnvironment,getToken:()=>Promise<string|null>) {
  return createClient(config.supabaseUrl,config.supabaseKey,{
    accessToken:getToken,
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  })
}
function throwError(error:{code?:string;message:string}) {
  if(['42501','PGRST301','PGRST302','PGRST303'].includes(error.code??''))throw new AccessError('Sign in again or ask the administrator to check your access.')
  throw new Error(error.message)
}
export async function getMembership(client:SupabaseClient):Promise<Membership> {
  const {data,error}=await client.rpc('current_membership')
  if(error)throwError(error)
  if(!data?.clerk_subject||!data.active)throw new AccessError('This Google account is not approved for the workspace.')
  return data as Membership
}
export function supabaseTransport(client:SupabaseClient):SyncTransport {
  return {
    async reviews(ids) {
      const {data,error}=await client.from('review_conflicts').select('*').in('id',ids)
      if(error)throwError(error)
      return data as Conflict[]
    },
    async submit(operation) {
      const {data,error}=await client.rpc('submit_operation',{operation})
      if(error) {
        if(['23514','23505','22007','22008','22P02'].includes(error.code))return {status:'rejected',code:error.code,message:error.message}
        throwError(error)
      }
      if(!data||!['accepted','needs_review','rejected'].includes(data.status))throw new Error('Unexpected server response. Your entry has been kept for retry.')
      return data as WriteResult
    },
    async pull(cursor) {
      const {data,error}=await client.rpc('pull_changes',{after_seq:cursor,page_size:200})
      if(error)throwError(error)
      if(!data||!Array.isArray(data.records)||typeof data.cursor!=='number'||typeof data.has_more!=='boolean')throw new Error('Unexpected sync response.')
      return data
    },
  }
}
