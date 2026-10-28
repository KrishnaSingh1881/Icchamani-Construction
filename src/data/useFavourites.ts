import {useLiveQuery} from 'dexie-react-hooks'
import {useWorkspace} from './WorkspaceProvider'

export function useFavourites() {
  const {db}=useWorkspace()
  const cached=useLiveQuery(()=>db.metadata.get('favourites'),[db])
  const favourites=new Set(Array.isArray(cached?.value)?cached.value as string[]:[])
  async function toggle(id:string) {
    await db.transaction('rw',db.metadata,async()=>{
      const current=(await db.metadata.get('favourites'))?.value
      const ids=new Set(Array.isArray(current)?current as string[]:[])
      if(ids.has(id))ids.delete(id);else ids.add(id)
      await db.metadata.put({key:'favourites',value:[...ids]})
    })
  }
  return {favourites,toggle}
}
