export type Profile = { id: string; name: string; color: string; garminPersonalKey?: string; clientId?: string; clientSecret?: string; refreshToken?: string; expiresAt?: number; apiKey?: string };
export type Activity = { id: string; profileId: string; name: string; date: string; sport: string; distance: number; seconds: number; source: 'manual' | 'import' | 'app' };
export const sports = ['Bieganie', 'Rower', 'Pływanie', 'Spacer', 'Inne'];
export function validateActivity(value: unknown, profileId: string): Activity {
  if (!value || typeof value !== 'object') throw new Error('Nieprawidłowy trening.');
  const a = value as Record<string, unknown>;
  if (typeof a.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.date) || !Number.isFinite(Date.parse(a.date)) || new Date(a.date).toISOString().slice(0,10) !== a.date) throw new Error('Data musi mieć format RRRR-MM-DD.');
  if (typeof a.distance !== 'number' || !Number.isFinite(a.distance) || a.distance <= 0) throw new Error('Dystans musi być dodatnią liczbą kilometrów.');
  if (typeof a.sport !== 'string' || !sports.includes(a.sport)) throw new Error('Nieznana dyscyplina.');
  if (a.seconds !== undefined && (typeof a.seconds !== 'number' || !Number.isFinite(a.seconds) || a.seconds < 0)) throw new Error('Nieprawidłowy czas.');
  return { id: crypto.randomUUID(), profileId, name: typeof a.name === 'string' ? a.name.slice(0,200) : a.sport, date: a.date, sport: a.sport, distance: a.distance, seconds: Number(a.seconds ?? 0), source: 'import' };
}
export function total(activities: Activity[]) { return activities.reduce((sum, a) => sum + Math.round(a.distance * 1000), 0) / 1000; }
export function uniqueActivities(existing: Activity[], incoming: Activity[]) {
  const key = (a: Activity) => `${a.profileId}|${a.source === 'app' ? a.id : `${a.date}|${a.sport}|${a.distance}|${a.name}`}`;
  const seen = new Set(existing.map(key));
  return incoming.filter(a => { const k = key(a); if (seen.has(k)) return false; seen.add(k); return true; });
}

export type ChallengeDates = { startDate?: string; endDate?: string };
export function validateChallengeDates({startDate, endDate}: ChallengeDates): void {
  for (const [label, value] of [['start', startDate], ['end', endDate]]) {
    if (value !== undefined && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
      throw new Error(`Invalid ${label} date.`);
    }
  }
  if (startDate && endDate && startDate > endDate) throw new Error('Start date must be on or before end date.');
}
export function challengeActivities(activities: Activity[], {startDate, endDate}: ChallengeDates): Activity[] {
  // ISO calendar dates compare directly, without UTC conversions shifting local days.
  return activities.filter(a => a.source === 'app' && (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate));
}
