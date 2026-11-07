import { openDB } from 'idb';
import { migrateProfile, type Activity, type Profile } from './domain';
const db = openDB('challenger', 1, { upgrade(db) { db.createObjectStore('state'); } });
export type Settings = { startDate?: string; endDate?: string; enabled: string[]; rates: Record<string, number>; goals?: Record<string, number> };
export const defaults: Settings = { enabled: ["Bieganie", "Pływanie"], rates: { Bieganie: 2.5, Rower: 1, Pływanie: 10, Spacer: 1, Inne: 1 } };
export type State = { demo?: boolean; lastUpdated?: string; profiles: Profile[]; activities: Activity[]; settings?: Settings };
export async function readState(): Promise<State> {
 const state:State=(await (await db).get('state', 'current'))??{profiles:[],activities:[]};
 let changed=false;
 const activities=state.activities.map(a=>{
  if(a.source==='manual'||a.source==='import'||a.source==='app')return a;
  changed=true;
  return {...a,source:'app' as const};
 });
 const profiles=state.profiles.map(migrateProfile);
 const migrated={...state,activities,profiles};
 if(changed || profiles.some((p,i)=>p!==state.profiles[i]))await (await db).put('state',migrated,'current');
 return migrated;
}
export async function writeState(state: State) { await (await db).put('state', state, 'current'); }
