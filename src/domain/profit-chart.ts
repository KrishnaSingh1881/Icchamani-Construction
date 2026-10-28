import type {AnyRecord} from './records.ts'
import {summary} from './accounting.ts'

export function profitChart(records:AnyRecord[],today:string,period:'weekly'|'monthly') {
  const date=new Date(`${today}T00:00:00Z`)
  const iso=(day:Date)=>day.toISOString().slice(0,10)
  const offset=(day:Date,n:number)=>new Date(day.getTime()+n*86400000)
  const start=period==='weekly'?offset(date,-((date.getUTCDay()+6)%7)):new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1))
  const days=period==='weekly'?7:new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()
  const step=period==='weekly'?1:7
  const points=[]
  for(let n=0;n<days;n+=step) {
    const from=offset(start,n),to=offset(start,Math.min(n+step-1,days-1))
    const totals=summary(records,iso(from),iso(to)>today?today:iso(to))
    points.push({from:iso(from),to:iso(to),label:period==='weekly'?from.toLocaleDateString('en-IN',{weekday:'short',timeZone:'UTC'}):`${n+1}–${Math.min(n+step,days)}`,earnings:totals.billed,costs:totals.expenses})
  }
  return points
}
