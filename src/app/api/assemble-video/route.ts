import { NextRequest, NextResponse } from 'next/server'

// FFmpeg binary does not work in Vercel serverless functions.
// Instead we return all assets so the browser can preview them
// as a synchronized slideshow — no server binary required.
export async function POST(req: NextRequest) {
  const { scenes, audioUrl, aspectRatio = '9:16' } = await req.json()
  if (!scenes?.length) return NextResponse.json({ error: 'scenes required' }, { status: 400 })

  // Just pass through the assets — preview is handled client-side
  return NextResponse.json({
    mp4Url: null,
    scenes,
    audioUrl: audioUrl ?? null,
    aspectRatio,
    previewMode: true,
  })
}
