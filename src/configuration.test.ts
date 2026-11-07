import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseConfiguration} from './configuration';
const settings={enabled:['Bieganie'],rates:{Bieganie:2.5,Rower:1,'Pływanie':10,Spacer:1,Inne:1},startDate:'2026-11-01',endDate:'2026-12-01'};
const backup={version:2,settings,profiles:[{id:'p',name:'A',personalKey:'synthetic-key'}],activities:[{id:'activity:1',profileId:'p',name:'Run',sport:'Bieganie',date:'2026-11-03',distance:0,seconds:100,source:'app'}]};
test('backup restores cached activities, identifiers, keys and challenge dates',()=>{
 const result=parseConfiguration(JSON.parse(JSON.stringify(backup)));
 assert.equal(result.activities?.[0].id,'activity:1');assert.equal(result.activities?.[0].distance,0);assert.equal(result.activities?.[0].source,'app');assert.equal(result.profiles[0].personalKey,'synthetic-key');assert.equal(result.settings.startDate,'2026-11-01');assert.equal(result.demo,false);
});
test('backup supports keyless hosted profiles and rejects invalid data',()=>{
 assert.equal(parseConfiguration({...backup,profiles:[{id:'p',name:'A'}]}).profiles.length,1);
 assert.throws(()=>parseConfiguration({...backup,activities:[{...backup.activities[0],profileId:'missing'}]}));
 assert.throws(()=>parseConfiguration({...backup,activities:[{...backup.activities[0],distance:-1}]}));
 assert.throws(()=>parseConfiguration({...backup,settings:{...settings,startDate:'2027-01-01'}}));
});
test('legacy config remains supported without replacing cached activities',()=>{
 const result=parseConfiguration({version:1,settings,profiles:[{id:'p',name:'A',apiKey:'a'.repeat(40)}]});assert.equal(result.activities,undefined);
});

test('bundled legacy demo remains importable',()=>{const demo=JSON.parse(readFileSync(new URL('../public/challenger-demo.json',import.meta.url),'utf8'));const result=parseConfiguration(demo);assert.equal(result.activities?.length,demo.activities.length);assert.ok(result.activities?.every(a=>a.source==='app'&&a.id));});

test('older backups retain their provider-prefixed personal key',()=>{
 const profile=parseConfiguration({...backup,profiles:[{id:'p',name:'A',legacyPersonalKey:'synthetic-key'}]}).profiles[0];
 assert.equal(profile.personalKey,'synthetic-key');
 assert.ok(!('legacyPersonalKey' in profile));
});
