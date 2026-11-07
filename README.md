# Challenger

React, TypeScript and Vite distance challenge dashboard.

## activity updates

Add a personal API key under Settings > Edit profile, save, then click
Update in Challenge. Existing profiles need their own personal key; legacy access
and refresh tokens are not used. Demo data must be cleared before live updates.

The integration uses only the official Personal API:

- POST `/personalapitoken-service/personal-api/personal-api-key/token`
  with an `Authorization: ApiKey ...` header.
- GET `/activitylist-service/activities/search/activities`
  with a bearer token and offset pagination (99 activities per page).

Tokens are returned as JWT text, retained only in memory, and reacquired when
less than one hour remains. Changing a profile's key invalidates its cached token.
Personal keys stay in local IndexedDB and are sent to the activity service for authentication;
configuration exports include keys in plain text. Never commit real credentials.

Update fetches all accessible history, at most 100 pages per profile. Distances
are converted from metres to kilometres. Multisport legs are included and parent
summaries excluded to avoid double counting. A failed profile download preserves
its cached activities; successful profiles replace their cached API activities,
including those from the previous integration. Imported activities are retained.

Direct browser requests depend on the activity service allowing the app's origin through CORS.
Neither Vite builds nor GitHub Pages can override the activity service's CORS policy. A failed
network request shows an actionable error; no public proxy or unofficial endpoint
is used. Authenticated browser operation has not yet been verified.

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

Tests use synthetic credentials and mocked responses, never live account data.

## Local browser relay

The activity service rejected a credential-free CORS preflight from `http://127.0.0.1:5173`
with HTTP 403. The Vite development server therefore relays requests through
`/Challenger/activity-api` to the two official endpoints listed above. It binds to
loopback port 5173, checks Host/Origin, strips cookies, and does not store keys.
Only token POSTs and activity-list GETs are allowed. TLS verification stays enabled.

This relay is development-only and is not included in the static production build.
GitHub Pages still cannot relay these requests; production needs an approved
backend/local-helper design or file imports. No public third-party proxy is used.

## GitHub Pages

The Actions workflow builds/tests `main` and deploys only `dist` to GitHub Pages.
In repository Settings > Pages, use **GitHub Actions** as the source.
Expected URL: https://lankow.github.io/Challenger/

Hosted builds use the configured `VITE_ACTIVITY_RELAY_URL` for live activity updates.
Without that variable they remain offline dashboards. Version 2 backups
include cached activities; version 1 configuration/demo imports remain supported.
Backups contain credentials in plain text: import them through the browser UI,
never upload them to the repository. Each browser/origin has its own private
IndexedDB; deploying the app does not publish profiles or create shared storage.

## Hosted backend

See [backend/README.md](backend/README.md) for Cloudflare deployment. The backend
requires no stored service secrets or database; credentials pass through the Worker
over HTTPS. Its public URL is build configuration, not a secret.
