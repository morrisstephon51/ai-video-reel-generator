import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const DEFAULTS = {
  niche: 'AI / Tech / SaaS',
  tone: 'confident, bold, conversational',
  pacing: 'fast-cut, 3-5 seconds per scene',
  visual_style: 'clean, bold text overlays',
  caption_format: 'short punchy line + bullets + CTA',
  hashtag_strategy: '3 niche + 2 trending + 1 brand',
  hook_patterns: ['Did you know...', 'The #1 mistake...', "Here's why...", 'Stop doing this...'],
}

export async function GET() {
  try {
    const db = createServiceClient()
    const { data } = await db
      .from('style_profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return NextResponse.json({ profile: data ?? DEFAULTS, saved: !!data })
  } catch {
    return NextResponse.json({ profile: DEFAULTS, saved: false })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const hookPatterns = Array.isArray(body.hook_patterns)
      ? body.hook_patterns
      : String(body.hook_patterns ?? '')
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean)

    const str = (v: unknown, fallback: string, max: number) =>
      (typeof v === 'string' && v.trim() ? v : fallback).slice(0, max)

    const row = {
      niche: str(body.niche, DEFAULTS.niche, 200),
      tone: str(body.tone, DEFAULTS.tone, 300),
      pacing: str(body.pacing, DEFAULTS.pacing, 300),
      visual_style: str(body.visual_style, DEFAULTS.visual_style, 300),
      caption_format: str(body.caption_format, DEFAULTS.caption_format, 300),
      hashtag_strategy: str(body.hashtag_strategy, DEFAULTS.hashtag_strategy, 300),
      hook_patterns: hookPatterns.slice(0, 12),
      updated_at: new Date().toISOString(),
    }

    const db = createServiceClient()
    // Keep a single active profile: update the newest row if one exists, else insert
    const { data: existing } = await db
      .from('style_profiles')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await db.from('style_profiles').update(row).eq('id', existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await db.from('style_profiles').insert(row)
      if (error) throw new Error(error.message)
    }

    return NextResponse.json({ profile: row, saved: true })
  } catch (err) {
    console.error('[style-profile]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
