import {useEffect,useState} from 'react'
import {Button} from './ui/button'

export function PwaUpdate() {
  const [waiting,setWaiting]=useState<ServiceWorker|null>(null)
  const [error,setError]=useState('')
  useEffect(()=>{
    if(!import.meta.env.PROD||!('serviceWorker'in navigator))return
    let active=true
    void navigator.serviceWorker.register('/sw.js').then(registration=>{
      if(!active)return
      if(registration.waiting)setWaiting(registration.waiting)
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(active&&worker.state==='installed'&&navigator.serviceWorker.controller)setWaiting(worker)})})
    }).catch(()=>{if(active)setError('Offline installation did not finish. Reopen while connected to try again.')})
    return()=>{active=false}
  },[])
  function update() {
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true})
    waiting?.postMessage({type:'ACTIVATE_UPDATE'})
  }
  return waiting?<div className="pwa-banner" role="status"><span>An app update is ready. Finish your current entry before reloading.</span><Button onClick={update}>Reload</Button></div>:error?<p className="pwa-banner" role="status">{error}</p>:null
}
