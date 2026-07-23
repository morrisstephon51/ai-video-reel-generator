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
    return NextResponse.json({ profile: data ?? null })
  } catch {
    return NextResponse.json({ profile: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const str = (v: unknown, max: number) =>
      typeof v === 'string' ? v.slice(0, max) : ''

    const row = {
      tone:              str(body.tone, 300),
      pacing:            str(body.pacing, 300),
      caption_format:    str(body.caption_format, 300),
      hashtag_strategy:  str(body.hashtag_strategy, 300),
      visual_style:      str(body.visual_style, 300),
      hook_style:        str(body.hook_style, 300),
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
