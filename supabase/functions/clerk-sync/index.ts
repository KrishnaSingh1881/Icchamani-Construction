import {verifyWebhook} from '@clerk/backend/webhooks'
import {createClient} from '@supabase/supabase-js'

Deno.serve(async request=>{
  if(request.method!=='POST')return new Response('Method not allowed',{status:405})
  const signingSecret=Deno.env.get('CLERK_WEBHOOK_SIGNING_SECRET')
  if(!signingSecret)return new Response('User sync is not configured',{status:503})
  let event
  try {event=await verifyWebhook(request,{signingSecret})}
  catch {return new Response('Invalid webhook signature',{status:400})}
  if(event.type!=='user.created'&&event.type!=='user.updated'&&event.type!=='user.deleted')return new Response('Ignored',{status:200})
  const data=event.data
  const name=event.type==='user.deleted'?'Deleted account':[event.data.first_name,event.data.last_name].filter(Boolean).join(' ').trim()||event.data.email_addresses.find(email=>email.id===event.data.primary_email_address_id)?.email_address||'New account'
  let email:string|null=null
  if(event.type!=='user.deleted')email=event.data.email_addresses.find(address=>address.id===event.data.primary_email_address_id)?.email_address??event.data.email_addresses.find(address=>address.verification?.status==='verified')?.email_address??event.data.email_addresses[0]?.email_address??null
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
  const {error}=await client.rpc('sync_clerk_member',{subject:data.id,display_name:name.slice(0,100),email,event_timestamp:event.timestamp,event_type:event.type})
  if(error)return new Response('User sync failed; delivery can be retried.',{status:500})
  return new Response('Synced',{status:200})
})
