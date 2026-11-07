import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const prefix = '/Challenger/activity-api';
const tokenPath = '/personalapitoken-service/personal-api/personal-api-key/token';
const activitiesPath = '/activitylist-service/activities/search/activities';

// Development only: same-origin relay, restricted to the two official endpoints.
function guardActivityRelay(): Plugin {
  return {
    name: 'guard-activity-relay',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(prefix)) return next();
        const host = req.headers.host;
        const origin = req.headers.origin;
        const localHost = host === '127.0.0.1:5173' || host === 'localhost:5173';
        if (!localHost || (origin && origin !== `http://${host}`) || req.headers['sec-fetch-site'] === 'cross-site') {
          res.writeHead(403).end(); return;
        }
        const path = req.url.split('?')[0].slice(prefix.length);
        const allowed = (path === tokenPath && req.method === 'POST') || (path === activitiesPath && req.method === 'GET');
        if (!allowed) { res.writeHead(404).end(); return; }
        res.setHeader('Cache-Control', 'no-store');
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), guardActivityRelay()],
  base: '/Challenger/',
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: {
      [prefix]: {
        target: 'https://personal.connectapi.garmin.com',
        changeOrigin: true, secure: true, proxyTimeout: 30000, timeout: 30000,
        rewrite: path => path.slice(prefix.length),
        configure(proxy) {
          proxy.on('proxyReq', proxyReq => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('cookie');
          });
          proxy.on('proxyRes', proxyRes => {
            delete proxyRes.headers['set-cookie'];
            proxyRes.headers['cache-control'] = 'no-store';
          });
          proxy.on('error', (_error, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              res.end(JSON.stringify({ error: 'Local relay could not reach the activity service.' }));
            }
          });
        },
      },
    },
  },
});
