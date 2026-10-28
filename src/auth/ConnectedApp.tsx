import {ClerkProvider,SignIn,UserButton,useAuth} from '@clerk/react'
import {WorkspaceProvider} from '../data/WorkspaceProvider'
import {WorkspaceApp} from '../features/WorkspaceApp'
import type {PublicEnvironment} from '../config/environment'
import {Icon} from '../components/Icon'
import {useEffect,useRef,useState} from 'react'

function AuthenticatedWorkspace({config}:{config:PublicEnvironment}) {
  const {isLoaded,isSignedIn,userId}=useAuth()
  const [online,setOnline]=useState(navigator.onLine)
  const [cachedSubject,setCachedSubject]=useState(()=>{try{return localStorage.getItem('gh-last-subject')}catch{return null}})
  const wasSignedIn=useRef(false)
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
  useEffect(()=>{
    if(isLoaded&&isSignedIn&&userId){wasSignedIn.current=true;setCachedSubject(userId);try{localStorage.setItem('gh-last-subject',userId)}catch{}}
    else if(isLoaded&&!isSignedIn&&(online||wasSignedIn.current)) {
      wasSignedIn.current=false;setCachedSubject(null);try{localStorage.removeItem('gh-last-subject')}catch{}
      if('serviceWorker'in navigator)void navigator.serviceWorker.getRegistration().then(registration=>registration?.pushManager.getSubscription()).then(subscription=>subscription?.unsubscribe()).catch(()=>{})
    }
  },[isLoaded,isSignedIn,userId,online])
  if(!online&&!isSignedIn&&cachedSubject)return <WorkspaceProvider key={cachedSubject} config={config} offlineSubject={cachedSubject}><WorkspaceApp accountControl={<span className="offline-account">Offline</span>}/></WorkspaceProvider>
  if(!isLoaded)return <div className="connection-screen" role="status">Opening GaadiHisaab…</div>
  if(!isSignedIn)return <div className="sign-in-screen"><div className="setup-brand"><Icon name="route-linear" size={28}/>GaadiHisaab</div><SignIn routing="hash"/><p>Icchamani Construction · approved Google accounts only</p></div>
  return <WorkspaceProvider key={userId} config={config}><WorkspaceApp accountControl={<UserButton/>}/></WorkspaceProvider>
}
export default function ConnectedApp({config}:{config:PublicEnvironment}) {
  return <ClerkProvider publishableKey={config.clerkKey} afterSignOutUrl="/"><AuthenticatedWorkspace config={config}/></ClerkProvider>
}
