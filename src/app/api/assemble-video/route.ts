import { NextRequest, NextResponse } from 'next/server'
import { withResilience } from '@/lib/errors'
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

export async function POST(req: NextRequest) {
  const { videoId, scenes, audioUrl, aspectRatio = '9:16' } = await req.json()
  if (!scenes?.length) return NextResponse.json({ error: 'scenes required' }, { status: 400 })

  const result = await withResilience('assemble-video', async () => {
    const ffmpeg = (await import('fluent-ffmpeg')).default
    const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg')
    ffmpeg.setFfmpegPath(ffmpegInstaller.path)

    const tmpDir = path.join(os.tmpdir(), `video-${uuidv4()}`)
    await fs.mkdir(tmpDir, { recursive: true })

    const dimensions: Record<string, { w: number; h: number }> = {
      '9:16': { w: 1080, h: 1920 },
      '16:9': { w: 1920, h: 1080 },
      '1:1':  { w: 1080, h: 1080 },
    }
    const { w, h } = dimensions[aspectRatio] ?? dimensions['9:16']

    // Download each scene image
    const localImages: string[] = []
    for (let i = 0; i < scenes.length; i++) {
      const scene: Scene = scenes[i]
      const imgPath = path.join(tmpDir, `scene-${i}.jpg`)
      const res = await fetch(scene.imageUrl)
      const buf = Buffer.from(await res.arrayBuffer())
      await fs.writeFile(imgPath, buf)
      localImages.push(imgPath)
    }

    // Build ffmpeg concat input with durations
    const concatList = path.join(tmpDir, 'concat.txt')
    const lines = scenes.map((s: Scene, i: number) =>
      `file '${localImages[i]}'\nduration ${s.duration ?? 4}`
    )
    // Repeat last image once to avoid ffmpeg concat truncation
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
          '-preset fast',
          '-pix_fmt yuv420p',
          '-r 30',
        ])

      if (audioUrl) {
        cmd.input(audioUrl).outputOptions(['-c:a aac', '-shortest'])
      }

      cmd
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run()
    })

    const mp4Buffer = await fs.readFile(outputPath)

    // Clean up temp dir
    await fs.rm(tmpDir, { recursive: true, force: true })

    // Upload to Supabase storage
    const db = createServiceClient()
    const fileName = `export-${uuidv4()}.mp4`
    const { error } = await db.storage
      .from('videos')
      .upload(`exports/${fileName}`, mp4Buffer, { contentType: 'video/mp4', upsert: false })

    if (error) throw new Error(error.message)

    const { data: { publicUrl: mp4Url } } = db.storage
      .from('videos')
      .getPublicUrl(`exports/${fileName}`)

    if (videoId) {
      await db.from('exports').insert({
        video_id:     videoId,
        mp4_url:      mp4Url,
        aspect_ratio: aspectRatio,
      })
      await db.from('videos').update({ status: 'assembled' }).eq('id', videoId)
    }

    return { mp4Url }
  })

  return NextResponse.json(result)
}
