import { openDB } from 'idb';
import type { Activity, Profile } from './domain';
const db = openDB('challenger', 1, { upgrade(db) { db.createObjectStore('state'); } });
export type State = { profiles: Profile[]; activities: Activity[] };
export async function readState(): Promise<State> { return (await (await db).get('state', 'current')) ?? {profiles: [], activities: []}; }
export async function writeState(state: State) { await (await db).put('state', state, 'current'); }
