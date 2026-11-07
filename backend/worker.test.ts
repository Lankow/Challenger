import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Worker is plain JavaScript for dashboard deployment.
import {handleRequest} from './worker.js';
const path='/personalapitoken-service/personal-api/personal-api-key/token';
const req=(p=path,method='POST',origin='https://lankow.github.io')=>new Request('https://relay.example'+p,{method,headers:{Origin:origin,Authorization:'ApiKey synthetic'}});
test('relay allows exact Pages origin and strips upstream cookies',async()=>{
 const r=await handleRequest(req(),async(url:string,opts:RequestInit)=>{assert.equal(url,'https://personal.connectapi.garmin.com'+path);assert.equal(new Headers(opts.headers).get('Origin'),null);assert.equal(new Headers(opts.headers).get('Cookie'),null);assert.equal(opts.redirect,'error');return new Response('token',{headers:{'Set-Cookie':'secret'}});});
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://lankow.github.io');assert.equal(r.headers.get('Set-Cookie'),null);assert.equal(await r.text(),'token');
});
test('relay rejects foreign origins, paths, methods and query injection without forwarding',async()=>{
 for(const r of [req(path,'POST','https://evil.example'),req('/other'),req(path,'GET'),req(path+'?secret=x'),req('/activitylist-service/activities/search/activities?url=https://evil.example','GET')]){
 const response=await handleRequest(r,()=>{throw new Error('must not call');});assert.ok(response.status>=400&&response.status<500);
 }
});
test('preflight supports authorization and errors never return upstream secrets',async()=>{
 const preflight=new Request('https://relay.example'+path,{method:'OPTIONS',headers:{Origin:'https://lankow.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization'}});
 assert.equal((await handleRequest(preflight)).status,204);
 const response=await handleRequest(req(),async()=>new Response('synthetic-secret',{status:401}));assert.equal(response.status,401);assert.ok(!(await response.text()).includes('synthetic-secret'));
});
