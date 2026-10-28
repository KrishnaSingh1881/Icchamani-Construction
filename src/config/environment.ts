export type PublicEnvironment = {
  clerkKey: string
  supabaseUrl: string
  supabaseKey: string
  mode: 'development' | 'test' | 'production'
}
export function readEnvironment(source: Record<string, unknown>): { config: PublicEnvironment | null; issues: string[] } {
  const value = (name: string) => typeof source[name] === 'string' ? (source[name] as string).trim() : ''
  const clerkKey = value('VITE_CLERK_PUBLISHABLE_KEY')
  const supabaseUrl = value('VITE_SUPABASE_URL')
  const supabaseKey = value('VITE_SUPABASE_PUBLISHABLE_KEY')
  const mode = value('VITE_APP_ENV') || 'development'
  const issues: string[] = []
  if (!/^pk_(test|live)_[A-Za-z0-9_-]+$/.test(clerkKey)) issues.push('VITE_CLERK_PUBLISHABLE_KEY must be a Clerk public key.')
  try { const url = new URL(supabaseUrl); if (url.protocol !== 'https:' && !(mode !== 'production' && ['localhost','127.0.0.1'].includes(url.hostname))) throw new Error() } catch { issues.push('VITE_SUPABASE_URL must be a valid HTTPS project URL.') }
  if (!supabaseKey) issues.push('VITE_SUPABASE_PUBLISHABLE_KEY is missing.')
  if (supabaseKey.startsWith('sb_secret_')) issues.push('A Supabase secret key cannot be used in the browser.')
  if (supabaseKey.startsWith('eyJ')) {
    try { const payload = JSON.parse(atob(supabaseKey.split('.')[1].replaceAll('-','+').replaceAll('_','/'))); if (payload.role !== 'anon') issues.push('Only an anon/public Supabase key is allowed in the browser.') } catch { issues.push('The legacy Supabase public key is invalid.') }
  } else if (supabaseKey && !supabaseKey.startsWith('sb_publishable_') && !supabaseKey.startsWith('sb_secret_')) issues.push('Use a Supabase publishable key or legacy anon key.')
  if (!['development','test','production'].includes(mode)) issues.push('VITE_APP_ENV must be development, test or production.')
  if (mode === 'production' && !clerkKey.startsWith('pk_live_')) issues.push('Production requires Clerk production keys and the configured production domain.')
  return { config: issues.length ? null : {clerkKey,supabaseUrl,supabaseKey,mode: mode as PublicEnvironment['mode']}, issues }
}
