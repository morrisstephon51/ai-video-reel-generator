import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const db = createServiceClient()
    const { data } = await db
      .from('style_profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    if (!data) return NextResponse.json({ profile: null })
    // The form has a single free-text "Hook Style" field, but the column is
    // `hook_patterns` (jsonb array). Surface it back as the string the form reads.
    const profile = data as Record<string, unknown>
    const hp = profile.hook_patterns
    profile.hook_style = Array.isArray(hp)
      ? hp.join('\n')
      : typeof hp === 'string'
        ? hp
        : ''
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ profile: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const str = (v: unknown, max: number) =>
      typeof v === 'string' ? v.slice(0, max) : ''

    // The form sends a single-line "Hook Style" string, but the column is
    // `hook_patterns` (jsonb array). Writing `hook_style` 500'd every save
    // because that column does not exist (PGRST204). Translate to the real
    // column, splitting on newlines like /api/style-profile so multi-line
    // input is stored as an array.
    const hookPatterns = Array.isArray(body.hook_style)
      ? body.hook_style.map((h: unknown) => String(h).slice(0, 300))
      : String(body.hook_style ?? '')
          .split('\n')
          .map((h: string) => h.trim().slice(0, 300))
          .filter(Boolean)

    const row = {
      tone:              str(body.tone, 300),
      pacing:            str(body.pacing, 300),
      caption_format:    str(body.caption_format, 300),
      hashtag_strategy:  str(body.hashtag_strategy, 300),
      visual_style:      str(body.visual_style, 300),
      hook_patterns:     hookPatterns.slice(0, 12),
      updated_at:        new Date().toISOString(),
    }

    const db = createServiceClient()
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[settings POST]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
