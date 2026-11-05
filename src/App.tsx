import { useEffect, useState } from 'react';
import ChallengeBoard from './ChallengeBoard';
import { readState, writeState, type State } from './storage';
import SettingsPanel from './SettingsPanel';
import { Trophy, Settings2, RefreshCw, Trash2 } from 'lucide-react';

export default function App(){
 const [data,setData]=useState<State>({profiles:[],activities:[]});
 const [view,setView]=useState(location.hash==='#settings'?'settings':'challenge');
 const [notice,setNotice]=useState('');
 const [confirmClear,setConfirmClear]=useState(false);
 const [clearing,setClearing]=useState(false);
 useEffect(()=>{const change=()=>setView(location.hash==='#settings'?'settings':'challenge');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[]);
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{readState().then(s=>{setData(s);setReady(true)}).catch(()=>setError('Unable to open local storage.'));},[]);
 async function save(next:State){try{await writeState(next);setData(next);setError('')}catch{setError('Unable to save changes.');}}
 return <div className="app"><aside><a className="brand" href="#"><svg className="runner-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="21" cy="5" r="2.5"/><path d="m12 13 5-5 5 5 6 1M17 9l-4 10 6 4-3 7M13 19l-5 7H2M5 12h5"/></svg> Challenger<span>MAKE EVERY KILOMETRE COUNT</span></a><nav><a className={view==='challenge'?'active':''} href="#challenge"><Trophy size={19}/>CHALLENGE</a><a className={view==='settings'?'active':''} href="#settings"><Settings2 size={19}/>SETTINGS</a></nav></aside><main>{error&&<p role="alert" className="error">{error}</p>}{!ready?<p>Opening local storage…</p>:view==='settings'?<SettingsPanel data={data} save={save}/>:<><div className="settings-title"><h1>Challenge</h1><p className="intro">Compare distances. Collect points. Lead the challenge.</p></div><section className="panel"><div className="heading"><div><h2>Challenge leaderboard</h2></div><div className="challenge-actions"><button className="update-button" onClick={()=>setNotice('App sync is coming soon. No data has been changed.')}><RefreshCw size={18}/> Update</button><button className="clear-button" onClick={()=>setConfirmClear(true)}><Trash2 size={18}/> Clear</button></div></div>{notice&&<p className="notice" role="status">{notice}</p>}<ChallengeBoard data={data}/></section></>}{confirmClear&&<div className="modal-backdrop"><section className="panel modal" role="dialog" aria-modal="true" aria-labelledby="clear-title"><h2 id="clear-title">Clear App data?</h2><p>This removes all locally cached App activities and their aggregated distances and points, including demo activities. Profiles, access tokens and challenge settings will be kept. Nothing will be deleted from App.</p><div className="button-row"><button className="clear-button" disabled={clearing} onClick={async()=>{setClearing(true);try{const next={...data,demo:false,activities:data.activities.filter(a=>a.source!=='app')};await writeState(next);setData(next);setConfirmClear(false);setError('');setNotice('Local App activity data has been cleared.')}catch{setError('Unable to clear local data. Please try again.')}finally{setClearing(false)}}}>{clearing?'Clearing…':'Clear data'}</button><button className="secondary" autoFocus disabled={clearing} onClick={()=>setConfirmClear(false)}>Cancel</button></div></section></div>}</main></div>
}
