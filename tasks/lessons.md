# Lessons

- Never instantiate an API SDK client at module scope in Next.js — `next build` imports every route during page-data collection, so a missing env var breaks the whole build. Lazy-init inside the function that uses it. (Found: `new Groq()` at top of `src/lib/groq.ts` failed any build without GROQ_API_KEY.)
- Never hardcode a Supabase project ref in comments or code — the referenced project can be deleted and the pointer silently rots. Describe the step generically and rely on env vars. (Found: schema.sql pointed to a project that no longer exists while the live app ran on DB fallbacks.)
- Browser-rendered video blobs exceed Vercel's 4.5MB serverless body limit — upload via a server-issued Supabase signed upload URL (PUT from the browser), never through an API route body.
