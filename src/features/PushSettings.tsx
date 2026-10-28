import {useEffect,useState} from 'react'
import {useWorkspace} from '../data/WorkspaceProvider'
import {Button} from '../components/ui/button'

export function PushSettings() {
  const {client}=useWorkspace();const [enabled,setEnabled]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  const key=String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY??'').trim()
  const supported=typeof Notification!=='undefined'&&'serviceWorker'in navigator&&'PushManager'in window
  useEffect(()=>{if(!supported)return;void navigator.serviceWorker.getRegistration().then(registration=>registration?.pushManager.getSubscription()).then(subscription=>setEnabled(!!subscription)).catch(()=>{})},[supported])
  async function enable() {
    setBusy(true);setMessage('')
    try {
      if(!navigator.onLine)throw new Error('Connect to enable notifications.')
      if(!key)throw new Error('Push delivery will be available after the server is connected.')
      const permission=await Notification.requestPermission()
      if(permission!=='granted')throw new Error('Notifications are not allowed. You can change this in iPhone Settings.')
      const registration=await navigator.serviceWorker.getRegistration()
      if(!registration?.active)throw new Error('Install and open the built app, then try again.')
      const encoded=key.replaceAll('-','+').replaceAll('_','/');const decoded=atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'='))
      const applicationServerKey=Uint8Array.from(decoded,char=>char.charCodeAt(0))
      if(applicationServerKey.length!==65)throw new Error('The public push key needs to be configured correctly.')
      const subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey})
      const {error}=await client.rpc('save_push_subscription',{subscription:subscription.toJSON()})
      if(error){await subscription.unsubscribe();throw new Error(error.message)}
      setEnabled(true);setMessage('This device is subscribed. Delivery still requires the server dispatcher to be running.')
    }catch(error){setMessage(error instanceof Error?error.message:'Could not enable notifications.')}finally{setBusy(false)}
  }
  async function disable() {
    setBusy(true);setMessage('')
    try {
      const registration=await navigator.serviceWorker.getRegistration();const subscription=await registration?.pushManager.getSubscription()
      if(subscription){await subscription.unsubscribe();if(navigator.onLine){const {error}=await client.rpc('remove_push_subscription',{endpoint:subscription.endpoint});if(error)throw new Error('Device notifications are off. The server subscription will be cleaned up later.')}}
      setEnabled(false)
    }catch(error){setMessage(error instanceof Error?error.message:'Could not disable notifications.')}finally{setBusy(false)}
  }
  return <section className="record-card"><h2>Push notifications</h2><p className="panel-note">Add GaadiHisaab to your Home Screen from Safari’s Share menu, then open the installed app to enable notifications.</p><Button variant="outline" disabled={busy||!supported||(!enabled&&!key)} onClick={()=>void(enabled?disable():enable())}>{busy?'Updating…':enabled?'Turn off notifications':'Enable notifications'}</Button>{!key&&<p className="panel-note">Push server configuration is pending.</p>}{!supported&&<p className="panel-note">Notifications are unavailable in this browser context. Use the installed app on your iPhone.</p>}{message&&<p className="panel-note" role="status">{message}</p>}</section>
}
