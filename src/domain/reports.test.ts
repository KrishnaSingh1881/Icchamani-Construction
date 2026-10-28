import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildReport} from './reports.ts'
import {suggestedExpenseFields} from './suggestions.ts'
import type {AnyRecord} from './records.ts'

const row=(kind:string,data:Record<string,unknown>,state='active'):AnyRecord=>({id:crypto.randomUUID(),kind,data,state,version:1,created_by:'user',updated_by:'user',created_at:'2026-10-28T00:00:00Z',updated_at:'2026-10-28T00:00:00Z',change_seq:1}) as AnyRecord
test('client statements preserve opening credit, exclude cancelled/unconfirmed rows and keep acknowledgements separate',()=>{
  const records=[row('client',{name:'Client'}),row('payment',{client_id:'client',business_date:'2026-09-30',amount_paise:50000,payment_mode:'Cash',note:''}),row('work',{client_id:'client',vehicle_id:'vehicle',business_date:'2026-10-01',work_type:'Hyva',quantity:1,unit:'trip',amount_paise:80000,note:''},'completed'),row('payment',{client_id:'client',business_date:'2026-10-02',amount_paise:10000,payment_mode:'UPI',note:''}),row('payment',{client_id:'client',business_date:'2026-10-02',amount_paise:99999,payment_mode:'Cash'},'cancelled')]
  records[0].id='client'
  const report=buildReport(records,'client','client','2026-10-01','2026-10-28')
  assert.equal(report.rows.length,2);assert.equal(report.summary[0][1],'-₹500');assert.equal(report.summary[3][1],'₹200')
  assert.equal(buildReport(records,'acknowledgement',records[3].id,'2026-10-01','2026-10-28').rows.length,1)
  assert.throws(()=>buildReport(records,'expense','','2026-10-28','2026-10-01'))
})
test('expense fields adapt only from repeated accepted entries in the same category',()=>{
  const records=[1,2,3].map(()=>row('expense',{category_id:'fuel',extras:{Litres:'20'}}))
  assert.equal(suggestedExpenseFields(records.slice(0,2),'fuel').length,0)
  assert.deepEqual(suggestedExpenseFields(records,'fuel'),[{label:'Litres',values:['20']}])
  assert.equal(suggestedExpenseFields(records,'repairs').length,0)
  records[2].state='cancelled';assert.equal(suggestedExpenseFields(records,'fuel').length,0)
})
