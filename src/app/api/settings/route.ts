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
    const profile = await req.json()
    const db = createServiceClient()

    const { data: existing } = await db
      .from('style_profiles')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (existing?.id) {
      await db.from('style_profiles').update({ ...profile, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await db.from('style_profiles').insert({ ...profile })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[settings POST]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
