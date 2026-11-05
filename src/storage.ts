import { openDB } from 'idb';
import type { Activity, Profile } from './domain';
const db = openDB('challenger', 1, { upgrade(db) { db.createObjectStore('state'); } });
export type Settings = { enabled: string[]; rates: Record<string, number> };
export const defaults: Settings = { enabled: ["Bieganie", "Pływanie"], rates: { Bieganie: 2.5, Rower: 1, Pływanie: 10, Spacer: 1, Inne: 1 } };
export type State = { profiles: Profile[]; activities: Activity[]; settings?: Settings };
export async function readState(): Promise<State> { return (await (await db).get('state', 'current')) ?? {profiles: [], activities: []}; }
export async function writeState(state: State) { await (await db).put('state', state, 'current'); }
