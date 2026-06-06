import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { createServiceClient } from '@/lib/supabase/server'

const DEFAULT_STYLE = 'confident, bold, conversational tone. Hook patterns: "Did you know...", "The #1 mistake...", "Here\'s why..."'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  let styleContext = DEFAULT_STYLE
  try {
    const db = createServiceClient()
    const { data: profile } = await db
      .from('style_profiles')
      .select('tone, hook_patterns, niche')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    if (profile) {
      styleContext = `Brand tone: ${profile.tone}. Hook patterns: ${JSON.stringify(profile.hook_patterns)}. Niche: ${profile.niche}.`
    }
  } catch { /* use default style */ }

  try {
    const raw = await chat(
      `You are a viral content strategist. Enhance the user's content prompt for maximum virality WITHOUT removing any core ideas.

      ${styleContext}

      Rules:
      - Preserve every key idea from the original
      - Add a strong curiosity hook at the start
      - Layer in emotional triggers (FOMO, surprise, aspiration, relatability)
      - Make it specific and vivid, not generic
      - Keep it punchy — 1-3 sentences max

      Respond in JSON: { "enhanced": "...", "hook": "...", "reasoning": "..." }`,
      `Original prompt: "${prompt}"`,
      true
    )
    return NextResponse.json(JSON.parse(raw))
  } catch (err) {
    return NextResponse.json({ enhanced: prompt, hook: '', reasoning: 'Enhancement unavailable' })
  }
}
