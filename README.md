# Hermes Dashboard

Authenticated, RTL Arabic control panel for the [Hermes agent](https://hermes-agent.nousresearch.com). The official Hermes dashboard exposes `/api/env` with your API keys in plaintext and ships with **no authentication** — running it bound to `0.0.0.0` on a public server is unsafe. This project wraps it in a Next.js app with username/password login, then runs both processes inside **a single container** so the Hermes dashboard listens only on `127.0.0.1` and cannot be reached from any network.

## Architecture

```
                     ┌─────────────────────────────────────┐
                     │      hermes-dashboard (one image)   │
 Internet ── HTTPS ──┤                                     │
    (NPM/Caddy)      │   :3000  Next.js + NextAuth (ours)  │
                     │    │                                │
                     │    └── /api/hermes/* ──── proxy ──┐ │
                     │                                    ▼ │
                     │              127.0.0.1:9119  Hermes  │
                     │                              dashboard│
                     │                              (no auth,│
                     │                              loopback)│
                     └─────────────────────────────────────┘
                                      │
                                      ▼ reads config via shared volume
                           ┌──────────────────────────┐
                           │  hermes-core (gateway)   │
                           │  separate container       │
                           └──────────────────────────┘
```

Only the Next.js app on port 3000 is exposed. The Hermes dashboard on 9119 binds to loopback inside the same container — outside processes (including other Docker containers) cannot reach it.

## Stack

- Next.js 16 (App Router) + TypeScript + standalone build
- Tailwind CSS v4
- NextAuth v5 (credentials provider, JWT sessions)
- bcryptjs for password hashing
- React Flow (for drag-and-drop config editor, planned)
- Single Docker image built from `nousresearch/hermes-agent:latest` + Node.js 22 + built UI

## Quick start — local dev

```bash
npm install
npm run dev
# open http://localhost:3000
# default login: admin / hermes123
```

You still need a Hermes dashboard running somewhere for the `/` page to show data.
Point `HERMES_DASHBOARD_URL` in `.env.local` at a reachable instance.

## Production — Docker

See [docker-compose.example.yml](docker-compose.example.yml) for the full stack (gateway + combined dashboard).

```bash
# 1. generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"    # AUTH_SECRET
node -e "console.log(Buffer.from(require('bcryptjs').hashSync('YOUR_PW',10)).toString('base64'))"  # optional

# 2. put values into docker-compose.yml
# 3. build & run
docker compose up -d --build

# 4. point Nginx Proxy Manager at hermes-dashboard:3000 for HTTPS
```

## Environment

| Var | Purpose |
|---|---|
| `AUTH_SECRET` | Session signing key (required) |
| `AUTH_TRUST_HOST` | Set `true` when behind a reverse proxy (NPM/Caddy) |
| `ADMIN_USERNAME` | Login username (default `admin`) |
| `ADMIN_PASSWORD` | Plaintext password, quick start |
| `ADMIN_PASSWORD_HASH_B64` | Base64-encoded bcrypt hash (preferred) |
| `HERMES_DASHBOARD_URL` | Upstream Hermes URL. Defaults to `http://127.0.0.1:9119` — ideal for single-container mode |

> **Why base64 for bcrypt?** Next.js dotenv expands `$VAR` patterns, corrupting bcrypt hashes that contain `$`. Base64 encoding avoids this silently-broken login bug.

## Pages

- `/login` — auth page
- `/` — status overview (gateway, platforms, recent sessions, auto-refresh)
- Planned: `/providers` (drag-and-drop), `/config`, `/keys`, `/sessions`, `/logs`, `/analytics`, `/cron`, `/skills`

Every authenticated page uses `/api/hermes/[...path]` which enforces a session check before forwarding to the Hermes backend.

## Security checklist before production

- [ ] Unique, random `AUTH_SECRET` (never commit; never reuse)
- [ ] Strong admin password (use `ADMIN_PASSWORD_HASH_B64`, not plaintext)
- [ ] `AUTH_TRUST_HOST=true` **only** when you're behind a trusted reverse proxy
- [ ] HTTPS terminated at NPM/Caddy — never serve auth over plain HTTP
- [ ] `hermes-core` container keeps its own `ports:` config for Telegram etc.; **do not** add `ports: 9119:9119` to the dashboard container
