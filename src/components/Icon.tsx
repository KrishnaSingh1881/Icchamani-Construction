import { Icon as Iconify } from '@iconify/react'
import solar from '../lib/solar-icons.json'
export function Icon({ name, size = 22, className = '' }: { name: string; size?: number; className?: string }) {
  const icon = solar.icons[name as keyof typeof solar.icons]
  return icon ? <Iconify icon={{...icon, width:24, height:24}} width={size} height={size} className={className} aria-hidden="true" /> : null
}
