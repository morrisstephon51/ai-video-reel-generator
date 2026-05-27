import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const db = createServiceClient()
  const { data: profile } = await db
    .from('style_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const styleContext = profile
    ? `Brand tone: ${profile.tone}. Hook patterns: ${JSON.stringify(profile.hook_patterns)}. Niche: ${profile.niche}.`
    : 'No style profile yet — use a bold, confident, conversational tone.'

  const result = await withResilience('enhance-prompt', async () => {
    const raw = await chat(
      `You are a viral content strategist. Your job is to enhance a user's content prompt for maximum virality and engagement — WITHOUT removing or replacing any of their core ideas.

      ${styleContext}

      Rules:
      - Preserve every key idea from the original
      - Add a strong curiosity hook at the start
      - Layer in emotional triggers (FOMO, surprise, aspiration, relatability)
      - Make it specific and vivid, not generic
      - Keep it punchy — the enhanced prompt should be 1-3 sentences

      Respond in JSON: { "enhanced": "...", "hook": "...", "reasoning": "..." }`,
      `Original prompt: "${prompt}"`,
      true
    )
    return JSON.parse(raw)
  })

  return NextResponse.json(result)
}
