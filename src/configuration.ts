import { sports, validateActivity, validateChallengeDates, type Activity, type Profile } from './domain';
import type { Settings } from './storage';
export const plausibleGarminKey=(s:string)=>s.trim().length>0&&s.trim().length<=4096&&!/\s/.test(s.trim());
export const plausibleToken=(s:string)=>/^[a-fA-F0-9]{40}$/.test(s.trim());
export function parseConfiguration(value:unknown):{settings:Settings;profiles:Profile[];demo?:boolean;activities?:Activity[]}{
 const x=value as Record<string,unknown>;if(!x||(x.version!==1&&x.version!==2)||!Array.isArray(x.profiles)||!x.settings)throw new Error('Invalid configuration format.');
 const s=x.settings as Settings;if(!Array.isArray(s.enabled)||s.enabled.some(v=>!sports.includes(v))||new Set(s.enabled).size!==s.enabled.length||!s.rates||sports.some(v=>typeof s.rates[v]!=='number'||!Number.isFinite(s.rates[v])||s.rates[v]<0))throw new Error('Invalid scoring settings.');
 const ids=new Set<string>();const profiles=x.profiles.map((v:Profile)=>{if(!v||typeof v.id!=='string'||!v.id||ids.has(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||(v.apiKey!==undefined&&typeof v.apiKey!=='string')||(v.garminPersonalKey!==undefined&&(typeof v.garminPersonalKey!=='string'||!plausibleGarminKey(v.garminPersonalKey)))||(x.version===1&&!v.garminPersonalKey&&(typeof v.apiKey!=='string'||!plausibleToken(v.apiKey))))throw new Error('Each profile requires a name and a Garmin personal key (or a legacy access token).');ids.add(v.id);return {id:v.id,name:v.name.trim(),color:'#b2e660',apiKey:v.apiKey?.trim(),garminPersonalKey:v.garminPersonalKey?.trim()}});
 if(s.goals&&(typeof s.goals!=='object'||Object.values(s.goals).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)))throw new Error('Invalid distance goals.');
 validateChallengeDates(s);
 const demo=x.demo===true;
 const activities:Activity[]=[];
 if(demo||x.version===2){if(!Array.isArray(x.activities)||x.activities.length>10000)throw new Error('Invalid demo activities.');for(const value of x.activities){const a=value as Activity;if(!profiles.some(p=>p.id===a.profileId))throw new Error('Unknown demo profile.');if(typeof a.id!=='string'||!a.id||!['app','import','manual'].includes(a.source))throw new Error('Invalid activity identity or source.');const validated=validateActivity({...a,distance:a.distance===0?1:a.distance},a.profileId);activities.push({...validated,id:a.id,distance:a.distance,source:a.source});}}
 return {profiles,demo,activities:demo||x.version===2?activities:undefined,settings:{startDate:s.startDate,endDate:s.endDate,goals:s.goals,enabled:[...s.enabled],rates:Object.fromEntries(sports.map(v=>[v,s.rates[v]]))}};
}
