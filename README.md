# ⚽ World Cup 2026 – Soccer Betting App

A group-stage betting competition for FIFA World Cup 2026.  
Players predict all 72 group-stage scores before the tournament. Points update automatically as the admin enters results.

> **Other docs:**  
> [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — how to deploy to production  
> [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) — participant guide

---

## Running Locally

### Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

You also need a free **Supabase** project for local development. Create one at [supabase.com](https://supabase.com) — it takes about 2 minutes. Use a separate project for dev and production (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).

---

### 1 · Install dependencies

```bash
cd soccerbet
npm install
```

---

### 2 · Create a dev Supabase project

1. [supabase.com](https://supabase.com) → **New project** → name it `soccerbet-dev`
2. Once ready: click the green **Connect** button in the top navbar
3. Go to the **ORM** tab → select **Prisma**
4. Copy the **`DIRECT_URL`** value (session pooler, port 5432) — it looks like:
   ```
   postgresql://postgres.<ref>:[PASSWORD]@aws-X-<region>.pooler.supabase.com:5432/postgres
   ```

> ⚠️ Use the **ORM tab**, not the Direct tab. The username format and host are different and the direct host may not be reachable on all networks.

---

### 3 · Environment variables

The `.env` file is already created. Paste your Supabase URL in:

```env
DATABASE_URL="postgresql://postgres.<ref>:[PASSWORD]@aws-X-<region>.pooler.supabase.com:5432/postgres"
AUTH_SECRET="<your secret>"
NEXTAUTH_URL="http://localhost:3000"
```

> **Password special characters:** URL-encode any special characters in the password (e.g. `!` → `%21`, `@` → `%40`).  
> **VPN users:** Port 6543 (transaction pooler) is blocked on some VPNs — use the session pooler on port 5432 as shown above.

Generate a fresh `AUTH_SECRET` any time:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 4 · Set up the database

```bash
npx prisma migrate deploy   # apply schema
npm run db:seed             # insert event + 72 fixtures + admin user
```

After seeding you have:

| Thing | Value |
|-------|-------|
| Admin email | `admin@soccerbet.com` |
| Admin password | `admin123` |
| Event ID | `wc2026` |
| Fixtures | 72 group-stage matches (Groups A–L) |

> ⚠️ Change the admin password before sharing the app with anyone.

---

### 5 · Start the server

```bash
npm run dev
```

Open **http://localhost:3000**

---

### Useful commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build (type-checks everything) |
| `npm run db:seed` | Re-run the seed (safe to run again — uses upsert) |
| `npm run db:reset` | ⚠️ Wipe dev DB + re-seed (dev only, never production) |
| `npx prisma studio` | Visual database browser at localhost:5555 |
| `npx prisma migrate deploy` | Apply pending migrations without resetting data |

---

### Project structure

```
soccerbet/
├── prisma/
│   ├── schema.prisma          # Database schema (PostgreSQL)
│   ├── seed.ts                # 72 fixtures + admin user
│   └── migrations/            # Migration history
├── src/
│   ├── app/
│   │   ├── (app)/             # Protected pages with Navbar
│   │   │   ├── leaderboard/   # Live standings + per-בית leaders
│   │   │   ├── bet/           # 72-match betting form
│   │   │   ├── results/       # Match results + my points
│   │   │   └── admin/         # Admin dashboard, results entry, payout
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   └── api/               # REST API routes
│   ├── components/
│   │   ├── betting/           # BettingForm (the main form)
│   │   ├── admin/             # AdminResultsClient
│   │   └── ui/                # Navbar
│   ├── lib/
│   │   ├── auth.ts            # NextAuth v5 config
│   │   ├── prisma.ts          # DB client singleton
│   │   └── scoring.ts         # Point calculation engine
│   └── types/index.ts         # Shared TypeScript types
└── docs/
    ├── DEPLOYMENT.md
    └── USER_GUIDE.md
```

---

### Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Prisma 7 |
| Database | PostgreSQL — Supabase (separate dev + prod projects) |
| Auth | NextAuth v5 — email + password |

---

### Scoring reference

| Points | Condition |
|--------|-----------|
| **7** | Exact score (e.g. predicted 2–1, actual 2–1) |
| **4** | Correct winner **and** correct goal margin |
| **3** | Correct winner **or** correct goal margin |
| **0** | Wrong |
| **×2** | Any of the above on a multiplier match |
| **+10** | King of Goals correct |
| **+10** | Tournament winner correct |
