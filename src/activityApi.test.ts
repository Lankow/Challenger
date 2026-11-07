import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchActivities, mapActivity } from './activityApi';
const item = { activityId: 1, distance: 1250, startTimeLocal: '2026-11-06 08:00:00', activityType: {typeKey: 'lap_swimming'}, movingDuration: 1200 };
const jwt = () => `header.${Buffer.from(JSON.stringify({exp: Math.floor(Date.now()/1000)+86400})).toString('base64url')}.signature`;
const profile = (id: string) => ({id, name: 'A', color: '', personalKey: 'personal-key'});
const json = (value: unknown) => new Response(JSON.stringify(value));
test('maps the activity service measurements, sport subtypes and local date', () => {
 const a=mapActivity(item,'p');assert.equal(a.distance,1.25);assert.equal(a.sport,'Pływanie');assert.equal(a.date,'2026-11-06');assert.equal(a.id,'activity:1');
 for(const [key,sport] of [['trail_running','Bieganie'],['road_cycling','Rower'],['hiking','Spacer'],['strength_training','Inne']]) assert.equal(mapActivity({...item,activityType:{typeKey:key}},'p').sport,sport);
 assert.equal(mapActivity({...item,distance:null},'p').distance,0);
 assert.throws(()=>mapActivity({...item,distance:-1},'p'));
 assert.throws(()=>mapActivity({...item,startTimeLocal:'2026-02-30 08:00:00'},'p'));
});
test('exchanges personal key, paginates, deduplicates and excludes multisport parents',async()=>{
 let calls=0;const token=jwt();
 const request:typeof fetch=async(url,options)=>{
  const u=new URL(String(url));assert.equal(u.origin,'https://personal.connectapi.garmin.com');calls++;
  assert.equal(options?.credentials,'omit');assert.equal(options?.redirect,'error');
  if(calls===1){assert.equal(options?.method,'POST');assert.equal(new Headers(options?.headers).get('Authorization'),'ApiKey personal-key');return new Response(token);}
  assert.equal(new Headers(options?.headers).get('Authorization'),`Bearer ${token}`);
  assert.equal(u.searchParams.get('excludeChildren'),'false');
  assert.equal(u.searchParams.get('start'),calls===2?'0':'99');
  return json(calls===2?Array.from({length:99},(_,i)=>({...item,activityId:i+1,isParent:i===0})):[{...item,activityId:99},{...item,activityId:100}]);
 };
 const result=await fetchActivities(profile('pagination'),()=>{},request);assert.equal(calls,3);assert.equal(result.length,99);assert.ok(!result.some(a=>a.id==='activity:1'));
});
test('reuses token only for same profile key and replaces it when key changes',async()=>{
 let posts=0;const request:typeof fetch=async(_,options)=>{if(options?.method==='POST'){posts++;return new Response(jwt());}return json([]);};
 const p=profile('cache');await fetchActivities(p,()=>{},request);await fetchActivities(p,()=>{},request);assert.equal(posts,1);
 await fetchActivities({...p,personalKey:'replacement'},()=>{},request);assert.equal(posts,2);
});
test('missing personal key never falls back to old provider credentials',async()=>{
 let calls=0;await assert.rejects(fetchActivities({id:'legacy',name:'A',color:'',apiKey:'old-token'},()=>{},async()=>{calls++;return json([]);}),/Add a personal API key/);assert.equal(calls,0);
});
test('authentication errors never expose response body or credentials',async()=>{
 await assert.rejects(fetchActivities(profile('bad-key'),()=>{},async()=>new Response('personal-key',{status:401})),(error:Error)=>{assert.match(error.message,/rejected the personal key/);assert.ok(!error.message.includes('personal-key'));return true;});
 await assert.rejects(fetchActivities(profile('bad-token'),()=>{},async()=>new Response('private-response')),/invalid or expired access token/);
});
test('failure on a later page rejects the complete download',async()=>{
 let calls=0;await assert.rejects(fetchActivities(profile('rate'),()=>{},async()=>{calls++;return calls===1?new Response(jwt()):calls===2?json(Array.from({length:99},(_,i)=>({...item,activityId:i+1}))):new Response('',{status:429});}),/request limit/);
});
test('network failures explain CORS without leaking underlying errors',async()=>{
 await assert.rejects(fetchActivities(profile('network'),()=>{},async()=>{throw new Error('personal-key');}),/cross-origin access/);
});
test('repeated full pages fail instead of returning incomplete history',async()=>{
 let calls=0;await assert.rejects(fetchActivities(profile('repeat'),()=>{},async()=>++calls===1?new Response(jwt()):json(Array.from({length:99},(_,i)=>({...item,activityId:i+1})))),/repeated an activity page/);
});
