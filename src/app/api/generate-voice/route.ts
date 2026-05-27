import { NextRequest, NextResponse } from 'next/server'
import { withResilience } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

export async function POST(req: NextRequest) {
  const { text, videoId, voiceId = 'en-US-AriaNeural' } = await req.json()
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const audioUrl = await withResilience(
    'generate-voice',
    async () => {
      // Use node-gtts (Google TTS, free, no API key)
      const gTTS = (await import('node-gtts')).default
      const tmpFile = path.join(os.tmpdir(), `voice-${uuidv4()}.mp3`)

      await new Promise<void>((resolve, reject) => {
        const tts = gTTS('en')
        tts.save(tmpFile, text, (err: Error | null) => {
          if (err) reject(err)
          else resolve()
        })
      })

      const audioBuffer = await fs.readFile(tmpFile)
      await fs.unlink(tmpFile).catch(() => {})

      const db = createServiceClient()
      const fileName = `voice-${uuidv4()}.mp3`
      const { error } = await db.storage
        .from('videos')
        .upload(`voiceovers/${fileName}`, audioBuffer, { contentType: 'audio/mpeg', upsert: false })

      if (error) throw new Error(error.message)

      const { data: { publicUrl } } = db.storage
        .from('videos')
        .getPublicUrl(`voiceovers/${fileName}`)

      if (videoId) {
        await db.from('voiceovers').update({ audio_url: publicUrl }).eq('video_id', videoId)
      }

      return publicUrl
    },
    // Fallback: return null so video assembles without audio
    async () => null
  )

  return NextResponse.json({ audioUrl })
}
