import assert from 'node:assert/strict'
import {test} from 'node:test'
import type {SupabaseClient} from '@supabase/supabase-js'
import {getMembership,AccessError,ApprovalRequiredError} from './transport'

function membershipResponse(data:unknown,error:unknown=null) {
  return {rpc:async(name:string)=>{assert.equal(name,'current_membership');return {data,error}}} as unknown as SupabaseClient
}

test('missing and inactive memberships explain approval; token errors still require sign-in',async()=>{
  for(const membership of [null,{clerk_subject:'user_pending',active:false}]) {
    await assert.rejects(getMembership(membershipResponse(membership)),ApprovalRequiredError)
  }
  const approved={clerk_subject:'user_approved',display_name:'Approved user',role:'business_user',active:true}
  assert.deepEqual(await getMembership(membershipResponse(approved)),approved)
  await assert.rejects(getMembership(membershipResponse(null,{code:'PGRST301',message:'Invalid JWT'})),error=>error instanceof AccessError&&!(error instanceof ApprovalRequiredError))
})
