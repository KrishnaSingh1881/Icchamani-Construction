export async function subscribeDevice(registration:ServiceWorkerRegistration,publicKey:string,save:(subscription:PushSubscriptionJSON)=>Promise<void>) {
  const encoded=publicKey.replaceAll('-','+').replaceAll('_','/')
  const decoded=atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'='))
  const applicationServerKey=Uint8Array.from(decoded,char=>char.charCodeAt(0))
  if(applicationServerKey.length!==65||applicationServerKey[0]!==4)throw new Error('The notification configuration needs attention. Contact your administrator.')
  let subscription=await registration.pushManager.getSubscription()
  const existing=!!subscription
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey})
  try {await save(subscription.toJSON())}
  catch(error){if(!existing)await subscription.unsubscribe().catch(()=>{});throw error}
}
