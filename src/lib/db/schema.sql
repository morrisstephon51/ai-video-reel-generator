-- Run this in your Supabase SQL editor at:
-- https://supabase.com/dashboard/project/bdltwswwxnzbdkmortai/sql/new

-- Style profile (the AI's learned brand voice)
create table if not exists style_profiles (
  id            uuid primary key default gen_random_uuid(),
  niche         text not null default '',
  tone          text not null default 'confident, conversational',
  hook_patterns jsonb not null default '[]',
  pacing        text not null default 'fast-cut, 3-5 seconds per scene',
  visual_style  text not null default 'clean, bold text overlays',
  caption_format text not null default 'short punchy line + bullets + CTA',
  hashtag_strategy text not null default '3 niche + 2 trending + 1 brand',
  updated_at    timestamptz not null default now()
);

-- Design system (UX/UI agent reference)
create table if not exists design_system (
  id              uuid primary key default gen_random_uuid(),
  colors          jsonb not null default '{}',
  typography      jsonb not null default '{}',
  contrast_min    numeric not null default 4.5,
  platform_presets jsonb not null default '{}',
  ux_rules        jsonb not null default '{}',
  updated_at      timestamptz not null default now()
);

-- Trend signals from monitoring
create table if not exists trend_signals (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,
  topic       text not null,
  score       numeric not null default 0,
  fetched_at  timestamptz not null default now()
);

-- Videos (main content entity)
create table if not exists videos (
  id               uuid primary key default gen_random_uuid(),
  topic            text not null,
  original_prompt  text not null,
  enhanced_prompt  text,
  script           text,
  style_profile_id uuid references style_profiles(id),
  status           text not null default 'draft',
  review_round     integer not null default 0,
  created_at       timestamptz not null default now()
);

-- Scenes within a video
create table if not exists scenes (
  id        uuid primary key default gen_random_uuid(),
  video_id  uuid not null references videos(id) on delete cascade,
  "order"   integer not null,
  prompt    text not null,
  image_url text,
  clip_url  text,
  duration  numeric not null default 4
);

-- Voiceover per video
create table if not exists voiceovers (
  id        uuid primary key default gen_random_uuid(),
  video_id  uuid not null references videos(id) on delete cascade,
  text      text not null,
  audio_url text
);

-- Assembled exports
create table if not exists exports (
  id           uuid primary key default gen_random_uuid(),
  video_id     uuid not null references videos(id) on delete cascade,
  mp4_url      text,
  thumbnail_url text,
  aspect_ratio text not null default '9:16'
);

-- Agent review scores per video per round
create table if not exists agent_reviews (
  id         uuid primary key default gen_random_uuid(),
  video_id   uuid not null references videos(id) on delete cascade,
  agent_name text not null,
  score      numeric not null,
  critique   text not null,
  round      integer not null default 1,
  created_at timestamptz not null default now()
);

-- Master review decisions
create table if not exists master_decisions (
  id              uuid primary key default gen_random_uuid(),
  video_id        uuid not null references videos(id) on delete cascade,
  composite_score numeric not null,
  decision        text not null, -- 'approve' | 'revise' | 'regenerate'
  notes           text,
  round           integer not null default 1,
  created_at      timestamptz not null default now()
);

-- Connected social platform accounts
create table if not exists platform_accounts (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz
);

-- Scheduled + posted content
create table if not exists scheduled_posts (
  id               uuid primary key default gen_random_uuid(),
  export_id        uuid not null references exports(id) on delete cascade,
  platform_id      uuid not null references platform_accounts(id) on delete cascade,
  scheduled_at     timestamptz not null,
  posted_at        timestamptz,
  status           text not null default 'queued', -- queued | posted | failed
  platform_post_id text
);

-- Analytics per post
create table if not exists post_analytics (
  id               uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid not null references scheduled_posts(id) on delete cascade,
  views            integer not null default 0,
  likes            integer not null default 0,
  shares           integer not null default 0,
  saves            integer not null default 0,
  comments         integer not null default 0,
  follows          integer not null default 0,
  fetched_at       timestamptz not null default now()
);

-- Topic bank for autonomous generation
create table if not exists topic_bank (
  id         uuid primary key default gen_random_uuid(),
  topic      text not null,
  niche      text,
  priority   integer not null default 5,
  source     text,
  used_at    timestamptz
);

-- Error logs (self-heal engine)
create table if not exists error_logs (
  id         uuid primary key default gen_random_uuid(),
  service    text not null,
  error_type text not null,
  message    text not null,
  stack      text,
  context    jsonb,
  severity   text not null default 'medium',
  resolved   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Self-improvement patches
create table if not exists self_improvements (
  id           uuid primary key default gen_random_uuid(),
  error_log_id uuid references error_logs(id),
  fix_type     text not null,
  patch_diff   text,
  confidence   numeric not null default 0,
  applied      boolean not null default false,
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Seed default style profile
insert into style_profiles (niche, tone, hook_patterns)
values (
  'AI / Tech / SaaS',
  'confident, bold, conversational',
  '["Did you know...", "The #1 mistake...", "Here''s why...", "Stop doing this...", "What nobody tells you about..."]'
) on conflict do nothing;

-- Seed default design system
insert into design_system (colors, typography, contrast_min, platform_presets, ux_rules)
values (
  '{"primary": "#0ea5e9", "secondary": "#7c3aed", "accent": "#f59e0b", "background": "#0f0f0f", "text": "#ffffff"}',
  '{"headline_size": "48px", "body_size": "24px", "font_weight": "700", "font_family": "Inter, sans-serif"}',
  4.5,
  '{
    "tiktok":   {"ratio": "9:16", "max_duration": 600, "lufs": -14, "width": 1080, "height": 1920},
    "reels":    {"ratio": "9:16", "max_duration": 90,  "lufs": -14, "width": 1080, "height": 1920},
    "shorts":   {"ratio": "9:16", "max_duration": 60,  "lufs": -14, "width": 1080, "height": 1920},
    "twitter":  {"ratio": "16:9", "max_duration": 140, "lufs": -14, "width": 1920, "height": 1080},
    "linkedin": {"ratio": "1:1",  "max_duration": 600, "lufs": -14, "width": 1080, "height": 1080},
    "facebook": {"ratio": "9:16", "max_duration": 240, "lufs": -14, "width": 1080, "height": 1920}
  }',
  '{"cta_position": "before_60_percent", "min_scene_duration_sec": 1.5, "max_scene_duration_sec": 5, "caption_sync": "simultaneous"}'
) on conflict do nothing;

-- Storage bucket for generated assets
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict do nothing;
