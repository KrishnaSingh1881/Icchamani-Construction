import {createClient} from '@supabase/supabase-js'
// @deno-types="npm:@types/web-push@3.6.4"
import webpush from 'web-push'
import {timingSafeEqual} from 'node:crypto'
import {Buffer} from 'node:buffer'

type Device={id:string;subscription:{endpoint:string;keys:{p256dh:string;auth:string}}}
type Job={id:string;lease:string;event_type:string;conflict_id:string|null;devices:Device[]}
const allowedHosts=new Set(['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'])

Deno.serve(async request=>{
  if(request.method!=='POST')return new Response('Method not allowed',{status:405})
  const secret=Deno.env.get('PUSH_DISPATCH_SECRET')??''
  const supplied=request.headers.get('authorization')??''
  const expected=`Bearer ${secret}`
  if(secret.length<32||supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return new Response('Forbidden',{status:403})
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY'),subject=Deno.env.get('VAPID_SUBJECT')
  if(!url||!key||!publicKey||!privateKey||!subject)return new Response('Push is not configured',{status:503})
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  try {
    const {data,error}=await client.rpc('claim_push_batch',{batch_size:10})
    if(error)throw error
    const jobs=data as Job[]
    await Promise.all(jobs.map(job=>Promise.all(job.devices.map(async device=>{
      let result='failed'
      try {
        const endpoint=new URL(device.subscription.endpoint)
        if(endpoint.protocol!=='https:'||!allowedHosts.has(endpoint.hostname)||endpoint.port)result='expired'
        else {
          const body=job.conflict_id?'An entry review has an update.':job.event_type==='work_in_progress'?'A vehicle started work.':job.event_type==='work_completed'?'Work was completed.':'Your workspace has an update.'
          await webpush.sendNotification(device.subscription,JSON.stringify({id:job.id,body,path:job.conflict_id?'/reviews':'/notifications'}),{vapidDetails:{subject,publicKey,privateKey},TTL:3600,urgency:'normal',timeout:10000})
          result='sent'
        }
      }catch(error){const status=(error as {statusCode?:number}).statusCode;if(status===404||status===410)result='expired'}
      const {error}=await client.rpc('finish_push_delivery',{notification_id:job.id,subscription_id:device.id,lease:job.lease,result})
      if(error)throw error
    }))))
    return Response.json({processed:jobs.length})
  }catch{return new Response('Push batch did not finish. Failed jobs remain retryable.',{status:500})}
})
