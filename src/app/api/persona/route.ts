import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 30

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export async function GET() {
  try {
    const db = createServiceClient()
    const { data } = await db
      .from('personas')
      .select('id, name, image_url, description, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return NextResponse.json({ persona: data ?? null })
  } catch {
    return NextResponse.json({ persona: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imageDataUrl, name, description } = await req.json()
    if (!imageDataUrl?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUrl must be a data:image/* URL' }, { status: 400 })
    }

    const [meta, base64] = imageDataUrl.split(',')
    const mime = meta.slice(5, meta.indexOf(';'))
    const bytes = Buffer.from(base64, 'base64')
    if (bytes.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 4MB)' }, { status: 400 })
    }

    const db = createServiceClient()
    const ext = mime === 'image/png' ? 'png' : 'jpg'
    const path = `persona/${Date.now()}.${ext}`
    const { error: uploadError } = await db.storage
      .from('videos')
      .upload(path, bytes, { contentType: mime, upsert: true })
    if (uploadError) throw new Error(uploadError.message)

    const { data: pub } = db.storage.from('videos').getPublicUrl(path)
    const imageUrl = pub.publicUrl

    const { data, error } = await db
      .from('personas')
      .insert({ name: name ?? 'Me', image_url: imageUrl, description: description ?? null })
      .select('id, name, image_url')
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ persona: data })
  } catch (err) {
    console.error('[persona]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const db = createServiceClient()
    await db.from('personas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    return NextResponse.json({ deleted: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
