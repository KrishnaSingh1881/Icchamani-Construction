import {accepted,clientAccount,summary} from './accounting.ts'
import {formatMoney} from './money.ts'
import type {AnyRecord} from './records.ts'

export type ReportType='client'|'vehicle'|'driver'|'expense'|'acknowledgement'
export type ReportData={title:string;period:string;summary:[string,string][];rows:{date:string;detail:string;amount:string}[];note:string}
export function buildReport(records:AnyRecord[],type:ReportType,subject:string,from:string,to:string):ReportData {
  if(from>to)throw new Error('The end date must follow the start date.')
  const name=(id:string|null)=>{const record=records.find(record=>record.id===id);return record&&'name'in record.data?record.data.name:'Unspecified'}
  const selected=accepted(records).filter(record=>'business_date'in record.data&&record.data.business_date>=from&&record.data.business_date<=to&&(
    type==='client'?(record.kind==='work'&&record.state==='completed'||record.kind==='payment')&&'client_id'in record.data&&record.data.client_id===subject:
    type==='vehicle'?'vehicle_id'in record.data&&record.data.vehicle_id===subject&&(record.kind!=='work'||record.state==='completed'):
    type==='driver'?record.kind==='driver_payment'&&record.data.driver_id===subject:
    type==='acknowledgement'?record.kind==='payment'&&record.id===subject:
    record.kind==='expense'||record.kind==='driver_payment'
  )).sort((a,b)=>('business_date'in a.data?a.data.business_date:'').localeCompare('business_date'in b.data?b.data.business_date:'')||a.created_at.localeCompare(b.created_at))
  const total=summary(selected)
  let totals:[string,string][]=[]
  if(type==='client') {
    const closing=clientAccount(records,subject,to)
    const earlier=accepted(records).filter(record=>'business_date'in record.data&&record.data.business_date<from)
    const opening=clientAccount(earlier,subject)
    totals=[['Opening balance',formatMoney(opening.pending-opening.credit)],['Work in period',formatMoney(total.billed)],['Received in period',formatMoney(total.received)],['Closing balance',formatMoney(closing.pending-closing.credit)]]
  }else if(type==='vehicle')totals=[['Completed work',formatMoney(total.billed)],['Expenses',formatMoney(total.expenses)],['Margin',formatMoney(total.margin)]]
  else if(type==='acknowledgement')totals=[['Received',formatMoney(total.received)]]
  else totals=[['Recorded payments / costs',formatMoney(selected.reduce((sum,record)=>sum+('amount_paise'in record.data?record.data.amount_paise??0:0),0))]]
  const title=type==='client'?`${name(subject)} - client statement`:type==='vehicle'?`${name(subject)} - vehicle report`:type==='driver'?`${name(subject)} - driver payments`:type==='acknowledgement'?'Payment acknowledgement':'Expense report'
  return {title,period:`${from} to ${to}`,summary:totals,rows:selected.map(record=>{
    const data=record.data
    const detail=record.kind==='work'?`${record.data.work_type} work | ${name(record.data.client_id)} | ${name(record.data.vehicle_id)} | ${record.data.quantity??''} ${record.data.unit??''}`:record.kind==='payment'?`Received from ${name(record.data.client_id)} | ${record.data.payment_mode}`:record.kind==='expense'?`${name(record.data.category_id)} | ${name(record.data.vehicle_id)} | ${record.data.payment_mode}${record.data.counterparty?` | ${record.data.counterparty}`:''}`:record.kind==='driver_payment'?`${name(record.data.driver_id)} | ${record.data.payment_type} | ${name(record.data.vehicle_id)}`:record.kind
    const amount='amount_paise'in data?data.amount_paise??0:0
    return {date:'business_date'in data?data.business_date:'',detail:`${detail}${'note'in data&&data.note?`\n${data.note}`:''}\nReference: ${record.id}`,amount:formatMoney(amount)+(record.kind==='payment'?' received':'')}
  }),note:type==='client'?'Negative balances are client credit. Cancelled and unconfirmed entries are excluded.':type==='driver'?'This is a record of manual payments, not an automatic salary calculation.':'Accepted records only. Cancelled and unconfirmed entries are excluded.'}
}
