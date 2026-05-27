import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

interface Scene {
  imageUrl: string
  duration: number
  caption?: string
}

async function buildVideo(scenes: Scene[], audioUrl: string | null, w: number, h: number): Promise<Buffer> {
  const ffmpeg = (await import('fluent-ffmpeg')).default
  const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
  ffmpeg.setFfmpegPath(ffmpegInstaller.path)

  const tmpDir = path.join(os.tmpdir(), `video-${uuidv4()}`)
  await fs.mkdir(tmpDir, { recursive: true })

  const localImages: string[] = []
  for (let i = 0; i < scenes.length; i++) {
    const imgPath = path.join(tmpDir, `scene-${i}.jpg`)
    const res = await fetch(scenes[i].imageUrl)
    if (!res.ok) throw new Error(`Failed to fetch scene ${i} image`)
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.writeFile(imgPath, buf)
    localImages.push(imgPath)
  }

  const concatList = path.join(tmpDir, 'concat.txt')
  const lines = scenes.map((s, i) => `file '${localImages[i]}'\nduration ${s.duration ?? 4}`)
  lines.push(`file '${localImages[localImages.length - 1]}'`)
  await fs.writeFile(concatList, lines.join('\n'))

  const outputPath = path.join(tmpDir, 'output.mp4')

  await new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg()
      .input(concatList)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        `-vf scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`,
        '-c:v libx264',
        '-preset superfast',
        '-b:v 600k',
        '-maxrate 800k',
        '-pix_fmt yuv420p',
        '-r 24',
      ])

    if (audioUrl && !audioUrl.startsWith('data:')) {
      cmd.input(audioUrl).outputOptions(['-c:a aac', '-b:a 96k', '-shortest'])
    }

    cmd
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run()
  })

  const buffer = await fs.readFile(outputPath)
  await fs.rm(tmpDir, { recursive: true, force: true })
  return buffer
}

export async function POST(req: NextRequest) {
  const { videoId, scenes, audioUrl, aspectRatio = '9:16' } = await req.json()
  if (!scenes?.length) return NextResponse.json({ error: 'scenes required' }, { status: 400 })

  // Use smaller resolution so base64 fallback stays manageable
  const dimensions: Record<string, { w: number; h: number }> = {
    '9:16': { w: 540, h: 960  },
    '16:9': { w: 960, h: 540  },
    '1:1':  { w: 720, h: 720  },
  }
  const { w, h } = dimensions[aspectRatio] ?? dimensions['9:16']

  try {
    const mp4Buffer = await buildVideo(scenes, audioUrl, w, h)

    // Try Supabase storage first
    try {
      const db = createServiceClient()
      const fileName = `export-${uuidv4()}.mp4`
      const { error } = await db.storage
        .from('videos')
        .upload(`exports/${fileName}`, mp4Buffer, { contentType: 'video/mp4', upsert: false })

      if (error) throw new Error(error.message)

      const { data: { publicUrl: mp4Url } } = db.storage.from('videos').getPublicUrl(`exports/${fileName}`)

      if (videoId) {
        try { await db.from('exports').insert({ video_id: videoId, mp4_url: mp4Url, aspect_ratio: aspectRatio }) } catch { /* non-critical */ }
        try { await db.from('videos').update({ status: 'assembled' }).eq('id', videoId) } catch { /* non-critical */ }
      }

      return NextResponse.json({ mp4Url, source: 'storage' })
    } catch {
      // Storage unavailable — return base64 data URL so preview still works
      const base64 = mp4Buffer.toString('base64')
      const mp4Url = `data:video/mp4;base64,${base64}`
      return NextResponse.json({ mp4Url, source: 'base64' })
    }
  } catch (err) {
    console.error('[assemble-video]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
