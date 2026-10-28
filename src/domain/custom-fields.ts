import type {AnyRecord,RecordKind} from './records.ts'

export type CustomField={label:string;value:string;type:'text'|'number'|'boolean'}
export const normalName=(name:string)=>name.trim().replace(/\s+/g,' ').toLocaleLowerCase('en-IN')
export function parseCustomFields(fields:CustomField[]) {
  const result:Record<string,string|number|boolean|null>={}
  const labels=new Set<string>()
  if(fields.length>30)throw new Error('Use up to 30 extra fields.')
  for(const field of fields) {
    const label=field.label.trim(),key=normalName(label)
    if(!label){if(field.value.trim())throw new Error('Give each extra detail a field name.');continue}
    if(label.length>80||labels.has(key))throw new Error('Use unique field names, up to 80 characters.')
    labels.add(key)
    if(field.type==='number'&&field.value.trim()) {
      if(!Number.isFinite(Number(field.value)))throw new Error(`${label}: enter a valid number.`)
      result[label]=Number(field.value)
    }else if(field.type==='boolean')result[label]=field.value==='true'
    else if(field.value.length>2000)throw new Error(`${label}: keep the value under 2,000 characters.`)
    else result[label]=field.value
  }
  return result
}
export function learnedFields(records:AnyRecord[],kind:RecordKind,context:string) {
  const frequency=new Map<string,{label:string;count:number;type:CustomField['type'];values:Map<string,number>}>()
  for(const record of records) {
    if(record.kind!==kind||record.version<1||['cancelled','inactive'].includes(record.state))continue
    const recordContext=record.kind==='expense'?record.data.category_id:record.kind==='work'?record.data.work_type:record.kind==='vehicle'?record.data.vehicle_type:''
    if(recordContext!==context)continue
    for(const [label,value]of Object.entries(record.data.extras??{})) {
      if(['litres','price per litre'].includes(normalName(label)))continue
      const key=normalName(label),item=frequency.get(key)??{label,count:0,type:typeof value==='number'?'number':typeof value==='boolean'?'boolean':'text',values:new Map<string,number>()}
      item.count++;const text=String(value??'');if(text)item.values.set(text,(item.values.get(text)??0)+1);frequency.set(key,item)
    }
  }
  return [...frequency.values()].filter(field=>field.count>=3).sort((a,b)=>b.count-a.count).slice(0,30).map(field=>({...field,values:[...field.values].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([value])=>value)}))
}
