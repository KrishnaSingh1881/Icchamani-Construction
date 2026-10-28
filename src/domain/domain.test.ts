import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseMoney,formatMoney,businessDate} from './money.ts'
import {clientAccount,summary} from './accounting.ts'
import {validateRecord,type AnyRecord} from './records.ts'

const uuid='00000000-0000-4000-8000-000000000001'
function row(kind:string,data:unknown,state='active',version=1):AnyRecord {return {id:crypto.randomUUID(),kind,data,state,version,created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z',created_by:'a',updated_by:'a',change_seq:1} as AnyRecord}
test('paise are exact, malformed input is rejected, dates follow India',()=>{
  assert.equal(parseMoney('0.29'),29);assert.equal(parseMoney('4500.50'),450050)
  for(const value of ['','-1','1e3','1.001','NaN','Infinity','0','1,000'])assert.throws(()=>parseMoney(value))
  assert.equal(formatMoney(450050),'₹4,500.50')
  assert.equal(businessDate(new Date('2026-10-27T20:00:00Z')),'2026-10-28')
})
test('balances use accepted completed work, paise, credit and oldest-first attribution',()=>{
  const work=(date:string,amount:number)=>row('work',{client_id:uuid,business_date:date,amount_paise:amount,vehicle_id:uuid},'completed')
  const records=[work('2026-10-01',10000),work('2026-10-02',20000),row('payment',{client_id:uuid,business_date:'2026-10-03',amount_paise:15000}),row('work',{client_id:uuid,business_date:'2026-10-01',amount_paise:99999},'in_progress'),row('expense',{business_date:'2026-10-01',amount_paise:1000,payment_mode:'Credit'}),row('expense_settlement',{business_date:'2026-10-02',amount_paise:1000,payment_mode:'UPI'})]
  assert.deepEqual(summary(records),{billed:30000,received:15000,expenses:1000,cashOut:1000,margin:29000,cashMovement:14000})
  assert.equal(clientAccount(records,uuid).pending,15000)
  assert.equal(clientAccount(records,uuid).oldestPendingDate,'2026-10-02')
  assert.equal(clientAccount(records,uuid,'2026-10-01').pending,10000)
  records.push(row('payment',{client_id:uuid,business_date:'2026-10-04',amount_paise:20000}))
  assert.equal(clientAccount(records,uuid).credit,5000)
  records[0].state='cancelled';assert.equal(clientAccount(records,uuid).billed,20000)
  records.push({...work('2026-10-05',99999),version:0});assert.equal(summary(records).billed,20000)
})
test('work has different required fields and cannot complete with an unpriced amount',()=>{
  const base={business_date:'2026-10-28',vehicle_id:uuid,client_id:uuid,work_type:'Hyva',route_id:uuid,material_id:uuid,quantity:5,unit:'brass',amount_paise:450000}
  assert.ok(validateRecord('work',base,'completed'))
  assert.throws(()=>validateRecord('work',{...base,amount_paise:null},'completed'))
  assert.throws(()=>validateRecord('work',{...base,unit:'hours'},'completed'))
  assert.throws(()=>validateRecord('payment',{business_date:'2026-10-28',client_id:uuid,amount_paise:1.5,payment_mode:'Cash'},'active'))
  assert.throws(()=>validateRecord('client',{name:'Ramesh',role:'technical_admin'},'active'))
})
