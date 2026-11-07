const ORIGIN = 'https://lankow.github.io';
const UPSTREAM = 'https://personal.connectapi.garmin.com';
const TOKEN = '/personalapitoken-service/personal-api/personal-api-key/token';
const ACTIVITIES = '/activitylist-service/activities/search/activities';

export async function handleRequest(request, upstreamFetch = fetch) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const headers = { 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
  if (origin === ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ORIGIN;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization';
    headers['Access-Control-Max-Age'] = '3600';
  }
  const error = (status, message) => Response.json({error: message}, {status, headers});
  if (url.pathname === '/health' && request.method === 'GET') return Response.json({service: 'Challenger Garmin relay', status: 'ok'}, {headers});
  if (origin !== ORIGIN) return error(403, 'Origin not allowed.');
  const method = url.pathname === TOKEN ? 'POST' : url.pathname === ACTIVITIES ? 'GET' : null;
  if (!method) return error(404, 'Unknown endpoint.');
  if (request.method === 'OPTIONS') {
    if (request.headers.get('Access-Control-Request-Method') !== method) return error(405, 'Method not allowed.');
    const requested = (request.headers.get('Access-Control-Request-Headers') || '').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
    if (requested.some(h=>h!=='authorization')) return error(403, 'Header not allowed.');
    return new Response(null, {status: 204, headers});
  }
  if (request.method !== method) return error(405, 'Method not allowed.');
  const authorization = request.headers.get('Authorization') || '';
  const scheme = method === 'POST' ? 'ApiKey ' : 'Bearer ';
  if (!authorization.startsWith(scheme) || !/^[\x21-\x7e]{1,8192}$/.test(authorization.slice(scheme.length))) return error(401, 'A valid credential header is required.');
  if (method === 'POST' && url.search) return error(400, 'Token queries are not allowed.');
  if (method === 'GET') {
    const allowed = new Set(['start','limit','excludeChildren','sortOrder','sortBy']);
    for (const key of url.searchParams.keys()) if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) return error(400, 'Invalid query.');
    const start=url.searchParams.get('start')||'0', limit=url.searchParams.get('limit')||'99';
    if (!/^\d{1,5}$/.test(start) || Number(start)>9900 || !/^\d{1,2}$/.test(limit) || Number(limit)<1 || Number(limit)>99) return error(400, 'Invalid pagination.');
    if (url.searchParams.has('excludeChildren') && !['true','false'].includes(url.searchParams.get('excludeChildren'))) return error(400,'Invalid query.');
    if (url.searchParams.has('sortOrder') && !['asc','desc'].includes(url.searchParams.get('sortOrder'))) return error(400,'Invalid query.');
    if (url.searchParams.has('sortBy') && url.searchParams.get('sortBy')!=='startLocal') return error(400,'Invalid query.');
  }
  try {
    const response = await upstreamFetch(UPSTREAM + url.pathname + url.search, {
      method, headers: {Authorization: authorization, Accept: '*/*'},
      redirect: 'manual', signal: AbortSignal.timeout(25000),
    });
    if (response.status >= 300 && response.status < 400) return error(502, 'Unexpected redirect from Garmin.');
    if (!response.ok) return error(response.status, 'Garmin rejected the request.');
    // Stream only the response; do not persist credentials, activities, or raw errors.
    return new Response(response.body, {status: response.status, headers: {...headers, 'Content-Type': method === 'POST' ? 'text/plain' : 'application/json'}});
  } catch { return error(502, 'Cannot reach Garmin. Try again later.'); }
}
export default { fetch: request => handleRequest(request) };
