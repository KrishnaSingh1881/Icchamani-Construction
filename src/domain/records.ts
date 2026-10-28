import { z } from 'zod'

const id = z.uuid()
const text = z.string().trim().min(1).max(300)
const optionalText = z.string().trim().max(2000).default('')
const date = z.iso.date()
const amount = z.number().int().positive().max(1_000_000_000_000)
const optionalId = id.nullable().default(null)
const commonMoney = {business_date:date,amount_paise:amount,note:optionalText}
const extras = z.record(z.string().min(1).max(80),z.union([z.string().max(2000),z.number().finite(),z.boolean(),z.null()])).default({})
export const schemas = {
  vehicle: z.object({name:text,registration:text,vehicle_type:z.enum(['Hyva','JCB']),driver_id:optionalId,extras:extras.optional()}).strict(),
  client: z.object({name:text,phone:z.string().trim().max(40).default(''),extras:extras.optional()}).strict(),
  driver: z.object({name:text,phone:z.string().trim().max(40).default(''),extras:extras.optional()}).strict(),
  partner: z.object({name:text,extras:extras.optional()}).strict(),
  material: z.object({name:text,extras:extras.optional()}).strict(),
  route: z.object({name:text,pickup:text,destination:text,extras:extras.optional()}).strict(),
  site: z.object({name:text,client_id:optionalId,extras:extras.optional()}).strict(),
  expense_category: z.object({name:text,extras:extras.optional()}).strict(),
  field_template: z.object({category_id:id,fields:z.array(z.object({id:id,label:text,type:z.enum(['text','number','boolean'])}).strict()).max(30),extras:extras.optional()}).strict(),
  work: z.object({
    business_date:date,vehicle_id:id,client_id:id,driver_id:optionalId,work_type:z.enum(['Hyva','JCB']),
    material_id:optionalId,route_id:optionalId,site_id:optionalId,description:optionalText,
    quantity:z.number().positive().max(1_000_000).nullable().default(null),unit:z.enum(['trip','brass','ton','hours']).nullable().default(null),
    amount_paise:amount.nullable().default(null),started_at:z.iso.datetime({offset:true}).nullable().default(null),ended_at:z.iso.datetime({offset:true}).nullable().default(null),note:optionalText,
    extras:extras.optional(),
  }).strict(),
  expense: z.object({...commonMoney,vehicle_id:id,category_id:id,payment_mode:z.enum(['Cash','UPI','Credit']),counterparty:optionalText,extras}).strict(),
  payment: z.object({...commonMoney,client_id:id,payment_mode:z.enum(['Cash','UPI','Cheque']),extras:extras.optional()}).strict(),
  driver_payment: z.object({...commonMoney,driver_id:id,vehicle_id:id,payment_type:z.enum(['Salary','Advance','Trip payment','Other']),payment_mode:z.enum(['Cash','UPI']),extras:extras.optional()}).strict(),
  partner_entry: z.object({...commonMoney,partner_id:id,entry_type:z.enum(['Contribution','Withdrawal','Reimbursement','Profit distribution']),payment_mode:z.enum(['Cash','UPI']),expense_id:optionalId,extras:extras.optional()}).strict(),
  expense_settlement: z.object({...commonMoney,expense_id:id,payment_mode:z.enum(['Cash','UPI']),extras:extras.optional()}).strict(),
} as const
export type RecordKind = keyof typeof schemas
export type DataMap = {[K in RecordKind]: z.infer<(typeof schemas)[K]>}
export type RecordState = 'active' | 'in_progress' | 'completed' | 'inactive' | 'cancelled'
export type BusinessRecord<K extends RecordKind = RecordKind> = {
  id:string; kind:K; data:DataMap[K]; state:RecordState; version:number;
  created_by:string; updated_by:string; created_at:string; updated_at:string; change_seq:number
}
export type WorkOrder = BusinessRecord<'work'>
export type Expense = BusinessRecord<'expense'>
export type ClientPayment = BusinessRecord<'payment'>
export type DriverPayment = BusinessRecord<'driver_payment'>
export type PartnerEntry = BusinessRecord<'partner_entry'>
export type AnyRecord = {[K in RecordKind]: BusinessRecord<K>}[RecordKind]
export type Operation = {
  id:string; record_id:string; kind:RecordKind; action:'create'|'update'|'cancel'|'restore'; expected_version:number;
  data:Record<string,unknown>; state:RecordState; reason:string; client_time:string; confirm_separate?:boolean
}
export type Conflict = {id:string;record_id:string;proposed_record_id:string;kind:RecordKind;reason:string;participants:string[];proposed_data:Record<string,unknown>;proposed_state:RecordState;current_data:Record<string,unknown>;current_version:number;status:'open'|'resolved';created_at:string;resolved_at:string|null;resolution:string|null}
export type AuditEvent = {id:number;record_id:string|null;actor:string;action:string;before_data:unknown;after_data:unknown;reason:string;created_at:string;client_time?:string|null}
export type WriteResult = {status:'accepted';record:AnyRecord}|{status:'needs_review';conflict_id:string}|{status:'rejected';code:string;message:string}
export type Membership = {clerk_subject:string;display_name:string;role:'business_user'|'technical_admin';active:boolean;clerk_updated_at?:number;clerk_deleted?:boolean}

export function validateRecord(kind:RecordKind,data:unknown,state:RecordState) {
  const parsed=schemas[kind].parse(data)
  if (kind === 'work') {
    const work=parsed as DataMap['work']
    if (!['in_progress','completed','cancelled'].includes(state)) throw new Error('Work must be in progress, completed or cancelled.')
    if (work.work_type === 'Hyva' && (!work.route_id || !work.material_id || work.unit === 'hours')) throw new Error('Hyva work requires a route, material and carrying unit.')
    if (work.work_type === 'JCB' && (!work.site_id || work.unit !== 'hours')) throw new Error('JCB work requires a site and hours.')
    if (work.ended_at && (!work.started_at || work.ended_at <= work.started_at)) throw new Error('End time must follow start time.')
    if (state === 'completed' && (!work.amount_paise || !work.quantity)) throw new Error('Completed work requires quantity/hours and a manually entered amount.')
  } else if (['vehicle','client','driver','partner','material','route','site','expense_category','field_template'].includes(kind)) {
    if (!['active','inactive'].includes(state)) throw new Error('Saved information must be active or inactive.')
  } else if (!['active','cancelled'].includes(state)) throw new Error('Financial entries must be active or cancelled.')
  return parsed
}
export function newOperation(kind:RecordKind,data:Record<string,unknown>,state:RecordState):Operation {
  const parsed=validateRecord(kind,data,state)
  return {id:crypto.randomUUID(),record_id:crypto.randomUUID(),kind,action:'create',expected_version:0,data:parsed,state,reason:'',client_time:new Date().toISOString()}
}
