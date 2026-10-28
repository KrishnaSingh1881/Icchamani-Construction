import {parseMoney} from './money.ts'

export function fuelCost(litres:string,pricePerLitre:string):number|null {
  if(!/^\d{1,7}(\.\d{1,3})?$/.test(litres.trim()))return null
  try {
    const [whole,fraction='']=litres.trim().split('.')
    const thousandths=BigInt(whole)*1000n+BigInt(fraction.padEnd(3,'0'))
    const price=BigInt(parseMoney(pricePerLitre))
    const paise=(thousandths*price+500n)/1000n
    return thousandths>0n&&price>0n&&paise>0n&&paise<=1000000000000n?Number(paise):null
  }catch{return null}
}
