import {useEffect,useRef,useState,type ReactNode} from 'react'
import {NavLink,Route,Routes,Navigate,useLocation} from 'react-router'
import {useWorkspace} from '../data/WorkspaceProvider'
import {Icon} from '../components/Icon'
import {useAppearance} from '../components/AppearanceProvider'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '../components/ui/dialog'
import {Badge} from '../components/ui/badge'
import {ToggleGroup,ToggleGroupItem} from '../components/ui/toggle-group'
import AnimatedContent from '../components/AnimatedContent'
import {RecordEditor,kindLabels} from './RecordEditor'
import {Home} from './Home'
import {Ledgers} from './Ledgers'
import {InstallApp} from './InstallApp'
import {Button} from '../components/ui/button'
import gsap from 'gsap'
import {useGSAP} from '@gsap/react'
import {PushSettings} from './PushSettings'
import {ClientsPage} from './ClientsPage'
import {Reports} from './Reports'
import {Admin} from './Admin'
import {RecordsPage} from './RecordsPage'
import {History,Notifications,Reviews,SyncCenter} from './Activity'
import {repeatedWork} from '../domain/local-records'
import {businessDate} from '../domain/money'
import type {AnyRecord,RecordKind} from '../domain/records'

gsap.registerPlugin(useGSAP)
const navigation=[{path:'/',name:'Home',icon:'home-2-linear'},{path:'/work',name:'Work',icon:'bill-list-linear'},{path:'/clients',name:'Clients',icon:'users-group-rounded-linear'},{path:'/ledgers',name:'Ledgers',icon:'notebook-linear'},{path:'/more',name:'More',icon:'widget-2-linear'}]
export function WorkspaceApp({accountControl}:{accountControl:ReactNode}) {
  const {member,sync,syncing,syncError}=useWorkspace()
  const [editor,setEditor]=useState<{kind:RecordKind;record?:AnyRecord;initialData?:Record<string,unknown>}|null>(null)
  const location=useLocation()
  const frame=useRef<HTMLDivElement>(null)
  const [online,setOnline]=useState(navigator.onLine)
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
  const previousPath=useRef(location.pathname)
  const previousDock=useRef<number|null>(null)
  useGSAP(()=>{
    const media=gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      const oldIndex=navigation.findIndex(item=>item.path===previousPath.current)
      const newIndex=navigation.findIndex(item=>item.path===location.pathname)
      const direction=newIndex>=oldIndex?1:-1
      gsap.fromTo('.production-content',{x:direction*12,opacity:.65},{x:0,opacity:1,duration:.32,ease:'power3.out',clearProps:'transform,opacity'})
      const dock=frame.current?.querySelector('.production-dock')
      const active=dock?.querySelector<HTMLElement>('a.active')
      if(active){
        gsap.fromTo('.production-dock-indicator',{x:previousDock.current??active.offsetLeft},{x:active.offsetLeft,width:active.offsetWidth,duration:.38,ease:'power3.out'})
        previousDock.current=active.offsetLeft
      }
    })
    previousPath.current=location.pathname
    return()=>media.revert()
  },{scope:frame,dependencies:[location.pathname],revertOnUpdate:true})
  useEffect(()=>{document.querySelector('.production-content')?.scrollTo({top:0})},[location.pathname])
  const add=(kind:RecordKind,initialData?:Record<string,unknown>)=>setEditor({kind,initialData})
  const repeat=(record:AnyRecord)=>setEditor({kind:record.kind,initialData:repeatedWork(record,businessDate())})
  return <div className="production-frame" ref={frame}><div className="production-app"><header className="app-header"><NavLink to="/" className="app-brand"><Icon name="route-linear" size={25}/><span>GaadiHisaab<small>Icchamani Construction</small></span></NavLink><div className="header-actions"><button className="icon-button" aria-label="Synchronise workspace" onClick={()=>void sync()} disabled={syncing}><Icon name="restart-linear" size={20}/></button><div className={`account-presence ${online?'is-online':'is-offline'}`} title={online?'Online':'Offline'}><span className="sr-only" role="status">{online?'Online':'Offline'}</span>{accountControl}<Badge className="presence-badge" aria-hidden="true"/></div></div></header>{syncError&&<p className="sync-error" role="alert">{syncError} Your local entries are preserved.</p>}<main className="production-content"><Routes>
    <Route path="/" element={<Home add={add} edit={record=>setEditor({kind:record.kind,record})}/>}/>
    <Route path="/work" element={<RecordsPage key="work" title="A day’s work." kinds={['work','expense','payment','expense_settlement']} add={add} repeat={repeat} edit={record=>setEditor({kind:record.kind,record})}/>}/>
    <Route path="/clients" element={<ClientsPage add={add}/>}/>
    <Route path="/ledgers" element={<Ledgers add={add} edit={record=>setEditor({kind:record.kind,record})}/>}/>
    <Route path="/more" element={<More add={add}/>}/>
    <Route path="/reports" element={<Reports/>}/><Route path="/reviews" element={<Reviews/>}/><Route path="/notifications" element={<Notifications/>}/><Route path="/sync" element={<SyncCenter/>}/><Route path="/activity" element={<History/>}/>
    <Route path="/admin" element={member.role==='technical_admin'?<Admin/>:<Navigate to="/" replace/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></main><nav className="floating-dock production-dock" aria-label="Main navigation"><div className="production-dock-indicator" aria-hidden="true"/>{navigation.map(n=><NavLink to={n.path} end={n.path==='/'} key={n.path} aria-label={n.name}><Icon name={n.icon} size={23}/><span>{n.name}</span></NavLink>)}</nav><Dialog open={!!editor} onOpenChange={open=>{if(!open)setEditor(null)}}><DialogContent className="app-dialog"><DialogHeader><DialogTitle>{editor?.record?'Edit':'Add'} {editor?kindLabels[editor.kind]:''}</DialogTitle><DialogDescription>Real business records. Amounts remain in your control.</DialogDescription></DialogHeader>{editor&&<RecordEditor key={`${editor.kind}-${editor.record?.id??'new'}`} kind={editor.kind} record={editor.record} initialData={editor.initialData} onClose={()=>setEditor(null)}/>}</DialogContent></Dialog></div></div>
}

function More({add}:{add:(kind:RecordKind)=>void}) {
  const {member,queue}=useWorkspace();const {preference:theme,setPreference}=useAppearance()
  const setTheme=(value:string)=>{if(value==='light'||value==='dark'||value==='system')setPreference(value)}
  return <>
    <div className="page-heading"><h1>Make it <strong>yours.</strong></h1><p>{member.display_name}{member.email&&<> · {member.email}</>} · {member.role.replaceAll('_',' ')}</p></div>
    <AnimatedContent className="settings-list" trigger="mount" distance={10} duration={.38} stagger={.035} initialOpacity={.6}>
      {[{path:'/reports',name:'Reports and acknowledgements'},{path:'/notifications',name:'Notifications'},{path:'/reviews',name:'Entry reviews'},{path:'/sync',name:'Sync and saved entries'},{path:'/activity',name:'Shared activity history'}].map(item=><NavLink className="settings-link" key={item.path} to={item.path}>{item.name}<Icon name="alt-arrow-right-linear" size={18}/></NavLink>)}
    </AnimatedContent>
    <div className="appearance-card"><span>Appearance</span><ToggleGroup type="single" value={theme} onValueChange={setTheme} className="appearance-toggle" aria-label="Appearance">
      <ToggleGroupItem value="light" aria-label="Light appearance">Light</ToggleGroupItem><ToggleGroupItem value="dark" aria-label="Dark appearance">Dark</ToggleGroupItem><ToggleGroupItem value="system" aria-label="System appearance">System</ToggleGroupItem>
    </ToggleGroup></div>
    <div className="vehicle-settings"><div><h2>Vehicles</h2><p>Add vehicles here. Their work and costs appear in Ledgers.</p></div><Button type="button" variant="outline" onClick={()=>add('vehicle')}>Add vehicle</Button></div>
    {member.role==='technical_admin'&&<NavLink className="setup-mockup-link" to="/admin">Technical administration<Icon name="arrow-right-linear" size={18}/></NavLink>}
    <div className="more-notifications"><PushSettings/></div>
    <InstallApp/>
    <p className="panel-note">{queue.length} local changes awaiting confirmation or review. Clearing this browser’s data can lose changes that have not reached the server.</p>
  </>
}
