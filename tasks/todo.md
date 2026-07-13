# Iteration 3 — fix broken nav (Settings / Analytics / Agents) + wire the Style Brain

The Sidebar links to /analytics, /agents, /settings but none of those pages exist — 3 nav links 404. And the `style_profiles` row (niche, tone, hashtag strategy) drives trend scoring, prompt enhancement, script writing, and the review council, yet there is no UI to edit it — you need raw SQL. This iteration closes both gaps.

## Plan

- [x] 1. `/api/style-profile` GET/POST — read + upsert the single style profile row; boundary-coerces every field to a string so a malformed body can't 500 the route.
- [x] 2. `/settings` page + `StyleProfileForm` client component — edit the Style Brain (niche, tone, pacing, visual style, caption format, hashtag strategy, hook patterns) with save state.
- [x] 3. `/analytics` page — real aggregates from `content_queue` (pipeline counts, posts-by-platform bars) + `post_analytics` engagement totals; DB-fallback banner when Supabase isn't connected.
- [x] 4. `/agents` page — 6-agent council roster + 10 specialist agents + recent `master_decisions`; DB fallback.
- [x] 5. Verify: `npm run build` clean (35 routes), all 3 broken nav links now resolve.

## Constraints
- 100% free. All DB via server routes / server components. Every route + page resilient to a missing DB (fallback, never crash the render).
- Match the existing design system (Sidebar, surface-card, brand-500). No gold-plating.
