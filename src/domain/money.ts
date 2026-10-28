export function parseMoney(input:string):number {
  const clean=input.trim()
  if(!/^\d{1,10}(\.\d{1,2})?$/.test(clean)) throw new Error('Enter a positive amount with up to two decimal places.')
  const [whole,fraction='']=clean.split('.')
  const paise=Number(whole)*100+Number(fraction.padEnd(2,'0'))
  if(!Number.isSafeInteger(paise)||paise<=0||paise>1_000_000_000_000) throw new Error('Amount is outside the supported range.')
  return paise
}
export function formatMoney(paise:number):string {
  if(!Number.isSafeInteger(paise)) throw new Error('Money must be an exact integer number of paise.')
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:paise%100?2:0,maximumFractionDigits:2}).format(paise/100)
}
export function businessDate(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
  const value=(name:string)=>parts.find(p=>p.type===name)!.value
  return `${value('year')}-${value('month')}-${value('day')}`
}
