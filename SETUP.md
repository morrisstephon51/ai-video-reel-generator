# Setup — Go Fully Live in ~20 Minutes

Everything below stays inside free tiers. Do the steps in order; each unlocks the next.

## 1. Reconnect the database (required — 5 min)

The app currently runs on fallbacks because its Supabase project was deleted.

1. Go to https://supabase.com/dashboard → **New project** (free tier). Name it anything.
2. When it finishes provisioning, open **SQL Editor → New query**.
3. Paste the entire contents of `src/lib/db/schema.sql` and click **Run**. This creates all tables (videos, scenes, personas, content_queue, …), seeds the style profile, and creates the public `videos` storage bucket.
4. In **Project Settings → API**, copy:
   - Project URL
   - `service_role` key (under "Project API keys" — keep it secret)

## 2. Set the environment variables in Vercel (required — 3 min)

Vercel Dashboard → the `ai-video-reel-generator` project → **Settings → Environment Variables**. Add for Production (and Preview):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | your service_role key from step 1 |
| `GROQ_API_KEY` | free key from https://console.groq.com/keys |
| `CRON_SECRET` | any long random string — locks the publish endpoint |

Then **Deployments → ⋯ on the latest → Redeploy** so the new variables take effect.

## 3. Sanity check (2 min)

1. Open the live site → **Dashboard** should show counts without errors.
2. **Trends** → topics load with scores → tap **Make video** on one.
3. Generate a full video → the 6-agent review appears → **Platform Packages** render with a thumbnail.
4. Render the video → **Schedule for Publishing** → check the **Queue** page shows one row per platform.

## 4. Upload your avatar (optional — 2 min)

On the **Generate** page: "Star in your own videos" → upload one short video (or a photo) of yourself → a reference frame is extracted in your browser → flip the toggle on. Every scene is now generated featuring your likeness. Replace or remove it anytime.

## 5. YouTube auto-posting (optional — 10 min, the only fiddly part)

Without this, YouTube posts appear in the Queue as one-tap "ready" bundles like the other platforms.

1. https://console.cloud.google.com → create a project → **APIs & Services → Library** → enable **YouTube Data API v3** (free quota).
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type **Web application** → add `https://developers.google.com/oauthplayground` as an authorized redirect URI. Note the Client ID + Client Secret.
3. **OAuth consent screen** → add your own Google account as a test user.
4. Go to https://developers.google.com/oauthplayground → gear icon → check "Use your own OAuth credentials" → paste Client ID + Secret.
5. In the left list select **YouTube Data API v3 → https://www.googleapis.com/auth/youtube.upload** → Authorize → sign in with the YouTube channel account → **Exchange authorization code for tokens** → copy the **Refresh token**.
6. Add three more Vercel env vars: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` → redeploy.

Now the daily cron (14:00 UTC — Vercel Hobby allows one run/day) uploads due YouTube posts automatically and marks them `posted` with the video ID.

## 6. Daily flow once live

1. **Trends** → pick a topic (or type your own idea on Generate).
2. Toggle avatar mode if you want to star in it.
3. Generate → agent council reviews → render the video (download MP4/WebM, export per-scene clips).
4. **Schedule for Publishing** → each platform gets its own best-time slot.
5. **Queue** → YouTube auto-posts on the daily cron; for TikTok/IG/X/LinkedIn/Facebook tap **Caption** (copies title+caption+hashtags), download the video, and post — their APIs are app-review-gated, so this stays the free path.

## Notes

- Scheduled times are computed in UTC on the server.
- TikTok/Instagram posting APIs require an approved business app — there is no free automated path, which is why those become ready bundles.
- If `CRON_SECRET` is set, the Queue page's "Process due posts now" button is locked (by design) — the cron does the publishing.
