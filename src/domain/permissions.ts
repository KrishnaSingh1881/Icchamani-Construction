import type {Membership} from './records.ts'

export function canManageBusiness(member:Membership|null|undefined):boolean {
  return !!member?.active&&(member.role==='business_user'||member.role==='technical_admin')
}
