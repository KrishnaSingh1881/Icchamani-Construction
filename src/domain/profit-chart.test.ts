import {test} from 'node:test'
import assert from 'node:assert/strict'
import {profitChart} from './profit-chart.ts'
import type {AnyRecord} from './records.ts'

test('profit chart covers calendar boundaries and counts costs once, excluding pending and cancelled rows',()=>{
  const row=(kind:string,date:string,amount:number,extra={})=>({id:crypto.randomUUID(),kind,version:1,state:kind==='work'?'completed':'active',data:{business_date:date,amount_paise:amount,payment_mode:'Credit'},...extra}) as AnyRecord
  const records=[row('work','2026-10-26',10000),row('expense','2026-10-26',3000),row('driver_payment','2026-10-26',1000),row('expense_settlement','2026-10-26',3000),row('work','2026-10-26',90000,{version:0}),row('expense','2026-10-26',90000,{state:'cancelled'}),row('work','2026-10-30',50000)]
  const weekly=profitChart(records,'2026-10-28','weekly')
  assert.equal(weekly.length,7)
  assert.equal(weekly[0].from,'2026-10-26')
  assert.equal(weekly[0].earnings,10000)
  assert.equal(weekly[0].costs,4000)
  assert.equal(weekly[4].earnings,0)
  const monthly=profitChart(records,'2026-10-28','monthly')
  assert.equal(monthly.length,5)
  assert.equal(monthly[4].to,'2026-10-31')
  assert.equal(monthly.reduce((sum,p)=>sum+p.earnings,0),10000)
  assert.equal(profitChart([],'2028-02-29','monthly').at(-1)?.to,'2028-02-29')
})
