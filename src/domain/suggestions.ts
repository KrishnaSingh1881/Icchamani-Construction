import type {AnyRecord} from './records.ts'

export function suggestedExpenseFields(records:AnyRecord[],categoryId:string) {
  const frequency=new Map<string,{label:string;count:number;values:Map<string,number>}>()
  for(const record of records) {
    if(record.kind!=='expense'||record.state==='cancelled'||record.version<1||record.data.category_id!==categoryId)continue
    for(const [label,value] of Object.entries(record.data.extras)) {
      const key=label.trim().toLowerCase();const item=frequency.get(key)??{label,count:0,values:new Map<string,number>()}
      item.count++;const text=String(value??'');if(text)item.values.set(text,(item.values.get(text)??0)+1);frequency.set(key,item)
    }
  }
  return [...frequency.values()].filter(field=>field.count>=3).sort((a,b)=>b.count-a.count).slice(0,30).map(field=>({label:field.label,values:[...field.values].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([value])=>value)}))
}
