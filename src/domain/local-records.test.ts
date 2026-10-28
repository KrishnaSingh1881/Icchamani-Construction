import {test} from 'node:test'
import assert from 'node:assert/strict'
import {localChoices,changedFields,repeatedWork} from './local-records.ts'
import {newOperation,type AnyRecord} from './records.ts'

test('offline choices preserve pending IDs without counting them as accepted records',()=>{
  const op=newOperation('client',{name:'New client'},'active')
  const choices=localChoices([],[{operation:op,status:'queued'}],'user')
  assert.equal(choices[0].id,op.record_id);assert.equal(choices[0].version,0)
  assert.equal(localChoices([],[{operation:op,status:'needs_review'}],'user').length,0)
  assert.deepEqual(changedFields({name:'Original',phone:''},{name:'Original',phone:'123'}),{phone:'123'})
  const work={kind:'work',data:{business_date:'2026-10-27',started_at:'2026-10-27T01:00:00Z',ended_at:'2026-10-27T02:00:00Z'}} as AnyRecord
  assert.deepEqual(repeatedWork(work,'2026-10-28'),{business_date:'2026-10-28',started_at:null,ended_at:null})
})
