import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readEnvironment} from './environment.ts'

const valid = {VITE_CLERK_PUBLISHABLE_KEY:'pk_test_example',VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'}
test('configuration fails closed without disclosing credential values',()=>{
  assert.equal(readEnvironment(valid).issues.length,0)
  assert.equal(readEnvironment({}).config,null)
  assert.equal(readEnvironment({...valid,VITE_APP_ENV:'production'}).config,null)
  const secret='sb_secret_do_not_print'
  const result=readEnvironment({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:secret})
  assert.equal(result.config,null)
  assert.ok(!result.issues.join().includes(secret))
  const elevated='eyJ.'+btoa(JSON.stringify({role:'service_role'}))+'.signature'
  assert.equal(readEnvironment({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:elevated}).config,null)
})
