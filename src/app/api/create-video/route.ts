import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const { original_prompt, enhanced_prompt, topic } = await req.json()
  if (!original_prompt) return NextResponse.json({ error: 'original_prompt required' }, { status: 400 })

  try {
    const db = createServiceClient()
    const { data, error } = await db.from('videos').insert({
      topic:           topic ?? original_prompt.slice(0, 100),
      original_prompt,
      enhanced_prompt: enhanced_prompt ?? null,
      status:          'generating',
    }).select('id').single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ id: data?.id, saved: true })
  } catch {
    // DB unavailable — return a local UUID so the pipeline still runs
    return NextResponse.json({ id: uuidv4(), saved: false })
  }
}
