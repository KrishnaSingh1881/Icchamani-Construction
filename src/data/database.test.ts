import 'fake-indexeddb/auto'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {WorkspaceDatabase} from './database.ts'

test('effect cleanup during opening allows the same account database to reopen without losing drafts',async()=>{
  const db=new WorkspaceDatabase(crypto.randomUUID())
  const opening=db.open().catch(()=>{})
  db.close({disableAutoOpen:false})
  await opening
  await db.open()
  await db.drafts.put({key:'entry',data:{notes:'Keep this draft'},updated_at:Date.now()})
  db.close({disableAutoOpen:false})
  assert.equal((await db.drafts.get('entry'))?.data.notes,'Keep this draft')
  await db.delete()
})
