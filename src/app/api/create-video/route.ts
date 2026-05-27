import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { original_prompt, enhanced_prompt, topic } = await req.json()
  if (!original_prompt) return NextResponse.json({ error: 'original_prompt required' }, { status: 400 })

  const db = createServiceClient()
  const { data, error } = await db.from('videos').insert({
    topic:           topic ?? original_prompt.slice(0, 100),
    original_prompt,
    enhanced_prompt: enhanced_prompt ?? null,
    status:          'generating',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: data?.id ?? null })
}
