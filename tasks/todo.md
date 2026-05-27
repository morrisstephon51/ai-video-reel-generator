# AI Video Reel Generator — Build Plan

## Revised Company Prompt

> Build a **fully autonomous, self-learning, self-healing, agent-reviewed AI social media content engine** for our company.
>
> The system continuously monitors real-time trends (Google Trends, Twitter/X, YouTube, TikTok Discover) and cross-references them against our business niche. It learns our brand's preferred content style — tone of voice, pacing, visual aesthetic, caption format, hook patterns — from our own top-performing posts and viral content in our space.
>
> When a user provides a content prompt or topic, the **Prompt Intelligence Layer** extracts every core idea, amplifies it with trend signals and brand style patterns, and returns a stronger version of the original intent — never replacing it, only sharpening it.
>
> Every piece of generated content passes through a **Multi-Agent Review Council** before it is ever published. Specialized AI sub-agents — each trained on current UX principles, UI design systems, platform-native aesthetics, virality research, and brand voice guidelines — independently score and critique the content. A Master Review Agent aggregates their findings, auto-approves content that meets the bar, automatically revises content that falls short (feeding agent notes back into the generation pipeline), or regenerates from scratch if quality is too low. No human gatekeeper is needed — the agent council replaces the creative director, UX lead, brand manager, and content strategist simultaneously.
>
> The system is **self-healing**: every error — broken API call, platform rejection, generation failure, or code-level exception — is automatically captured, diagnosed by the AI, patched, verified, and logged. Fallback chains ensure generation never fully stops. Over time it builds a library of its own fixes and becomes progressively harder to break.
>
> The analytics feedback loop closes the flywheel: engagement data from every platform is ingested, winning patterns are identified and reinforced in the Style Brain, underperforming patterns are deprioritized, and the system's own generation prompts and agent scoring criteria are continuously improved. The result is a perpetual, compounding content machine that replaces a full marketing department at zero recurring AI cost.

---

## Free Stack (No Payment Required)

| Layer | Tool | Cost |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Free |
| Hosting + Cron | Vercel free tier | Free |
| Database + Storage + Auth | Supabase free tier | Free |
| LLM (all agents + intelligence) | Groq API — Llama 3.3 70B | Free tier |
| Image generation | Pollinations.ai REST API | 100% free, no key |
| AI Video clips | Hugging Face Inference — CogVideoX | Free tier |
| AI Voiceover | edge-tts (Microsoft Edge TTS via npm) | Free |
| Video assembly | fluent-ffmpeg + FFmpeg binary | Free |
| Trend intelligence | Google Trends RSS + platform trending endpoints | Free |
| Social posting | Platform REST APIs (all free tiers) | Free |

---

## Full System Architecture

```
 USER / CRON TRIGGER
        │
        ▼
┌───────────────────────────────┐
│   PROMPT INTELLIGENCE LAYER   │
│  Extract core ideas           │
│  Overlay trend signals        │
│  Apply style profile          │
│  Return: Original → Enhanced  │
└───────────────┬───────────────┘
                │ enhanced prompt
                ▼
┌───────────────────────────────┐
│    AI GENERATION PIPELINE     │
│  Groq → script + scenes       │
│  Pollinations.ai → images     │
│  CogVideoX → video clips      │
│  edge-tts → voiceover MP3     │
│  FFmpeg → assembled MP4       │
└───────────────┬───────────────┘
                │ draft content
                ▼
┌═══════════════════════════════════════════════════════════╗
║            MULTI-AGENT REVIEW COUNCIL                     ║
║                                                           ║
║  ┌─────────────────┐  ┌─────────────────┐                ║
║  │ VIRAL POTENTIAL │  │  DESIGN QUALITY │                ║
║  │ AGENT           │  │  AGENT          │                ║
║  │                 │  │                 │                ║
║  │ • Hook strength │  │ • Color contrast│                ║
║  │ • First 3 secs  │  │ • Readability   │                ║
║  │ • Emotion hooks │  │ • Composition   │                ║
║  │ • Curiosity gap │  │ • Brand colors  │                ║
║  │ • Trend fit     │  │ • Typography    │                ║
║  │ Score: /100     │  │ Score: /100     │                ║
║  └────────┬────────┘  └────────┬────────┘                ║
║           │                   │                          ║
║  ┌────────▼────────┐  ┌────────▼────────┐                ║
║  │  UX/UI AGENT    │  │  BRAND VOICE    │                ║
║  │                 │  │  AGENT          │                ║
║  │ • Mobile UX     │  │                 │                ║
║  │ • Text sizing   │  │ • Tone match    │                ║
║  │ • Caption sync  │  │ • Hook patterns │                ║
║  │ • Scene pacing  │  │ • Style profile │                ║
║  │ • Transitions   │  │ • CTA clarity   │                ║
║  │ Score: /100     │  │ Score: /100     │                ║
║  └────────┬────────┘  └────────┬────────┘                ║
║           │                   │                          ║
║  ┌────────▼────────┐  ┌────────▼────────┐                ║
║  │ CONTENT STRAT.  │  │  PLATFORM       │                ║
║  │ AGENT           │  │  COMPLIANCE     │                ║
║  │                 │  │  AGENT          │                ║
║  │ • Niche align   │  │                 │                ║
║  │ • Hashtag mix   │  │ • Dimensions    │                ║
║  │ • Platform fit  │  │ • Duration      │                ║
║  │ • Funnel stage  │  │ • Audio levels  │                ║
║  │ • Growth angle  │  │ • Policy check  │                ║
║  │ Score: /100     │  │ Pass / Fail     │                ║
║  └────────┬────────┘  └────────┬────────┘                ║
║           └─────────┬─────────┘                          ║
║                     ▼                                    ║
║          ┌─────────────────────┐                         ║
║          │  MASTER REVIEW      │                         ║
║          │  AGENT              │                         ║
║          │                     │                         ║
║          │  Aggregates scores  │                         ║
║          │  Writes critique    │                         ║
║          │  Makes decision:    │                         ║
║          │                     │                         ║
║          │  ≥80 → APPROVE      │──────────────────────┐  ║
║          │  60-79 → REVISE ────┼──► back to pipeline  │  ║
║          │  <60 → REGENERATE ──┼──► fresh from prompt  │  ║
║          └─────────────────────┘                      │  ║
╚═══════════════════════════════════════════════════════╪══╝
                                                        │
                                                        ▼
                                          ┌─────────────────────┐
                                          │   PUBLISHER SERVICE  │
                                          │  TikTok  Instagram  │
                                          │  YouTube Twitter    │
                                          │  LinkedIn Facebook  │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  ANALYTICS LOOP      │
                                          │  Pull engagement     │
                                          │  Update Style Brain  │
                                          │  Improve agents      │
                                          └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SELF-HEAL ENGINE                          │
│  (wraps every service and agent call system-wide)           │
│  Error → Classify → Fallback/Patch → Verify → Log           │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Agent Review Council — Detail

### Agent Scoring Criteria

**Viral Potential Agent**
- Hook: does the first line create an immediate curiosity gap?
- First 3 seconds: would a scroller stop thumbing?
- Emotional trigger: fear of missing out, surprise, aspiration, relatability?
- Trend alignment: is this topic surging right now?
- Pattern match: does it mirror the structure of content currently going viral in the niche?

**Design Quality Agent** (references live design system in DB)
- WCAG contrast ratio on all text overlays (minimum 4.5:1)
- Font size readable at mobile screen size (≥24pt equivalent)
- Visual hierarchy: is the most important element the most prominent?
- Color palette matches brand system
- No visual clutter; rule of thirds composition on hero frame

**UX/UI Agent**
- Is the call-to-action visible within the first 60% of the video?
- Do captions appear before or simultaneous with the spoken word?
- Are scene cuts faster than 5 seconds (short-form UX expectation)?
- Is the thumbnail frame compelling as a static image?
- Does the pacing match the platform (TikTok faster, LinkedIn slower)?

**Brand Voice Agent**
- Tone score: does this match the brand's documented tone (bold/casual/expert)?
- Hook pattern: does the opening use one of the brand's proven hook formats?
- Vocabulary: any language that conflicts with brand positioning?
- CTA: is there one, and does it match the funnel stage (awareness/conversion)?

**Content Strategy Agent**
- Hashtag mix: 3 niche-specific + 2 trending + 1 brand?
- Platform-specific caption format applied?
- Does this piece serve a clear funnel stage (top/mid/bottom)?
- Posting cadence: is this topic too similar to the last 3 posts?
- Growth angle: does this have a reason for shares/saves beyond views?

**Platform Compliance Agent**
- Video: correct aspect ratio per platform (9:16 / 1:1 / 16:9)
- Duration within platform limits (TikTok ≤10min, Shorts ≤60s, etc.)
- Audio: normalized to -14 LUFS (platform standard)
- No copyrighted audio detected (frequency fingerprint check)
- Caption character limits per platform respected

### Decision Logic
```
composite_score = weighted avg of all agent scores
  Viral Weight:   30%
  Design Weight:  20%
  UX Weight:      15%
  Brand Weight:   20%
  Strategy Weight:15%

≥ 80: AUTO-APPROVE → publish queue
60–79: AUTO-REVISE → agent notes injected back into generation pipeline
       → max 2 revision rounds before escalating to REGENERATE
< 60:  REGENERATE  → enhanced prompt rewritten with agent critique baked in
```

### Design System Reference (stored in Supabase, kept current by agent)
```json
{
  "colors": { "primary": "", "secondary": "", "accent": "" },
  "typography": { "headline_size": "", "body_size": "", "font_family": "" },
  "contrast_minimum": 4.5,
  "platform_presets": {
    "tiktok":     { "ratio": "9:16", "max_duration": 600, "lufs": -14 },
    "reels":      { "ratio": "9:16", "max_duration": 90,  "lufs": -14 },
    "shorts":     { "ratio": "9:16", "max_duration": 60,  "lufs": -14 },
    "twitter":    { "ratio": "16:9", "max_duration": 140, "lufs": -14 },
    "linkedin":   { "ratio": "1:1",  "max_duration": 600, "lufs": -14 },
    "facebook":   { "ratio": "9:16", "max_duration": 240, "lufs": -14 }
  },
  "ux_rules": {
    "cta_position": "before_60_percent",
    "min_scene_duration_sec": 1.5,
    "max_scene_duration_sec": 5,
    "caption_sync": "simultaneous"
  }
}
```

---

## Self-Heal Engine

Every service call is wrapped in an error boundary:

1. **Capture**: error + stack + request context → `error_logs`
2. **Classify** (LLM): transient / rate-limit / platform-change / code-bug
3. **Fix by class**:
   - Transient → exponential backoff retry
   - Rate-limit → queue with delay + switch fallback service
   - Platform-change → LLM rewrites the platform adapter
   - Code-bug → LLM generates patch → confidence ≥ 90% auto-applies, else queued
4. **Verify**: re-run failed operation
5. **Log**: `self_improvements` table with before/after diff

### Fallback Chains
```
Images:    Pollinations.ai → HuggingFace SDXL → text-on-color card
Video:     CogVideoX → AnimateDiff → Ken Burns on images
Voice:     edge-tts → gTTS → silent + captions only
LLM:       Groq Llama 3.3 → Groq Llama 3.1 → Groq Mixtral
Post:      Retry ×3 with backoff → queue next window → log + alert
```

---

## Build Phases

### Phase 1 — Core Pipeline (MVP)
- [ ] Scaffold Next.js 14 + Tailwind + Supabase
- [ ] DB schema migration
- [ ] Dashboard shell: sidebar, nav, content calendar
- [ ] /generate page with Original → Enhanced prompt UI
- [ ] Prompt Intelligence Layer API route
- [ ] Script + scene generation API route (Groq)
- [ ] Pollinations.ai image API route
- [ ] edge-tts voiceover API route
- [ ] FFmpeg video assembly API route
- [ ] Supabase storage + video record
- [ ] /library page

### Phase 2 — Multi-Agent Review Council
- [ ] Agent runner service (calls agents in parallel, aggregates)
- [ ] Viral Potential Agent (Groq)
- [ ] Design Quality Agent (Groq + design system DB rules)
- [ ] UX/UI Agent (Groq + platform preset rules)
- [ ] Brand Voice Agent (Groq + style profile)
- [ ] Content Strategy Agent (Groq + analytics history)
- [ ] Platform Compliance Agent (FFprobe metadata check + rules)
- [ ] Master Review Agent (weighted score → approve/revise/regenerate)
- [ ] Auto-revision loop (agent notes → pipeline → re-review, max 2x)
- [ ] Design System editor UI in dashboard
- [ ] Review log UI: show per-agent scores + critique for every post

### Phase 3 — Style Brain + Trend Monitor
- [ ] Style profile table + editor UI
- [ ] Onboarding: niche + example content → LLM extracts style fingerprint
- [ ] Google Trends RSS cron
- [ ] Twitter/X trending topics fetch
- [ ] Topic scorer: LLM rates trends vs. niche + style

### Phase 4 — Self-Heal Engine
- [ ] Global error boundary for all service calls
- [ ] Error classifier LLM call
- [ ] Fallback chains per service
- [ ] Platform adapter auto-updater
- [ ] `self_improvements` + `pending_patches` tables
- [ ] Improvement log UI in dashboard

### Phase 5 — AI Video Clips + Editing
- [ ] HuggingFace CogVideoX
- [ ] Scene editor UI
- [ ] Caption burn-in FFmpeg
- [ ] Platform export presets

### Phase 6 — Social Platform Connections
- [ ] OAuth: all 6 platforms
- [ ] Platform-specific post adapters
- [ ] All 6 upload integrations

### Phase 7 — Fully Autonomous Loop
- [ ] Vercel Cron: daily generate + review + post
- [ ] Analytics ingestion from all platforms
- [ ] Style Brain reinforcement
- [ ] Agent scoring criteria self-improvement (analytics → update agent weights)
- [ ] Daily digest

---

## DB Schema (Supabase)

```sql
style_profiles    (id, niche, tone, hook_patterns, pacing, visual_style,
                   caption_format, hashtag_strategy, updated_at)
design_system     (id, colors, typography, contrast_min, platform_presets,
                   ux_rules, updated_at)
trend_signals     (id, platform, topic, score, fetched_at)
videos            (id, topic, original_prompt, enhanced_prompt, script,
                   style_profile_id, status, review_round, created_at)
scenes            (id, video_id, order, prompt, image_url, clip_url, duration)
voiceovers        (id, video_id, text, audio_url)
exports           (id, video_id, mp4_url, thumbnail_url, aspect_ratio)
agent_reviews     (id, video_id, agent_name, score, critique, round, created_at)
master_decisions  (id, video_id, composite_score, decision, notes, round, created_at)
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
