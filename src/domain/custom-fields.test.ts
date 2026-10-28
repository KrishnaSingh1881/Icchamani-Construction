import {test} from 'node:test'
import assert from 'node:assert/strict'
import {learnedFields,parseCustomFields,normalName} from './custom-fields.ts'
import {auditChanges} from './provenance.ts'
import {fuelCost} from './fuel.ts'
import {validateRecord,type AnyRecord} from './records.ts'

test('custom fields retain types, reject duplicate names and sync through normal schemas',()=>{
  const fields=parseCustomFields([{label:'Meter reading',type:'number',value:'1234.5'},{label:'Receipt checked',type:'boolean',value:'true'}])
  assert.deepEqual(fields,{'Meter reading':1234.5,'Receipt checked':true})
  assert.deepEqual(validateRecord('client',{name:'Ramesh',extras:fields},'active').extras,fields)
  assert.throws(()=>parseCustomFields([{label:'Tank size',type:'text',value:'a'},{label:' tank   size ',type:'text',value:'b'}]))
  assert.throws(()=>parseCustomFields([{label:'Reading',type:'number',value:'oops'}]))
  assert.equal(normalName('  RAMESH   Patil '),'ramesh patil')
})
test('adaptive fields need three accepted records in the same work context and do not suggest pump fields',()=>{
  const row=(work_type:string,version=1,state='completed')=>({kind:'work',version,state,data:{work_type,extras:{Depth:4}}}) as unknown as AnyRecord
  assert.equal(learnedFields([row('JCB'),row('JCB'),row('Hyva')],'work','JCB').length,0)
  const result=learnedFields([row('JCB'),row('JCB'),row('JCB'),row('JCB',0),row('JCB',1,'cancelled')],'work','JCB')
  assert.equal(result[0].count,3)
  assert.deepEqual(result[0].values,['4'])
  assert.equal(result[0].type,'number')
})
test('fuel arithmetic rounds exact paise and preserves invalid or absent input as no estimate',()=>{
  assert.equal(fuelCost('10','95.50'),95500)
  assert.equal(fuelCost('12.345','95.50'),117895)
  assert.equal(fuelCost('0','95'),null)
  assert.equal(fuelCost('','95'),null)
  assert.equal(fuelCost('12','bad'),null)
})
test('audit presentation compares changed fields including extras without exposing record bookkeeping',()=>{
  const changes=auditChanges({before_data:{version:1,data:{amount_paise:400000,extras:{Litres:10}},state:'active'},after_data:{version:2,data:{amount_paise:450000,extras:{Litres:12}},state:'active'}})
  assert.deepEqual(changes,[{key:'amount_paise',before:400000,after:450000},{key:'extras.Litres',before:10,after:12}])
})
