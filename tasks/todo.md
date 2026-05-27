# AI Video Reel Generator — Build Plan

## Revised Company Prompt

> Build a **fully autonomous, self-learning AI social media content engine** for our company.
>
> The system continuously monitors real-time trends (platform trending topics, Google Trends, viral hashtags) and cross-references them with our business niche. It learns our brand's preferred content style — tone of voice, pacing, visual aesthetic, caption format, hook patterns — by analyzing both our own top-performing posts and viral content in our niche. Using that learned style profile, it autonomously generates complete short-form videos (AI imagery + AI video clips + AI voiceover + captions + hashtags), assembles them, and pushes them live to every major social platform on an optimized schedule — without any human intervention once the style is trained.
>
> The dashboard lets us review what was posted, adjust the style profile, seed new brand topics, and monitor performance. The AI closes the loop: it reads engagement data back from each platform, identifies what is working, reinforces those patterns in future content, and deprioritizes what underperforms. The goal is a perpetual, compounding content flywheel that replaces a full marketing department at zero recurring AI cost.

---

## Free Stack (No Payment Required)

| Layer | Tool | Cost |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Free |
| Hosting + Cron | Vercel free tier | Free |
| Database + Storage + Auth | Supabase free tier | Free |
| LLM (scripts, style learning, trend analysis) | Groq API — Llama 3.3 70B | Free tier |
| Image generation | Pollinations.ai REST API | 100% free, no key |
| AI Video clips | Hugging Face Inference — CogVideoX | Free tier |
| AI Voiceover | edge-tts (Microsoft Edge TTS via npm) | Free |
| Video assembly | fluent-ffmpeg + FFmpeg binary | Free |
| Trend intelligence | Google Trends RSS + platform trending endpoints | Free |
| Social posting | Platform REST APIs (all free tiers) | Free |

---

## Full System Architecture

```
                        ┌─────────────────────────────┐
                        │        TREND MONITOR         │
                        │  Google Trends RSS           │
                        │  Twitter/X Trending Topics   │
                        │  YouTube Trending RSS        │
                        │  TikTok Discover (scrape)    │
                        └────────────┬────────────────┘
                                     │ trending topics + signals
                                     ▼
┌──────────────┐      ┌─────────────────────────────────┐
│  STYLE       │      │     AUTONOMOUS ORCHESTRATOR      │
│  BRAIN       │◄────►│  (Vercel Cron — runs on schedule)│
│              │      │                                  │
│  Learned     │      │  1. Pull trends                  │
│  patterns:   │      │  2. Score against niche          │
│  - tone      │      │  3. Select topic                 │
│  - pacing    │      │  4. Apply style profile          │
│  - hooks     │      │  5. Generate content             │
│  - visuals   │      │  6. Assemble video               │
│  - captions  │      │  7. Post to all platforms        │
│  - hashtags  │      │  8. Log results                  │
└──────┬───────┘      └──────────────┬───────────────────┘
       │                             │
       │  feedback loop              │
       │                             ▼
┌──────┴───────┐      ┌─────────────────────────────────┐
│  ANALYTICS   │      │       AI GENERATION PIPELINE     │
│  ENGINE      │      │                                  │
│              │      │  Groq Llama 3.3                  │
│  Per post:   │      │    → hook + script + captions    │
│  - views     │      │    → scene descriptions          │
│  - likes     │      │    → hashtag sets                │
│  - shares    │      │                                  │
│  - saves     │      │  Pollinations.ai                 │
│  - comments  │      │    → scene images                │
│  - follows   │      │                                  │
│              │      │  HuggingFace CogVideoX           │
│  Reinforces  │      │    → AI video clips              │
│  what works  │      │                                  │
└──────────────┘      │  edge-tts                        │
                      │    → voiceover MP3               │
                      │                                  │
                      │  FFmpeg                          │
                      │    → final MP4 w/ captions       │
                      └──────────────┬───────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────────┐
                      │        PUBLISHER SERVICE         │
                      │                                  │
                      │  TikTok  │ Instagram │ YouTube   │
                      │  Twitter │ LinkedIn  │ Facebook  │
                      └──────────────────────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────────┐
                      │          DASHBOARD               │
                      │                                  │
                      │  Content calendar                │
                      │  Style profile editor            │
                      │  Brand topic bank                │
                      │  Post history + status           │
                      │  Engagement analytics            │
                      │  Manual generate / override      │
                      └─────────────────────────────────┘
```

---

## Style Brain — How It Learns

The Style Brain is a JSON profile stored in Supabase, built and updated by the LLM:

```json
{
  "tone": "confident, conversational, slightly bold",
  "hook_patterns": ["Did you know...", "The #1 mistake...", "Here's why..."],
  "pacing": "fast-cut, 3-5 seconds per scene",
  "visual_style": "clean, dark background, bold text overlays",
  "caption_format": "short punchy line + 3 bullet points + CTA",
  "hashtag_strategy": "3 niche + 2 trending + 1 brand",
  "best_performing_topics": [],
  "underperforming_topics": [],
  "niche": "",
  "brand_voice_examples": []
}
```

It is updated after every analytics pull by asking the LLM: *"Given these engagement results, what style patterns should we reinforce or drop?"*

---

## Build Phases

### Phase 1 — Core Pipeline (MVP)
- [ ] Scaffold Next.js 14 + Tailwind + Supabase
- [ ] DB schema migration (see below)
- [ ] Dashboard shell: sidebar, nav, content calendar
- [ ] /generate page — text prompt → full pipeline
- [ ] Groq script + scene generation API route
- [ ] Pollinations.ai image generation API route
- [ ] edge-tts voiceover API route
- [ ] FFmpeg video assembly API route
- [ ] Video preview + Supabase storage
- [ ] Content library (list + status of all generated videos)

### Phase 2 — Style Brain + Trend Monitor
- [ ] Style profile DB table + editor UI
- [ ] Onboarding: user describes niche, uploads 3-5 example videos or pastes example captions
- [ ] LLM extracts style fingerprint from examples
- [ ] Google Trends RSS ingestion (cron)
- [ ] Twitter/X trending topics fetch (free API)
- [ ] Topic scorer: LLM rates each trend against niche + style
- [ ] Auto-topic selection logic

### Phase 3 — AI Video Clips + Full Editing
- [ ] HuggingFace CogVideoX integration for AI video clips
- [ ] Scene editor UI (swap, reorder, re-generate per scene)
- [ ] Caption/subtitle overlay via FFmpeg burn-in
- [ ] Transition effects between scenes
- [ ] Platform-specific export presets (9:16 for TikTok/Reels, 16:9 for YouTube)

### Phase 4 — Social Platform Connections
- [ ] OAuth flows: TikTok, Instagram, YouTube, Twitter/X, LinkedIn, Facebook
- [ ] Platform-specific post adapters (title, description, hashtag format)
- [ ] TikTok Video Upload API
- [ ] Instagram Reels (Graph API)
- [ ] YouTube Shorts (Data API v3)
- [ ] Twitter/X video tweet (API v2)
- [ ] LinkedIn video post
- [ ] Facebook Reels (Graph API)

### Phase 5 — Fully Autonomous Loop
- [ ] Vercel Cron: daily autonomous generation + posting
- [ ] Platform-specific best-time-to-post schedule
- [ ] Post queue with retry on failure
- [ ] Analytics ingestion: pull views/likes/shares from each platform
- [ ] Style Brain reinforcement: LLM updates style profile from analytics
- [ ] Trend → generate → post → analyze → learn (no human needed)
- [ ] Slack/email digest: daily summary of what was posted + top performer

---

## DB Schema (Supabase)

```sql
style_profiles    (id, niche, tone, hook_patterns, pacing, visual_style,
                   caption_format, hashtag_strategy, updated_at)
trend_signals     (id, platform, topic, score, fetched_at)
videos            (id, topic, script, style_profile_id, status, created_at)
scenes            (id, video_id, order, prompt, image_url, clip_url, duration)
voiceovers        (id, video_id, text, audio_url)
exports           (id, video_id, mp4_url, thumbnail_url, aspect_ratio)
platform_accounts (id, platform, access_token, refresh_token, expires_at)
scheduled_posts   (id, export_id, platform_id, scheduled_at, posted_at,
                   status, platform_post_id)
post_analytics    (id, scheduled_post_id, views, likes, shares, saves,
                   comments, follows, fetched_at)
topic_bank        (id, topic, niche, priority, source, used_at)
```

---

## Phase 1 Immediate Checklist
- [ ] 1. Init Next.js 14 + Tailwind + Supabase client
- [ ] 2. Supabase schema migration
- [ ] 3. Dashboard shell (layout, sidebar, nav)
- [ ] 4. /generate page UI
- [ ] 5. Groq API route: topic → script + scenes
- [ ] 6. Pollinations.ai API route: scene → image
- [ ] 7. edge-tts API route: text → MP3
- [ ] 8. FFmpeg assembly API route: assets → MP4
- [ ] 9. Supabase storage upload + video record save
- [ ] 10. /library page: list all generated videos with preview
