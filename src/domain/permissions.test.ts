import {test} from 'node:test'
import assert from 'node:assert/strict'
import {canManageBusiness} from './permissions.ts'
import type {Membership} from './records.ts'

test('active admins and business users can manage business data; revoked or missing accounts cannot',()=>{
  const member:Membership={clerk_subject:'user',display_name:'User',role:'technical_admin',active:true}
  assert.equal(canManageBusiness(member),true)
  assert.equal(canManageBusiness({...member,role:'business_user'}),true)
  assert.equal(canManageBusiness({...member,active:false}),false)
  assert.equal(canManageBusiness({...member,role:'business_user',active:false}),false)
  assert.equal(canManageBusiness(null),false)
})
