import type {AnyRecord,WorkOrder,ClientPayment} from './records.ts'

export function accepted(records:AnyRecord[]) {return records.filter(r=>r.state!=='cancelled'&&r.version>0)}
export function summary(records:AnyRecord[],from='0000-01-01',to='9999-12-31') {
  let billed=0,received=0,expenses=0,cashOut=0
  for(const r of accepted(records)) {
    if(!('business_date' in r.data)||r.data.business_date<from||r.data.business_date>to) continue
    if(r.kind==='work'&&r.state==='completed') billed+=r.data.amount_paise??0
    if(r.kind==='payment') received+=r.data.amount_paise
    if(r.kind==='expense') {expenses+=r.data.amount_paise;if(r.data.payment_mode!=='Credit')cashOut+=r.data.amount_paise}
    if(r.kind==='driver_payment') {expenses+=r.data.amount_paise;cashOut+=r.data.amount_paise}
    if(r.kind==='expense_settlement') cashOut+=r.data.amount_paise
  }
  return {billed,received,expenses,cashOut,margin:billed-expenses,cashMovement:received-cashOut}
}
export function clientAccount(records:AnyRecord[],clientId:string,asOf='9999-12-31') {
  const rows=accepted(records)
  const work=rows.filter((r):r is WorkOrder=>r.kind==='work'&&r.state==='completed'&&r.data.client_id===clientId&&r.data.business_date<=asOf).sort((a,b)=>a.data.business_date.localeCompare(b.data.business_date)||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id))
  const payments=rows.filter((r):r is ClientPayment=>r.kind==='payment'&&r.data.client_id===clientId&&r.data.business_date<=asOf)
  const billed=work.reduce((sum,r)=>sum+(r.data.amount_paise??0),0)
  const received=payments.reduce((sum,r)=>sum+r.data.amount_paise,0)
  let available=received
  const unpaid=work.flatMap(r=>{const due=r.data.amount_paise??0;const applied=Math.min(available,due);available-=applied;return due>applied?[{recordId:r.id,date:r.data.business_date,vehicleId:r.data.vehicle_id,amountPaise:due-applied}]:[]})
  return {billed,received,pending:Math.max(0,billed-received),credit:Math.max(0,received-billed),oldestPendingDate:unpaid[0]?.date??null,unpaid}
}
