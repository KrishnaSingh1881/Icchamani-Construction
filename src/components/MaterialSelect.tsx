import {useRef} from 'react'
import gsap from 'gsap'
import {useGSAP} from '@gsap/react'
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './ui/select'
import {materials} from '../domain/materials'

gsap.registerPlugin(useGSAP)

function MaterialOptions() {
  const container=useRef<HTMLDivElement>(null)
  useGSAP(()=>{
    const media=gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.fromTo(container.current,{y:-6,opacity:.6},{y:0,opacity:1,duration:.22,ease:'power3.out',clearProps:'transform,opacity'})
      gsap.fromTo('[data-slot="select-item"]',{x:-5},{x:0,duration:.2,stagger:.012,ease:'power2.out',clearProps:'transform'})
    })
    return()=>media.revert()
  },{scope:container})
  return <div ref={container}>{materials.map(material=><SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>)}</div>
}

export function MaterialSelect({value,onChange,required}:{value:string;onChange:(value:string)=>void;required?:boolean}) {
  return <Select value={value} onValueChange={onChange} required={required} name="material_id">
    <SelectTrigger className="material-select-trigger" aria-label="Material carried"><SelectValue placeholder="Choose material"/></SelectTrigger>
    <SelectContent className="material-select-content" position="popper" sideOffset={6}><MaterialOptions/></SelectContent>
  </Select>
}
