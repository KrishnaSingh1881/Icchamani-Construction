import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
type Preference='system'|'light'|'dark'
const Appearance=createContext<{preference:Preference;setPreference:(value:Preference)=>void}|null>(null)
export function AppearanceProvider({children}:{children:ReactNode}) {
  const [preference,setPreference]=useState<Preference>(()=>{
    try {const value=localStorage.getItem('gh-app-theme');return value==='light'||value==='dark'?value:'system'}catch{return 'system'}
  })
  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)')
    const apply=()=>{document.documentElement.dataset.theme=preference==='system'?(media.matches?'dark':'light'):preference}
    apply();media.addEventListener('change',apply)
    try{localStorage.setItem('gh-app-theme',preference)}catch{/* Appearance remains usable for this visit. */}
    return()=>media.removeEventListener('change',apply)
  },[preference])
  return <Appearance.Provider value={{preference,setPreference}}>{children}</Appearance.Provider>
}
export function useAppearance(){const value=useContext(Appearance);if(!value)throw new Error('Appearance provider is missing.');return value}
