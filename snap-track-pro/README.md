# Snap & Track — Production starter

Next.js full-stack starter for a family food + water tracker.

- **Parent (admin) account** signs up first.
- **Kid accounts** are created by the parent with username + password.
- Photos go through your server, not the browser. The Anthropic API key lives
  in an environment variable and never leaves the server.
- Postgres holds users + entries.
- Photos are sent to Anthropic for analysis but are **not** persisted.

## What's in here

```
snap-track-pro/
├── db/schema.sql                    Postgres schema
├── src/
│   ├── lib/
│   │   ├── db.ts                    postgres client
│   │   ├── auth.ts                  password hashing + signed cookie sessions
│   │   ├── anthropic.ts             vision call + JSON extraction
│   │   └── types.ts
│   ├── app/
│   │   ├── api/                     server endpoints
│   │   ├── login/                   login page
│   │   ├── signup/                  parent signup
│   │   ├── kids/                    parent: manage kid accounts
│   │   └── page.tsx                 main dashboard
│   └── components/                  small client components
└── .env.example
```

## 1. Install Node and clone

You need Node 20+. Then:

```bash
cd snap-track-pro
npm install
```

## 2. Get a Postgres database

Easiest free option is **Neon** (https://neon.tech). Sign up, create a project,
copy the connection string. It looks like:

```
postgres://user:pass@ep-something.us-east-1.aws.neon.tech/dbname?sslmode=require
```

Supabase, Railway, Render, or local Postgres all work too.

## 3. Get an Anthropic API key

Create one at https://console.anthropic.com/. Make a key dedicated to this app
so you can revoke it without touching anything else, and set a monthly spend
limit on the workspace.

## 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in `DATABASE_URL`, `ANTHROPIC_API_KEY`, and
`AUTH_SECRET` (generate with `openssl rand -base64 48`).

## 5. Create the tables

```bash
npm run db:init
```

This runs `db/schema.sql` against `$DATABASE_URL`. (Requires `psql` on your
machine. If you don't have it, paste the contents of `db/schema.sql` into Neon's
SQL editor and run it once.)

## 6. Run it

```bash
npm run dev
```

Open http://localhost:3000.

1. Tap **Create parent account** to sign yourself up.
2. Once logged in, go to **Kids** and create an account for each kid (name +
   username + password).
3. Hand the kid their username and password. They sign in at `/login` and
   only see their own data.

## 7. Deploy to Vercel

1. Push this folder to a GitHub repo (`git init`, `git add .`, `git commit`,
   `git remote add ...`, `git push`).
2. Go to https://vercel.com/new, pick the repo, click **Deploy**.
3. Vercel will fail the first build because env vars aren't set. Open the
   project → **Settings** → **Environment Variables** and add `DATABASE_URL`,
   `ANTHROPIC_API_KEY`, `AUTH_SECRET`. Optionally `ANTHROPIC_MODEL` and
   `DAILY_ANALYZE_LIMIT`.
4. Click **Redeploy**. You'll get a `https://your-app.vercel.app` URL.

## What's intentionally not included

To keep this a starter, these are out of scope. Each is straightforward to
add later:

- **Photo persistence.** Photos are sent to Anthropic and discarded. Add S3 /
  R2 / Supabase Storage if you want a visual food log.
- **Email verification, password reset.** Not needed for a small family
  deployment but real users will want it.
- **Rate limit / abuse protection** beyond `DAILY_ANALYZE_LIMIT`. Add Upstash
  rate limiting or Vercel's edge middleware if you open this up.
- **COPPA / parental consent flow** for opening the app to other families'
  kids. The parent-as-admin model is a good foundation, but a public launch
  to kids under 13 in the US needs verifiable parental consent.
- **Mobile camera capture from the kid login screen.** The form supports it
  via `<input capture>`; for a true app feel use a Next.js PWA setup.

## Architecture notes

Sessions use a signed JWT in an `httpOnly` cookie (no DB session table).
Passwords are hashed with bcrypt. The `users` table has a `role` column
(`parent` or `kid`); kid rows have a `parent_id` pointing at the parent.
All API routes call `requireUser()` (or `requireParent()`) from `src/lib/auth.ts`.

`/api/analyze` accepts a base64-encoded image, calls Claude with a JSON-only
prompt, extracts `{food, calories, confidence, notes}`, and returns it. It
also enforces `DAILY_ANALYZE_LIMIT` per user.
