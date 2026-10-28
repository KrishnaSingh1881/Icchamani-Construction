import {execFileSync,spawn} from 'node:child_process'
import assert from 'node:assert/strict'

const container=process.argv[2]
if(!container?.startsWith('gaadihisaab-tests-'))throw new Error('An isolated test container is required.')
const args=['exec','-i',container,'psql','-U','postgres','-d','gaadihisaab_tests','-v','ON_ERROR_STOP=1','-tA']
const sql=text=>execFileSync('docker',[...args,'-c',text],{encoding:'utf8'}).trim()
function parallel(text) {
  return new Promise((resolve,reject)=>{
    const child=spawn('docker',[...args,'-c',text]);let out='',err=''
    child.stdout.on('data',data=>out+=data);child.stderr.on('data',data=>err+=data)
    child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(new Error(err)))
  })
}
sql(`insert into public.app_members(clerk_subject,display_name,role) values ('race-a','Race A','business_user'),('race-b','Race B','business_user')`)
const recordId=crypto.randomUUID()
const request={id:crypto.randomUUID(),record_id:recordId,kind:'driver',action:'create',expected_version:0,data:{name:'Concurrent driver',phone:'100'},state:'active',reason:'',client_time:new Date().toISOString()}
const transaction=(subject,operation)=>`begin; set local role authenticated; select set_config('request.jwt.claims','${JSON.stringify({sub:subject})}',true); select public.submit_operation('${JSON.stringify(operation)}'::jsonb); select pg_sleep(0.15); commit;`
await Promise.all([parallel(transaction('race-a',request)),parallel(transaction('race-a',request))])
assert.equal(sql(`select count(*) from public.business_records where id='${recordId}'`),'1')
assert.equal(sql(`select count(*) from public.audit_events where record_id='${recordId}'`),'1')
const edit=(phone)=>({...request,id:crypto.randomUUID(),action:'update',expected_version:1,data:{phone}})
const responses=await Promise.all([parallel(transaction('race-a',edit('200'))),parallel(transaction('race-b',edit('300')))])
assert.equal(responses.filter(r=>r.includes('needs_review')).length,1)
assert.equal(sql(`select version from public.business_records where id='${recordId}'`),'2')
assert.equal(sql(`select count(*) from public.review_conflicts where record_id='${recordId}' and status='open'`),'1')
console.log('Concurrent retries save once; competing simultaneous edits produce one accepted change and one review.')
