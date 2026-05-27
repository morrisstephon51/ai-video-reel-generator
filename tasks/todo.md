# AI Video Reel Generator — Build Plan

## Revised Company Prompt
> Build an autonomous AI-powered social media content management system. Given a text topic or prompt, it generates a complete short-form video (AI imagery + AI voiceover + captions + transitions), lets a human review and lightly edit it, then autonomously schedules and posts it to every major social platform on a repeating cadence — replacing the output of a full marketing department, at zero recurring AI cost.

---

## Free Stack (No Payment Required)

| Layer | Tool | Cost |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Free |
| Hosting + Cron | Vercel free tier | Free |
| Database + Storage + Auth | Supabase free tier | Free |
| LLM (scripts, captions, hashtags) | Groq API — Llama 3.3 70B | Free tier |
| Image generation | Pollinations.ai REST API | 100% free, no key |
| Video generation | Hugging Face Inference API — CogVideoX | Free tier |
| AI Voiceover | edge-tts (Microsoft Edge TTS via npm) | Free |
| Video assembly | fluent-ffmpeg + FFmpeg binary | Free |
| Social posting | Platform REST APIs (all free tiers) | Free |

---

## Architecture (5 Services)

```
[Dashboard UI]
     │
     ▼
[Content Pipeline Orchestrator]  ←  [Scheduler / Cron]
     │
     ├── [AI Generation Service]
     │       ├── Groq → script + captions + hashtags
     │       ├── Pollinations.ai → scene images
     │       ├── HuggingFace → short AI video clips
     │       └── edge-tts → voiceover MP3
     │
     ├── [Video Assembly Service]  (FFmpeg)
     │       └── images + clips + voice + captions → final MP4
     │
     ├── [Review / Edit UI]
     │       └── trim, swap scenes, re-generate individual parts
     │
     └── [Publisher Service]
             ├── TikTok API
             ├── Instagram Graph API
             ├── YouTube Data API v3
             ├── Twitter/X API v2
             ├── LinkedIn API
             └── Facebook Graph API
```

---

## Build Phases

### Phase 1 — Core Pipeline (MVP) ✅ Build First
- [ ] Scaffold Next.js 14 app with Supabase auth
- [ ] Dashboard layout: sidebar nav, content calendar view
- [ ] AI Script Generator (Groq Llama 3.3) — topic → script + scenes
- [ ] Image Generator (Pollinations.ai) — scene descriptions → images
- [ ] Voiceover Generator (edge-tts) — script → MP3
- [ ] Video Assembler (FFmpeg) — images + voice + captions → MP4
- [ ] Preview player in dashboard
- [ ] Supabase storage for generated assets
- [ ] DB schema: projects, videos, scenes, scheduled_posts

### Phase 2 — Editing + AI Video Clips
- [ ] Scene editor UI (swap images, re-generate, reorder)
- [ ] HuggingFace CogVideoX integration for AI video clips
- [ ] Caption/subtitle overlay via FFmpeg
- [ ] Transition effects between scenes
- [ ] Export final MP4

### Phase 3 — Social Platform Connections
- [ ] OAuth flows for each platform (stored in Supabase)
- [ ] TikTok Video Upload API
- [ ] Instagram Reels (Graph API)
- [ ] YouTube Shorts (Data API v3)
- [ ] Twitter/X video post (API v2)
- [ ] LinkedIn video post
- [ ] Facebook Reels (Graph API)

### Phase 4 — Autonomous Scheduler
- [ ] Vercel Cron jobs (daily/weekly trigger)
- [ ] Content queue with platform-specific best-post-times
- [ ] Auto-generate from topic bank (seed topics in DB)
- [ ] Post status tracking + retry on failure
- [ ] Email/webhook notification on post success/failure

### Phase 5 — Analytics + Intelligence
- [ ] Pull engagement stats from each platform API
- [ ] Show top-performing content patterns
- [ ] AI suggests next topics based on what performed best
- [ ] Trend detection (Twitter trending, YouTube trending via RSS)

---

## DB Schema (Supabase)

```sql
videos        (id, title, topic, script, status, created_at)
scenes        (id, video_id, order, prompt, image_url, clip_url, duration)
voiceovers    (id, video_id, text, audio_url)
exports       (id, video_id, mp4_url, thumbnail_url)
platforms     (id, user_id, platform, access_token, refresh_token)
scheduled_posts (id, export_id, platform_id, scheduled_at, posted_at, status)
topic_bank    (id, topic, niche, priority, used_at)
```

---

## Phase 1 Checklist (what gets built today)
- [ ] 1. Init Next.js 14 + Tailwind + Supabase
- [ ] 2. Supabase schema migration
- [ ] 3. Dashboard shell (layout, nav, pages)
- [ ] 4. /generate page — text prompt → full pipeline
- [ ] 5. Groq script generation API route
- [ ] 6. Pollinations.ai image generation API route
- [ ] 7. edge-tts voiceover API route
- [ ] 8. FFmpeg video assembly API route
- [ ] 9. Video preview + asset storage in Supabase
- [ ] 10. Content library page (list of generated videos)
