import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const EXPORTS_PREFIX = 'exports/'

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const { action, videoId, ext, path } = await req.json()
    const db = createServiceClient()

    if (action === 'complete') {
      if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
      // Only allow paths within the known exports prefix to prevent path injection
      if (!path.startsWith(EXPORTS_PREFIX)) {
        return NextResponse.json({ error: 'invalid path' }, { status: 400 })
      }
      const { data: pub } = db.storage.from('videos').getPublicUrl(path)
      try {
        await db.from('exports').insert({ video_id: videoId ?? null, mp4_url: pub.publicUrl })
      } catch { /* exports row is nice-to-have */ }
      return NextResponse.json({ videoUrl: pub.publicUrl })
    }

    const safeExt = ext === 'mp4' ? 'mp4' : 'webm'
    const uploadPath = `${EXPORTS_PREFIX}${videoId ?? 'video'}-${Date.now()}.${safeExt}`
    const { data, error } = await db.storage.from('videos').createSignedUploadUrl(uploadPath)
    if (error) throw new Error(error.message)

    return NextResponse.json({ uploadUrl: data.signedUrl, path: uploadPath })
  } catch (err) {
    console.error('[upload-video]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
