import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

export async function POST(req: NextRequest) {
  const { text, videoId } = await req.json()
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  try {
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

    // Try Supabase storage — fall back to base64 if bucket doesn't exist
    let audioUrl: string
    try {
      const db = createServiceClient()
      const fileName = `voice-${uuidv4()}.mp3`
      const { error } = await db.storage
        .from('videos')
        .upload(`voiceovers/${fileName}`, audioBuffer, { contentType: 'audio/mpeg', upsert: false })

      if (error) throw new Error(error.message)

      const { data: { publicUrl } } = db.storage.from('videos').getPublicUrl(`voiceovers/${fileName}`)
      audioUrl = publicUrl

      if (videoId) {
        try { await db.from('voiceovers').update({ audio_url: audioUrl }).eq('video_id', videoId) } catch { /* non-critical */ }
      }
    } catch {
      // Storage unavailable — return base64 data URL directly
      audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`
    }

    return NextResponse.json({ audioUrl })
  } catch (err) {
    console.error('[generate-voice]', err)
    return NextResponse.json({ audioUrl: null, error: (err as Error).message })
  }
}
