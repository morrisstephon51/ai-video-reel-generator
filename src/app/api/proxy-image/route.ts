import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

// Fetches an image URL server-side and returns the binary with CORS headers.
// This lets the browser use the image on a canvas without cross-origin tainting.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  try {
    const res = await fetch(decodeURIComponent(url), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoRenderer/1.0)' },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) throw new Error(`upstream ${res.status}`)

    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[proxy-image]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
