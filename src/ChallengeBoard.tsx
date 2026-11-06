import SwipeTable from './SwipeTable';
import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { total, challengeActivities } from './domain';
import { defaults, type State } from './storage';
import { sportLabel } from './SettingsPanel';
const format=(n:number)=>n.toLocaleString('en-US',{maximumFractionDigits:2});
export function daysRemaining(end:string,now=new Date()){
 const [y,m,d]=end.split('-').map(Number);
 return Math.round((Date.UTC(y,m-1,d)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);
}
export default function ChallengeBoard({data}:{data:State}){
 const settings=data.settings??defaults;
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer)},[]);
 const activities=challengeActivities(data.activities,settings);
 const distance=(id:string,sport:string)=>total(activities.filter(a=>a.profileId===id&&a.sport===sport));
 const points=(id:string)=>settings.enabled.reduce((n,s)=>n+distance(id,s)*(settings.rates[s]??0),0);
 const maxPoints=settings.enabled.length&&settings.enabled.every(s=>settings.goals?.[s]!==undefined)?settings.enabled.reduce((n,s)=>n+settings.goals![s]*(settings.rates[s]??0),0):undefined;
 const best=Math.max(0,...data.profiles.map(p=>points(p.id)));
 const leaders=best>0?data.profiles.filter(p=>Math.abs(points(p.id)-best)<0.000001):[];
 const days=settings.endDate?daysRemaining(settings.endDate,now):undefined;
 return <>{(settings.startDate||settings.endDate)&&<p className="note">Scoring period: {settings.startDate??'Beginning of activity history'} to {settings.endDate??'No end date'} (inclusive).</p>}{data.demo&&<p className="notice">Demo preview — fictional profiles and activities, not synced from App.</p>}{days!==undefined&&<p className="countdown"><strong>{days>0?`${days} ${days===1?'day':'days'} left`:days===0?'Last day of the challenge':'Challenge ended'}</strong><span>Ends {settings.endDate}</span></p>}<section className="sport-board"><h3>Summary</h3><SwipeTable><table className="comparison"><thead><tr><th>Profile</th><th>Total points</th><th>Max points</th></tr></thead><tbody>{data.profiles.map(p=><tr className={best>0&&Math.abs(points(p.id)-best)<0.000001?'leader-row':undefined} key={p.id}><th scope="row">{p.name}</th><td className={best>0&&points(p.id)===best?'winning-score':undefined}>{format(points(p.id))}</td><td>{maxPoints===undefined?'—':format(maxPoints)}</td></tr>)}</tbody></table></SwipeTable></section>{settings.enabled.map(s=>{const goal=settings.goals?.[s],weight=settings.rates[s]??0;const sportBest=Math.max(0,...data.profiles.map(p=>distance(p.id,s)*weight));return <section className="sport-board" key={s}><h3>{sportLabel(s)}</h3><SwipeTable><table className="comparison"><thead><tr><th>Profile</th><th>Goal<small>km</small></th><th>Distance<small>km</small></th><th>Weight<small>pts / km</small></th><th>Points</th><th>Max points</th></tr></thead><tbody>{data.profiles.map(p=><tr className={sportBest>0&&Math.abs(distance(p.id,s)*weight-sportBest)<0.000001?'leader-row':undefined} key={p.id}><th scope="row">{p.name}</th><td>{goal===undefined?'—':format(goal)}</td><td>{format(distance(p.id,s))}</td><td>{format(weight)}</td><td>{format(distance(p.id,s)*weight)}</td><td>{goal===undefined?'—':format(goal*weight)}</td></tr>)}</tbody></table></SwipeTable></section>})}{!settings.enabled.length&&<p className="empty">Choose sports in Settings to build your challenge.</p>}{!data.profiles.length&&<p className="empty">Add profiles in Settings to compare athletes.</p>}<div className="board-summary"><div><Trophy size={20}/><span>Current leader</span><strong>{leaders.length?leaders.map(p=>p.name).join(' & '):'No leader yet'}</strong>{leaders.length>1&&<small>Tied</small>}</div><span className="sync-status">Last updated: {data.lastUpdated?new Date(data.lastUpdated).toLocaleString():'not synced yet'}</span></div></>;
}
