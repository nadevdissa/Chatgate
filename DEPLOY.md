# Deploy ChatGate

## Option A — Vercel (you already use this)

Your site at Vercel shows the UI, but chat needs a **database** because Vercel cannot save files on the server.

### 1. Connect Supabase (recommended — you already did this)

1. Open [vercel.com/dashboard](https://vercel.com/dashboard) → your **my-website** project
2. Go to **Storage** → your Supabase database → **Connect to Project**
3. Make sure these env vars exist on the project:
   - `POSTGRES_URL` (most important)
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

ChatGate uses `POSTGRES_URL` from Supabase to save users and messages.

**Alternative:** Upstash Redis also works (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).

### 2. Redeploy

Push your latest code to GitHub, or in Vercel click **Deployments** → **Redeploy**.

### 3. Turn off deployment protection (if you see a login wall)

Preview URLs like `my-website-5ib9pc6ps-....vercel.app` often require Vercel login.

1. Project **Settings** → **Deployment Protection**
2. Disable protection for **Production** (or share the main production URL instead)

Your public URL is usually:

`https://my-website.vercel.app`

(not the long preview link)

### 4. Test

1. Open your production Vercel URL
2. Create account `alice`
3. On another phone/PC, open the same URL → create `bob`
4. Send friend request → accept → chat

Check the API works:

`https://YOUR-URL.vercel.app/api/health`

Should return: `{"ok":true,"service":"chatgate","storage":"supabase"}`

---

## Option B — Render (alternative)

See `render.yaml` in this project. Good if you prefer a always-on Node server with file storage.

---

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 (uses `data/db.json` locally, no Redis needed).
