import type { Activity, Profile } from './domain';

// Official Personal API: https://developer.garmin.com/gc-developer-program/personal/swagger-docs/
const BASE = import.meta.env?.DEV ? '/Challenger/garmin-api' : 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const ACTIVITY_PATH = '/activitylist-service/activities/search/activities';
const PAGE_SIZE = 99;
const tokenCache = new Map<string, { key: string; token: string; expires: number }>();

async function call(path: string, authorization: string, method: string, request: typeof fetch): Promise<Response> {
  let response: Response;
  try {
    response = await request(BASE + path, {
      method, headers: { Authorization: authorization, Accept: '*/*' },
      credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error('Cannot reach Garmin. Check your connection. If the browser blocks cross-origin access (CORS), a backend or local helper will be needed. Cached activities are unchanged.');
  }
  if (response.status === 400 || response.status === 401) {
    throw new Error(method === 'POST'
      ? 'Garmin rejected the personal key. Check that it is correct, has not expired and has not been deleted.'
      : 'Garmin rejected the activity request or access token. Try Update again to obtain a new token.');
  }
  if (response.status === 403) throw new Error('Garmin denied access. Check your Personal API key and its account permissions.');
  if (response.status === 429) throw new Error('Garmin request limit reached. Try again later.');
  if (!response.ok) throw new Error(`Garmin request failed (HTTP ${response.status}). Cached activities are unchanged.`);
  return response;
}

async function obtainToken(profile: Profile, request: typeof fetch): Promise<string> {
  const key = profile.garminPersonalKey?.trim();
  if (!key) throw new Error('Add a Garmin personal API key to this profile in Settings.');
  const cached = tokenCache.get(profile.id);
  if (cached?.key === key && cached.expires > Date.now() / 1000 + 3600) return cached.token;
  const response = await call(TOKEN_PATH, `ApiKey ${key}`, 'POST', request);
  const token = (await response.text()).trim();
  let expires: number;
  try {
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error();
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    expires = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))).exp;
    if (typeof expires !== 'number' || !Number.isFinite(expires) || expires <= Date.now() / 1000) throw new Error();
  } catch {
    throw new Error('Garmin returned an invalid or expired access token. No credentials were changed.');
  }
  // The JWT expiry is a cache hint, not local verification of identity.
  tokenCache.set(profile.id, { key, token, expires });
  return token;
}

export function mapActivity(value: unknown, profileId: string): Activity {
  const a = value as Record<string, unknown>;
  if (!a || typeof a !== 'object' || !Number.isSafeInteger(a.activityId) || Number(a.activityId) <= 0 ||
      typeof a.startTimeLocal !== 'string' || !/^\d{4}-\d{2}-\d{2}[ T]/.test(a.startTimeLocal)) {
    throw new Error('Garmin returned an invalid activity. Cached activities are unchanged.');
  }
  const date = a.startTimeLocal.slice(0, 10);
  if (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Garmin returned an invalid activity date.');
  const distance = a.distance ?? 0; // Activities such as strength training have no distance.
  const seconds = a.movingDuration ?? a.duration ?? 0;
  if (typeof distance !== 'number' || !Number.isFinite(distance) || distance < 0 ||
      typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) throw new Error('Garmin returned invalid activity measurements.');
  const type = a.activityType as { typeKey?: string; parentTypeId?: number } | undefined;
  const key = type?.typeKey ?? '';
  const sport = key === 'running' || key.endsWith('_running') ? 'Bieganie'
    : key === 'cycling' || key.endsWith('_cycling') ? 'Rower'
    : key === 'swimming' || key.endsWith('_swimming') ? 'Pływanie'
    : ['walking', 'hiking', 'speed_walking'].includes(key) ? 'Spacer' : 'Inne';
  return { id: `garmin:${a.activityId}`, profileId, name: typeof a.activityName === 'string' ? a.activityName : 'Activity',
    date, sport, distance: distance / 1000, seconds, source: 'app' };
}

export async function fetchActivities(profile: Profile, progress: (page: number) => void, request: typeof fetch = fetch): Promise<Activity[]> {
  const token = await obtainToken(profile, request);
  const results = new Map<string, Activity>();
  const seenIds = new Set<number>();
  try {
    for (let page = 0; page < 100; page++) {
      progress(page + 1);
      // Include multisport legs, then omit parent summaries to avoid counting them twice.
      const query = new URLSearchParams({ start: String(page * PAGE_SIZE), limit: String(PAGE_SIZE), excludeChildren: 'false', sortOrder: 'desc', sortBy: 'startLocal' });
      const response = await call(`${ACTIVITY_PATH}?${query}`, `Bearer ${token}`, 'GET', request);
      const items: unknown = await response.json().catch(() => { throw new Error('Garmin returned an invalid activity list.'); });
      if (!Array.isArray(items)) throw new Error('Garmin returned an invalid activity list.');
      let added = 0;
      for (const item of items) {
        const activity = mapActivity(item, profile.id);
        if (!seenIds.has(item.activityId)) { seenIds.add(item.activityId); added++; }
        if (item.isParent !== true) results.set(activity.id, activity);
      }
      if (items.length < PAGE_SIZE) return [...results.values()];
      if (!added) throw new Error('Garmin repeated an activity page. Cached activities are unchanged.');
    }
    throw new Error('Garmin history exceeds the safe request limit. Cached activities are unchanged.');
  } catch (error) {
    tokenCache.delete(profile.id);
    throw error;
  }
}
