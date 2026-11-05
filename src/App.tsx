import { useEffect, useState } from 'react';
import { total } from './domain';
import { readState, writeState, type State } from './storage';
import SettingsPanel from './SettingsPanel';
import { Trophy, Settings2, RefreshCw } from 'lucide-react';
import { defaults } from './storage';
const number = (n:number) => n.toLocaleString('en-US',{maximumFractionDigits:3});
export default function App(){
 const [data,setData]=useState<State>({profiles:[],activities:[]});
 const [view,setView]=useState(location.hash==='#settings'?'settings':'challenge');
 const [notice,setNotice]=useState('');
 useEffect(()=>{const change=()=>setView(location.hash==='#settings'?'settings':'challenge');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{readState().then(s=>{setData(s);setReady(true)}).catch(()=>setError('Unable to open local storage.'));},[]);
 async function save(next:State){try{await writeState(next);setData(next);setError('')}catch{setError('Unable to save changes.');}}
 const settings=data.settings??defaults;
 const points=(items:typeof data.activities)=>items.reduce((sum,a)=>sum+a.distance*(settings.rates[a.sport]??0),0);
 const filtered=data.activities.filter(a=>a.source==='strava'&&settings.enabled.includes(a.sport));
 const ranking=data.profiles.map(p=>({...p,distance:total(filtered.filter(a=>a.profileId===p.id)),points:points(filtered.filter(a=>a.profileId===p.id))})).sort((a,b)=>b.points-a.points);
 return <div className="app"><aside><a className="brand" href="#"><svg className="runner-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="21" cy="5" r="2.5"/><path d="m12 13 5-5 5 5 6 1M17 9l-4 10 6 4-3 7M13 19l-5 7H2M5 12h5"/></svg> Challenger<span>MAKE EVERY KILOMETRE COUNT</span></a><nav><a className={view==='challenge'?'active':''} href="#challenge"><Trophy size={19}/>CHALLENGE</a><a className={view==='settings'?'active':''} href="#settings"><Settings2 size={19}/>SETTINGS</a></nav></aside><main>{error&&<p role="alert" className="error">{error}</p>}{!ready?<p>Opening local storage…</p>:view==='settings'?<SettingsPanel data={data} save={save}/>:<><section className="panel"><div className="heading"><div><h2>Challenge leaderboard</h2></div><button className="update-button" onClick={()=>setNotice('Strava sync is coming soon. No data has been changed.')}><RefreshCw size={18}/> Update</button></div>{notice&&<p className="notice" role="status">{notice}</p>}{!ranking.length?<p className="empty">Add your first profile in Settings.</p>:ranking.map((p,i)=><div className="ranking" key={p.id}><span className="place">{String(i+1).padStart(2,'0')}</span><div className="bar-wrap"><div className="heading"><b>{p.name}</b><b>{number(p.points)} pts · {number(p.distance)} km</b></div><div className="track"><div style={{width:`${ranking[0].points?p.points/ranking[0].points*100:0}%`}}/></div></div></div>)}</section></>}</main></div>
}
