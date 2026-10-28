import assert from 'node:assert/strict'
import {test} from 'node:test'
import {subscribeDevice} from './push'

const publicKey=Buffer.from([4,...Array(64).fill(1)]).toString('base64url')
test('push registration preserves existing subscriptions on server errors and rolls back new ones',async()=>{
  for(const existing of [true,false]) {
    let unsubscribed=false,subscribed=false
    const subscription={toJSON:()=>({endpoint:'https://fcm.googleapis.com/test'}),unsubscribe:async()=>{unsubscribed=true;return true}}
    const registration={pushManager:{getSubscription:async()=>existing?subscription:null,subscribe:async(options:PushSubscriptionOptionsInit)=>{assert.equal(options.userVisibleOnly,true);assert.equal((options.applicationServerKey as Uint8Array).length,65);subscribed=true;return subscription}}} as unknown as ServiceWorkerRegistration
    await assert.rejects(subscribeDevice(registration,publicKey,async()=>{throw new Error('Save failed')}),/Save failed/)
    assert.equal(subscribed,!existing);assert.equal(unsubscribed,!existing)
    unsubscribed=false
    await subscribeDevice(registration,publicKey,async value=>{assert.equal(value.endpoint,subscription.toJSON().endpoint)})
    assert.equal(unsubscribed,false)
    await assert.rejects(subscribeDevice(registration,'bad',async()=>{}),/configuration/)
  }
})
