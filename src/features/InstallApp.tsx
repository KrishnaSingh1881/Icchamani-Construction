import {useEffect,useState} from 'react'
import {Button} from '../components/ui/button'
import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from '../components/ui/accordion'

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}
export function InstallApp() {
  const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[help,setHelp]=useState(false)
  const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone)
  useEffect(()=>{
    const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)}
    const done=()=>{setInstalled(true);setPrompt(null)}
    window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',done)
    return()=>{window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',done)}
  },[])
  async function install(){if(!prompt){setHelp(value=>!value);return}await prompt.prompt();await prompt.userChoice;setPrompt(null)}
  return <section className="record-card install-card"><h2>Install app on your phone</h2><p>Open GaadiHisaab from your Home Screen for quicker access.</p>
    <Button type="button" variant="outline" disabled={installed} onClick={()=>void install()}>{installed?'App installed':'Install app'}</Button>
    {help&&<Accordion type="single" collapsible className="install-instructions" defaultValue={/iPhone|iPad|iPod/.test(navigator.userAgent)?'iPhone':'Android'}>{[['iPhone','Open in Safari, tap Share, then Add to Home Screen.'],['Android','Open in Chrome, tap the menu, then Install app or Add to Home screen.'],['Desktop','Use your browser’s install icon or app menu when available.']].map(([device,instructions])=><AccordionItem key={device} value={device}><AccordionTrigger>{device}</AccordionTrigger><AccordionContent>{instructions}</AccordionContent></AccordionItem>)}</Accordion>}
  </section>
}
