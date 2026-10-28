import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {WorkspaceDatabase} from './database.ts'
import {SyncEngine} from './sync.ts'
import {AccessError,type SyncTransport} from './transport.ts'
import type {AnyRecord,Operation,Conflict} from '../domain/records.ts'

const operation=():Operation=>({id:crypto.randomUUID(),record_id:crypto.randomUUID(),kind:'client',action:'create',expected_version:0,data:{name:'Actual client'},state:'active',reason:'',client_time:new Date().toISOString()})
const record=(op:Operation,version=1):AnyRecord=>({id:op.record_id,kind:'client',data:{name:String(op.data.name),phone:''},state:'active',version,created_by:'user',updated_by:'user',created_at:op.client_time,updated_at:op.client_time,change_seq:version})
const emptyPull=async()=>({records:[],cursor:0,has_more:false})
test('draft removal and queue insertion are atomic, and a resolved review never replays its child over the decision',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID());const first=operation();const conflictId=crypto.randomUUID()
  await db.drafts.put({key:'draft',data:{name:'Draft'},updated_at:Date.now()});await db.queue(first,'draft')
  assert.equal(await db.drafts.get('draft'),undefined)
  const child={...operation(),record_id:first.record_id,action:'update' as const,data:{name:'Later local change'}}
  await db.queue(child)
  let submissions=0
  const transport:SyncTransport={pull:emptyPull,submit:async()=>{submissions++;return {status:'needs_review',conflict_id:conflictId}},reviews:async()=>[{id:conflictId,status:'resolved',resolution:'keep_current'} as Conflict]}
  const engine=new SyncEngine(db,transport);await engine.run();await engine.run()
  assert.equal(submissions,1);assert.equal((await db.outbox.get(first.id))?.status,'resolved');assert.equal((await db.outbox.get(child.id))?.status,'failed')
  assert.deepEqual((await db.outbox.get(child.id))?.operation.data,child.data)
  await db.delete()
})
test('a lost reply retains the submission ID, retries once and survives database reopening',async()=>{
  const subject=crypto.randomUUID();let db=new WorkspaceDatabase(subject)
  const op=operation();await db.queue(op);db.close();db=new WorkspaceDatabase(subject)
  const ids:string[]=[];let first=true
  const transport:SyncTransport={pull:emptyPull,submit:async(received)=>{ids.push(received.id);if(first){first=false;throw new Error('Reply lost')}return {status:'accepted',record:record(received)}}}
  await assert.rejects(new SyncEngine(db,transport).run())
  assert.equal((await db.outbox.get(op.id))?.status,'queued')
  await new SyncEngine(db,transport).run(true)
  assert.deepEqual(ids,[op.id,op.id]);assert.equal(await db.records.count(),1);assert.equal(await db.outbox.count(),0)
  await db.delete()
})
test('review and rejection never become accepted records and dependency waits',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID());const first=operation();await db.queue(first)
  const edit={...operation(),record_id:first.record_id,action:'update' as const,data:{name:'Corrected'}}
  await db.queue(edit)
  let calls=0
  await new SyncEngine(db,{pull:emptyPull,submit:async()=>{calls++;return {status:'needs_review',conflict_id:crypto.randomUUID()}}}).run()
  assert.equal(calls,1);assert.equal(await db.records.count(),0);assert.equal((await db.outbox.get(first.id))?.status,'needs_review')
  await db.delete()
})
test('revoked access pauses the queue without deleting it; databases are account scoped',async()=>{
  const a=new WorkspaceDatabase(crypto.randomUUID()),b=new WorkspaceDatabase(crypto.randomUUID())
  const op=operation();await a.queue(op)
  await assert.rejects(new SyncEngine(a,{pull:emptyPull,submit:async()=>{throw new AccessError('Access revoked')}}).run())
  assert.equal((await a.outbox.get(op.id))?.status,'waiting_auth');assert.equal(await b.outbox.count(),0)
  await a.delete();await b.delete()
})
test('dependent edits use their accepted parent version and duplicate queue IDs cannot mutate',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID());const first=operation();await db.queue(first)
  await assert.rejects(db.queue({...first,data:{name:'Different request'}}))
  await db.queue({...operation(),record_id:first.record_id,action:'update',data:{name:'Edited'}})
  const versions:number[]=[]
  await new SyncEngine(db,{pull:emptyPull,submit:async(op)=>{versions.push(op.expected_version);return {status:'accepted',record:record(op,op.action==='create'?1:2)}}}).run()
  assert.deepEqual(versions,[0,1]);assert.equal((await db.records.get(first.record_id))?.version,2)
  await db.storeRecords([record(first,1)],0);assert.equal((await db.records.get(first.record_id))?.version,2)
  await db.delete()
})
test('a new linked master record is sent before the entry that references it',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID())
  const client=operation();await db.queue(client)
  const payment={...operation(),kind:'payment' as const,data:{client_id:client.record_id,business_date:'2026-10-28',amount_paise:100,payment_mode:'Cash'}}
  await db.queue(payment)
  assert.deepEqual((await db.outbox.get(payment.id))?.dependencies,[client.id])
  const submitted:string[]=[]
  await new SyncEngine(db,{pull:emptyPull,submit:async(op)=>{submitted.push(op.record_id);return {status:'accepted',record:record(op)}}}).run()
  assert.deepEqual(submitted,[client.record_id,payment.record_id])
  await db.delete()
})
