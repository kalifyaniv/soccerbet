# 🚀 Deployment Guide

This guide walks you through deploying the app to production using **Vercel** (hosting) and **Supabase** (PostgreSQL database).

The app uses PostgreSQL everywhere via Supabase — two separate projects, one for dev and one for production. Same adapter, same schema, same code. Only `DATABASE_URL` changes between environments.

> **Important:** Production deployments use `prisma migrate deploy` — never `migrate reset`.  
> `migrate reset` wipes all data. `migrate deploy` applies only pending schema changes safely.

---

## Overview

| Layer | Dev | Production |
|-------|-----|-----------|
| Hosting | `npm run dev` (localhost) | Vercel |
| Database | Supabase project `soccerbet-dev` | Supabase project `soccerbet-prod` |
| Adapter | `@prisma/adapter-pg` | `@prisma/adapter-pg` (same) |
| Auth secret | `.env` local | Vercel environment variable |

---

## Step 1 · Create a Supabase database

1. Go to [supabase.com](https://supabase.com) → **New project** → name it `soccerbet-prod`
2. Choose a region close to your users and set a strong database password
3. Once ready: click the green **Connect** button in the top navbar
4. Go to the **ORM** tab → select **Prisma**
5. Copy the **`DIRECT_URL`** value (session pooler, port 5432) — it looks like:
   ```
   postgresql://postgres.<ref>:[PASSWORD]@aws-X-<region>.pooler.supabase.com:5432/postgres
   ```
6. Use this as your `DATABASE_URL` in Vercel

> ⚠️ Use the **ORM tab**, not the Direct tab. The direct connection hostname may not resolve and port 6543 (transaction pooler) is blocked on some networks. The session pooler on port 5432 is the most reliable option.

---

## Step 2 · Run migrations on the production database

**Never** run `prisma migrate reset` in production — it drops and recreates the entire database.

Use `prisma migrate deploy` instead — it applies only the migrations that haven't been applied yet:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Run this once before the first deploy, and again after any schema change.

---

## Step 3 · Seed the production database (first time only)

```bash
DATABASE_URL="postgresql://..." npm run db:seed
```

This inserts the event, 72 fixtures, and the admin user. It uses `upsert` so it's safe to run again — it won't duplicate records.

> ⚠️ **Change the admin password immediately after seeding:**  
> Log in as `admin@soccerbet.com` / `admin123`, then update the password from the admin panel or directly via Prisma Studio.

---

## Step 4 · Deploy to Vercel

### Push to GitHub (if not already done)

```bash
git init
git add .
git commit -m "initial commit"
gh repo create soccerbet --private --push --source .
```

### Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework preset: **Next.js** (detected automatically)
4. Root directory: `soccerbet` (if the repo root is the workspace folder above it)
5. Click **Deploy** — it will fail on the first build because env vars aren't set yet — that's fine

### Set environment variables on Vercel

Go to your project → **Settings → Environment Variables** and add:

| Name | Value | Environments |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:...@db....supabase.co:5432/postgres` | Production, Preview |
| `AUTH_SECRET` | (generate below) | Production, Preview |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |

Generate a secure `AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Redeploy

After setting env vars, trigger a redeploy:
- Vercel dashboard → **Deployments → ⋯ → Redeploy**, or
- Push any commit to trigger an automatic redeploy

---

## Step 5 · Custom domain (optional)

1. Vercel project → **Settings → Domains**
2. Add your domain (e.g. `soccerbet.yourdomain.com`)
3. Update `NEXTAUTH_URL` to match the custom domain

---

## How to update the app without wiping the database

Every time you push a new commit to `main`, Vercel rebuilds and redeploys automatically.

**If the Prisma schema changed** — create a migration locally first:

```bash
npx prisma migrate dev --name describe-the-change
# Commit the new migration file, then push
git add prisma/migrations
git commit -m "add migration: describe-the-change"
git push
```

**Auto-migrate on every deploy** — add this to `package.json`:

```json
"scripts": {
  "vercel-build": "prisma migrate deploy && next build"
}
```

Vercel runs `vercel-build` instead of `next build` automatically, so migrations are always applied before the new code goes live.

---

## Environment variable reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Random 32-byte base64 string for NextAuth encryption |
| `NEXTAUTH_URL` | ✅ | Full URL of the deployed app (must match exactly) |

---

## Rollback

If a deploy breaks the app:

1. Vercel dashboard → **Deployments** → find the last good deploy → **Promote to Production**
2. If the broken deploy included a migration: manually roll back in Supabase SQL editor (rare — prefer forward-only migrations)

---

## Supabase tips

- **Connection pooling:** For production under load, use Supabase's pooler URL (`pgbouncer`) instead of the direct connection. The pooler URL ends with `:6543` and includes `?pgbouncer=true`.
- **Backups:** Supabase free tier takes daily snapshots. Paid tiers offer point-in-time recovery.
- **Prisma + pgbouncer:** Add `?connection_limit=1` to the pooler URL if you see "too many connections" errors on serverless.
