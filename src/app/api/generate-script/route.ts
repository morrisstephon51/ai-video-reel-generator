import { NextRequest, NextResponse } from 'next/server'
import { chat } from '@/lib/groq'
import { withResilience } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { prompt, videoId } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const db = createServiceClient()
  const { data: profile } = await db
    .from('style_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const result = await withResilience('generate-script', async () => {
    const raw = await chat(
      `You are a short-form video script writer for social media. Generate a complete script for a 30-60 second video.

      Style guide:
      - Tone: ${profile?.tone ?? 'confident, bold, conversational'}
      - Pacing: ${profile?.pacing ?? 'fast-cut, 3-5 seconds per scene'}
      - Caption format: ${profile?.caption_format ?? 'short punchy line + CTA'}
      - Hashtag strategy: ${profile?.hashtag_strategy ?? '3 niche + 2 trending + 1 brand'}

      Output JSON with this exact structure:
      {
        "title": "short punchy title",
        "hook": "first 3 seconds script — must stop the scroll",
        "voiceover": "full narration script (will be spoken aloud)",
        "scenes": [
          { "order": 1, "duration": 4, "visual_prompt": "describe what to show on screen in vivid detail for image generation", "caption": "on-screen text" }
        ],
        "captions": ["caption line 1", "caption line 2"],
        "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
        "cta": "call to action text"
      }

      Generate 5-8 scenes. Each visual_prompt should be a detailed image generation prompt.`,
      `Create a video about: "${prompt}"`,
      true
    )
    const script = JSON.parse(raw)

    if (videoId) {
      // Save scenes and voiceover to DB
      await db.from('videos').update({ script: script.voiceover }).eq('id', videoId)

      if (script.scenes?.length) {
        await db.from('scenes').insert(
          script.scenes.map((s: { order: number; duration: number; visual_prompt: string; caption: string }) => ({
            video_id: videoId,
            order:    s.order,
            prompt:   s.visual_prompt,
            duration: s.duration,
          }))
        )
      }

      if (script.voiceover) {
        await db.from('voiceovers').insert({ video_id: videoId, text: script.voiceover })
      }
    }

    return script
  })

  return NextResponse.json(result)
}
