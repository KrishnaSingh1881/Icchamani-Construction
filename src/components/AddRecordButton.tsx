import {canManageBusiness} from '../domain/permissions'
import {Button} from './ui/button'
import {Icon} from './Icon'
import {useWorkspace} from '../data/WorkspaceProvider'

export function AddRecordButton({label,onClick}:{label:string;onClick:()=>void}) {
  const {member}=useWorkspace()
  const canCreate=canManageBusiness(member)
  return <div className="record-create-action">
    <Button type="button" className="record-create-button" disabled={!canCreate} onClick={onClick} aria-describedby={!canCreate?'creation-permission-note':undefined}>
      <Icon name="add-linear" size={19}/>{label}
    </Button>
    {!canCreate&&<small id="creation-permission-note">Business access is not available for this account</small>}
  </div>
}
