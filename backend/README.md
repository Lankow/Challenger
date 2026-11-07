# Challenger activity relay

Deploy `worker.js` as the code for Cloudflare Worker `challenger-api`.
No secret values, database, custom domain or paid plan are required.

## Dashboard deployment

1. Open Workers & Pages > challenger-api > Edit code.
2. Replace the starter code with the complete contents of `worker.js`.
3. Deploy, then check `/health` on the workers.dev URL.
4. Disable Workers Logs under Worker Settings > Observability. The code does not
   log request headers, bodies or credentials; disabling platform logs also avoids
   retaining request metadata.
5. Verify the CORS preflight from `https://lankow.github.io` and test a activity update.
6. Set `VITE_ACTIVITY_RELAY_URL` in the Pages workflow build environment to the Worker
   HTTPS origin (no trailing slash), and deploy the frontend.

The Worker forwards only token and paginated activity-list requests.
It strips cookies, does not follow redirects and does not persist data. Keys and
activities pass through Cloudflare. Origin checks enforce browser CORS, not user
identity: non-browser clients can spoof Origin. Every upstream request still needs
a service credential; there are no app-wide stored service credentials to exploit.
The public Worker can consume the free request quota. Review metrics and add proper
access control/rate limiting before broader distribution. Stay on the Free plan
unless an upgrade is explicitly intended.

Worker deployment is manual; GitHub Actions currently deploys only the frontend.
