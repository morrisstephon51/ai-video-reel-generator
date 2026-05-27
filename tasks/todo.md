# AI Video Reel Generator — Build Plan

## Revised Company Prompt

> Build a **fully autonomous, self-learning, self-healing AI social media content engine** for our company.
>
> The system continuously monitors real-time trends (Google Trends, Twitter/X, YouTube, TikTok Discover) and cross-references them with our business niche. It learns our brand's preferred content style — tone of voice, pacing, visual aesthetic, caption format, hook patterns — from our top-performing posts and viral content in our space. Using that living style profile, it autonomously generates complete short-form videos (AI imagery + AI video clips + AI voiceover + captions + hashtags), assembles them, and pushes them live to every major social platform on an optimized schedule — without human intervention once the style is trained.
>
> When the user provides a content prompt or topic, the system first passes it through a **Prompt Intelligence Layer**: it preserves every core idea from the input, then enhances it for maximum viral potential by layering in trend signals, niche relevance, and the brand's proven style patterns — producing a stronger version of the original intent, never a replacement of it.
>
> The system is **self-healing and self-improving**: every error — whether a broken API call, platform rejection, generation failure, or code-level exception — is automatically captured, diagnosed by the AI, and resolved. It generates its own fix, applies it, verifies it works, and logs the improvement. Over time, the system accumulates a library of its own patches and learned error patterns, making it progressively harder to break. It also continuously refines its own content prompts, generation strategies, and posting logic based on what the analytics say is working — compounding its effectiveness with every post.
>
> The goal is a perpetual, compounding content flywheel that replaces a full marketing department at zero recurring AI cost.

---

## Free Stack (No Payment Required)

| Layer | Tool | Cost |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Free |
| Hosting + Cron | Vercel free tier | Free |
| Database + Storage + Auth | Supabase free tier | Free |
| LLM (all intelligence) | Groq API — Llama 3.3 70B | Free tier |
| Image generation | Pollinations.ai REST API | 100% free, no key |
| AI Video clips | Hugging Face Inference — CogVideoX | Free tier |
| AI Voiceover | edge-tts (Microsoft Edge TTS via npm) | Free |
| Video assembly | fluent-ffmpeg + FFmpeg binary | Free |
| Trend intelligence | Google Trends RSS + platform trending endpoints | Free |
| Social posting | Platform REST APIs (all free tiers) | Free |

---

## Full System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SELF-HEAL ENGINE                        │
│  Catches every error system-wide → LLM diagnoses → patches  │
│  code or config → verifies fix → logs to improvements DB    │
└────────────────────────┬────────────────────────────────────┘
                         │ wraps all services
                         ▼
┌──────────────┐   ┌─────────────────────────────────────────┐
│  TREND       │   │        AUTONOMOUS ORCHESTRATOR           │
│  MONITOR     │──►│  (Vercel Cron — runs on schedule)        │
│              │   │  1. Pull trends                          │
│  Google RSS  │   │  2. Score vs. niche + style              │
│  Twitter/X   │   │  3. Select topic                         │
│  YouTube RSS │   │  4. Enhance prompt (Prompt Intelligence) │
│  TikTok      │   │  5. Generate content                     │
└──────────────┘   │  6. Assemble video                       │
                   │  7. Post to all platforms                │
┌──────────────┐   │  8. Ingest analytics                     │
│  STYLE       │◄──│  9. Update style profile                 │
│  BRAIN       │   │  10. Self-improve prompts + logic        │
│              │   └─────────────────────────────────────────┘
│  tone        │
│  hooks       │   ┌─────────────────────────────────────────┐
│  pacing      │   │       PROMPT INTELLIGENCE LAYER          │
│  visuals     │   │                                          │
│  captions    │   │  User input  →  Core idea extraction     │
│  hashtags    │   │  Trend overlay  →  Style alignment       │
│  top topics  │   │  Hook amplification  →  Enhanced prompt  │
│  weak topics │   │                                          │
└──────────────┘   │  Preserves original intent.             │
                   │  Never replaces — only strengthens.      │
                   └──────────────┬──────────────────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────────────────┐
                   │       AI GENERATION PIPELINE             │
                   │  Groq → hook + script + captions        │
                   │  Pollinations.ai → scene images          │
                   │  HuggingFace CogVideoX → AI clips        │
                   │  edge-tts → voiceover MP3               │
                   │  FFmpeg → final MP4 + captions           │
                   └──────────────┬──────────────────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────────────────┐
                   │          PUBLISHER SERVICE               │
                   │  TikTok │ Instagram │ YouTube            │
                   │  Twitter │ LinkedIn │ Facebook           │
                   └──────────────┬──────────────────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────────────────┐
                   │       ANALYTICS FEEDBACK LOOP            │
                   │  Pulls views/likes/shares/saves/follows  │
                   │  LLM identifies winning patterns         │
                   │  Updates Style Brain                     │
                   │  Improves generation prompts             │
                   └─────────────────────────────────────────┘
```

---

## Self-Heal Engine — How It Works

Every service call is wrapped in an **error boundary** that:

1. **Captures** full context: error message, stack trace, request params, platform response, service name
2. **Logs** to `error_logs` table in Supabase with severity + frequency
3. **Classifies** the error via LLM: transient / config / code bug / platform change / rate limit
4. **Generates fix** based on class:
   - *Transient*: exponential backoff retry
   - *Rate limit*: queue with delay, switch to fallback service
   - *Platform change*: LLM updates the platform adapter (endpoint, payload format)
   - *Code bug*: LLM generates a patch → writes to `pending_patches` table → auto-applies if confidence > 90%, else flags for review
5. **Verifies**: re-runs the failed operation with the fix applied
6. **Logs improvement**: patch stored in `self_improvements` table with before/after diff
7. **Learns**: recurring errors get promoted to permanent fixes in the codebase

### Fallback Chains (never fully fails)
```
Image generation:  Pollinations.ai → HuggingFace SDXL → solid color + text overlay
Video clips:       CogVideoX → AnimateDiff → Ken Burns effect on images
Voiceover:         edge-tts → gTTS → silent (captions only)
LLM:               Groq Llama 3.3 → Groq Llama 3.1 → Groq Mixtral
Social post:       Retry ×3 → queue for next window → alert + skip
```

---

## Prompt Intelligence Layer — How It Works

```
User input: "post about our new product launch"
                    │
                    ▼
         Extract core ideas:
         [product launch, new, ours]
                    │
                    ▼
         Layer in trend signals:
         [trending: "behind the scenes", "day 1 reactions"]
                    │
                    ▼
         Apply style profile:
         [hook: question-based, tone: bold, pacing: fast-cut]
                    │
                    ▼
Enhanced: "We just launched something that changes everything —
           here's what Day 1 actually looks like behind the scenes"
                    │
                    ▼
         Shown to user as: Original → Enhanced (use either)
         Autonomous mode: uses enhanced automatically
```

---

## Build Phases

### Phase 1 — Core Pipeline (MVP)
- [ ] Scaffold Next.js 14 + Tailwind + Supabase
- [ ] DB schema migration
- [ ] Dashboard shell: sidebar, nav, content calendar
- [ ] /generate page — prompt input UI with Original → Enhanced preview
- [ ] Prompt Intelligence Layer API route (Groq)
- [ ] Script + scene generation API route (Groq)
- [ ] Pollinations.ai image generation API route
- [ ] edge-tts voiceover API route
- [ ] FFmpeg video assembly API route
- [ ] Supabase storage + video record
- [ ] /library page: list all generated videos

### Phase 2 — Style Brain + Trend Monitor
- [ ] Style profile table + editor UI
- [ ] Onboarding: niche input + paste example captions → LLM extracts style fingerprint
- [ ] Google Trends RSS ingestion cron
- [ ] Twitter/X trending topics fetch
- [ ] Topic scorer: LLM rates trends against niche + style
- [ ] Auto-topic selection logic

### Phase 3 — Self-Heal Engine
- [ ] Global error boundary wrapper for all service calls
- [ ] `error_logs` table + logging service
- [ ] Error classifier (Groq LLM)
- [ ] Fallback chain for each generation service
- [ ] Platform adapter auto-updater for API changes
- [ ] `self_improvements` table + improvement log UI in dashboard
- [ ] Confidence-gated auto-patch vs. human-review queue

### Phase 4 — AI Video Clips + Full Editing
- [ ] HuggingFace CogVideoX integration
- [ ] Scene editor UI (swap, reorder, re-generate)
- [ ] Caption burn-in via FFmpeg
- [ ] Platform export presets (9:16 Reels/TikTok, 16:9 YouTube)

### Phase 5 — Social Platform Connections
- [ ] OAuth: TikTok, Instagram, YouTube, Twitter/X, LinkedIn, Facebook
- [ ] Platform-specific post adapters
- [ ] All 6 platform upload integrations

### Phase 6 — Fully Autonomous Loop
- [ ] Vercel Cron: daily generate + post
- [ ] Best-time-to-post schedule per platform
- [ ] Analytics ingestion from all platforms
- [ ] Style Brain reinforcement from analytics
- [ ] Self-improving prompt templates (LLM rewrites its own prompts based on results)
- [ ] Daily digest: what posted, top performer, what was auto-fixed

---

## DB Schema (Supabase)

```sql
style_profiles    (id, niche, tone, hook_patterns, pacing, visual_style,
                   caption_format, hashtag_strategy, updated_at)
trend_signals     (id, platform, topic, score, fetched_at)
videos            (id, topic, original_prompt, enhanced_prompt, script,
                   style_profile_id, status, created_at)
scenes            (id, video_id, order, prompt, image_url, clip_url, duration)
voiceovers        (id, video_id, text, audio_url)
exports           (id, video_id, mp4_url, thumbnail_url, aspect_ratio)
platform_accounts (id, platform, access_token, refresh_token, expires_at)
scheduled_posts   (id, export_id, platform_id, scheduled_at, posted_at,
                   status, platform_post_id)
post_analytics    (id, scheduled_post_id, views, likes, shares, saves,
                   comments, follows, fetched_at)
topic_bank        (id, topic, niche, priority, source, used_at)
error_logs        (id, service, error_type, message, stack, context,
                   severity, resolved, created_at)
self_improvements (id, error_log_id, fix_type, patch_diff, confidence,
                   applied, verified, created_at)
pending_patches   (id, service, patch_diff, reason, status, created_at)
```

---

## Phase 1 Immediate Checklist
- [ ] 1. Init Next.js 14 + Tailwind + Supabase client
- [ ] 2. Supabase schema migration
- [ ] 3. Dashboard shell (layout, sidebar, nav)
- [ ] 4. /generate page with Original → Enhanced prompt UI
- [ ] 5. Prompt Intelligence API route (Groq)
- [ ] 6. Script + scenes API route (Groq)
- [ ] 7. Pollinations.ai image API route
- [ ] 8. edge-tts voiceover API route
- [ ] 9. FFmpeg assembly API route
- [ ] 10. Supabase storage + save video record
- [ ] 11. /library page
