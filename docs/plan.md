> ⚠️ **TEMPORARY – delete `docs/plan.md` before handing in.** Working notes only, not part of the submission.

## Progress (as of 2026-11-15)

| Step | Status |
|---|---|
| 1. App | ✅ done (commit `9dac42a`) |
| 2. Env config & secrets | 🟡 `lib/config.ts` + `.gitignore` done; **todo:** `.env.example`, `output: 'standalone'` in `next.config.ts` |
| 3. Logging | ✅ done (incl. request-id) |
| 4. Health check | ✅ `/health` done; Docker `HEALTHCHECK` + Render path come in steps 5 & 8 |
| 5. Docker | ⬜ next up |
| 6. GitHub repo | ✅ `tjrnstrm/iths-slcm-ex1`, branch `main` |
| 7. CI/CD workflow | ⬜ |
| 8. Render (2 services, Frankfurt) | ⬜ |
| 9. README | ⬜ |

**Way of working:** one step at a time → review → commit per step.

**Local only (gitignored):** `.env.local` – on another machine create it with:
```
APP_ENV=development
LOG_LEVEL=debug
MAX_BOOKINGS=5
ADMIN_API_KEY=local-dev-key
```

---

# Plan: SLCM EX1 – Next.js booking app → Docker → GitHub Actions → Render

## Context

This is an individual assignment (deadline Friday). The grade depends on deployment, CI/CD, configuration, logging and documentation, not on the app itself. `ex1/` is a fresh Next.js **16.4.6** app (App Router, `cacheComponents: true`, Tailwind 4, react-icons). It has a sidebar nav with links to Dashboard, Profile, Bookings and Settings. The pages are empty and `/bookings` doesn't exist. It's a local git repo on `master` with no remote. Docker 29, Node 22 and `gh` are installed.
Aim: meet every G requirement and the VG extras (multi-stage Dockerfile, dev/prod separation, structured logging, a pipeline with clear failure handling, an architecture diagram, and an in-depth cost/security discussion). README in **English**.

Next 16 details checked in `node_modules/next/dist/docs`:

- `output: 'standalone'` → `.next/standalone/server.js`, which reads `PORT`/`HOSTNAME`. `public` and `.next/static` have to be copied in manually.
- `instrumentation.ts` → `register()` runs once at server start (used for the startup log). `onRequestError` handles server errors.
- With Cache Components, a GET route handler is **prerendered at build time** unless it touches runtime data. `/health` and anything reading runtime env must call `await connection()` (from `next/server`).

## Schedule

- **Today (3h):** steps 1–5 (app, env, logging, health, Docker working locally)
- **Day 2:** steps 6–8 (GitHub repo, workflow, Render, verify the CI/CD round trip, screenshots)
- **Day 3:** step 9 (README, diagram, cost discussion), polish, final screenshots, submit

## Steps

### 1. App (keep it small)

- Clean up `components/navigation.tsx` as previously suggested: `NavItem[]` array + `NavLink`, icon inside `<Link>`, `<nav>` element, remove the stray `{' '}`. Add a small env badge (dev/prod) under the title.
- Drop `/profile` (not needed) or keep it as a stub. Remove the unused `Nav` import in `app/page.tsx`.
- `lib/bookings.ts`: in-memory store (module-level array). Functions: `listBookings`, `createBooking` (validates name, date and time; enforces `MAX_BOOKINGS`), `deleteBooking`.
- `app/api/bookings/route.ts`: GET list, POST create (400 + `logger.error` on invalid input or a full schedule).
- `app/api/bookings/[id]/route.ts`: DELETE (404 + `logger.warn`/error if missing).
- `app/bookings/page.tsx` + `components/booking-form.tsx` (`'use client'`): form to add a booking and a list with a cancel button. This is the interactive feature.
- `app/page.tsx` dashboard: booking count, next booking, and the env/version line.
- `app/settings/page.tsx`: shows the **non-secret** runtime config (APP_ENV, LOG_LEVEL, MAX_BOOKINGS), so dev vs prod differences can be seen. Calls `await connection()`.

### 2. Env config & secrets

- `lib/config.ts`: one typed place that reads and validates env (`APP_ENV` default `development`, `LOG_LEVEL` default `debug` in dev / `info` in prod, `MAX_BOOKINGS` default 20, `ADMIN_API_KEY` optional). Invalid values → `logger.error` + fallback.
- `ADMIN_API_KEY` (secret, server-only): required as `x-admin-key` on `DELETE /api/bookings` (reset all). This shows real secret handling: never sent to the browser and set only in the Render dashboard.
- **Avoid `NEXT_PUBLIC_*` on purpose**, because those values are inlined at build time and are public. Explain this in the README.
- `.env.example` (committed), `.env.development` stays local. Change `.gitignore` from `.env*` to `.env*` + `!.env.example` so the example gets committed.
- `next.config.ts`: add `output: 'standalone'`.

### 3. Logging

- ✅ Request-id: `requestLogger(request)` binds `requestId/method/path` to every line and returns it as the `x-request-id` response header (correlate a user's error with Render logs).
- `lib/logger.ts`: a small leveled logger. Each line is `[ISO-time] LEVEL message {json context}` and goes through `console.debug/info/warn/error`. It honours `LOG_LEVEL`, which makes logs easy to filter in Render.
- `instrumentation.ts`:
  - `register()` (only when `NEXT_RUNTIME === 'nodejs'`) → `INFO Server started {env, port, node, version}`.
  - `onRequestError` → `logger.error` with path, method and routeType.
- Normal events → `info` (booking created or cancelled, health check). Bad input → `error`.

### 4. Health check

- `app/health/route.ts` (the spec says `/health`, not `/api/health`): `await connection()`, then return `{ status: 'ok', uptime, timestamp, env, version }` with `Cache-Control: no-store`.
- Set it as Render's Health Check Path, and add a Docker `HEALTHCHECK` using `node -e "fetch(...)"`, since alpine has no curl.

### 5. Docker

- `Dockerfile`, multi-stage on `node:22-alpine`:
  1. `deps`: `npm ci`
  2. `builder`: copy the source, `npm run build`
  3. `runner`: `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, `PORT=3000`, non-root `nextjs` user. Copy `.next/standalone`, `.next/static` and `public`. `EXPOSE 3000`, `HEALTHCHECK`, `CMD ["node","server.js"]`.
- Render injects `PORT` (10000) and server.js respects it.
- `.dockerignore`: node_modules, .next, .git, .env\*, !.env.example, README, .github, Dockerfile.
- Verify with `docker build -t slcm-ex1 .`, then `docker run --rm -p 3000:3000 -e APP_ENV=production slcm-ex1`, then `curl localhost:3000/health`.

### 6. GitHub repo (I do it with `gh`, after you OK it)

- `git branch -m master main`, commit, run `gh repo create <name> --public --source . --push`.

### 7. CI/CD: `.github/workflows/deploy.yml`

- `on: push: branches: [main, dev]` (+ `workflow_dispatch`). `permissions: contents: read`. `concurrency` cancels older runs.
- Job **build**: checkout → setup-node 22 (npm cache) → `npm ci` → `npm run build`.
- Job **docker** (`needs: build`): checkout → `docker build -t slcm-ex1:${{ github.sha }} .`. Nothing is pushed.
- Job **deploy** (`needs: [build, docker]`, only on `main`): check that `secrets.RENDER_DEPLOY_HOOK_URL` is set (fail with a clear `::error::` otherwise), then `curl -fsS -X POST "$HOOK"`. The hook is passed through `env:` so it is never echoed. `-f` makes the step fail on an HTTP error.
- Each `needs` link means a failure stops everything after it. Explain this in the README.

### 8. Render (manual, in the dashboard; I'll give you exact steps)

- **Two services (recap checklist: "Två miljöer på Render")**, one Render project with environments Production + Development, region **Frankfurt** (EU/GDPR, close to users):
  - `slcm-ex1` ← branch `main`: `APP_ENV=production`, `LOG_LEVEL=info`, `MAX_BOOKINGS=50`, own `ADMIN_API_KEY`.
  - `slcm-ex1-dev` ← branch `dev`: `APP_ENV=development`, `LOG_LEVEL=debug`, `MAX_BOOKINGS=5`, a different `ADMIN_API_KEY`.
- Both: runtime Docker, **Free** plan, Health Check Path `/health`, **Auto-Deploy: Off**.
- Workflow triggers on `main` and `dev`. The deploy job picks the hook by branch: secret `RENDER_DEPLOY_HOOK_URL` (main, the name the assignment requires) and `RENDER_DEPLOY_HOOK_URL_DEV` (dev).
- Copy the Deploy Hook into a GitHub secret with `gh secret set RENDER_DEPLOY_HOOK_URL`, pasting the value when prompted so it doesn't end up in shell history.
- Round trip: change the heading → push → Actions turns green → Render deploys → the change shows on the public URL. To trigger an error log for the screenshot, POST invalid JSON to `/api/bookings`.

### 9. README.md (replace the create-next-app boilerplate)

Sections: description · framework choice (Next.js: SSR plus route handlers in one process, so no separate server is needed for `/health` and logs) · local run · Docker · env vars table (name, secret?, dev value, prod value, where it's set) + secret handling (`.env` gitignored, Render env, GitHub secret, why `NEXT_PUBLIC_` isn't secret) · logging & health (how to use them when troubleshooting) · workflow walkthrough + what happens if a build fails · Render deployment flow · **Mermaid architecture diagram** (dev → GitHub → Actions [build → docker → hook] → Render [docker build → container → /health] → user) with decision rationale · cost questions (Free plan: spin-down after 15 min idle, cold starts, 512 MB RAM / 0.1 CPU, in-memory data lost on restart; cost drivers; how to cut resource use; scaling → paid instance, a database such as Render Postgres, multiple instances, a CDN for static files) · security notes · live link · screenshots folder (`docs/screenshots/`).

## Critical files

`next.config.ts`, `.gitignore`, `components/navigation.tsx`, `app/page.tsx`, `app/settings/page.tsx`, new: `app/bookings/page.tsx`, `components/booking-form.tsx`, `app/api/bookings/route.ts`, `app/api/bookings/[id]/route.ts`, `app/health/route.ts`, `lib/{config,logger,bookings}.ts`, `instrumentation.ts`, `.env.example`, `Dockerfile`, `.dockerignore`, `.github/workflows/deploy.yml`, `README.md`.

## Verification

1. `npm run dev`: add and cancel a booking. Invalid input shows an ERROR in the terminal. `/health` returns JSON. `/settings` shows `development`.
2. `npm run build && npm start`: the startup log appears and the build passes.
3. Docker build and run as above: `/health` is OK, the app works on :3000, and `docker ps` shows `healthy`.
4. Push to main: all three Actions jobs green. Break the build on purpose once to confirm deploy is skipped, then revert.
5. Render: deploy succeeds, the public URL works, and the logs show the INFO startup line and the ERROR from the invalid POST. Take the 3 screenshots.
