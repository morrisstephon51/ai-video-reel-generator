import { NextRequest, NextResponse } from 'next/server'
import { withResilience } from '@/lib/errors'

export const maxDuration = 60

// Pollinations.ai — completely free, no API key
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt'

function buildImageUrl(prompt: string, width = 1080, height = 1920) {
  const encoded = encodeURIComponent(
    `${prompt}, cinematic lighting, ultra high quality, 4k, professional photography, no text, no watermark`
  )
  return `${POLLINATIONS_BASE}/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true`
}

function buildPersonaUrl(prompt: string, personaUrl: string, width: number, height: number) {
  const encoded = encodeURIComponent(
    `The person from the reference image: ${prompt}. Keep the person's exact face and appearance, photorealistic, cinematic lighting, no text, no watermark`
  )
  return `${POLLINATIONS_BASE}/${encoded}?model=kontext&image=${encodeURIComponent(personaUrl)}&width=${width}&height=${height}&nologo=true`
}

export async function POST(req: NextRequest) {
  const { prompt, aspectRatio = '9:16', sceneIndex = 0, personaUrl } = await req.json()
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

  const dimensions: Record<string, { width: number; height: number }> = {
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
    '1:1':  { width: 1080, height: 1080 },
  }
  const { width, height } = dimensions[aspectRatio] ?? dimensions['9:16']

  // Add variation seed per scene so scenes look different
  const seed = Date.now() + sceneIndex * 1000

  // Pollinations generates the image during the HEAD check, so every attempt is time-bounded
  const verifyImage = async (url: string) => {
    const check = await fetch(url, { method: 'HEAD' })
    if (!check.ok) throw new Error(`Pollinations returned ${check.status}`)
    return url
  }

  const standardGeneration = () => withResilience(
    'generate-image-pollinations',
    () => verifyImage(`${buildImageUrl(prompt, width, height)}&seed=${seed}`),
    // Fallback: different style prompt
    async () => {
      const fallbackPrompt = encodeURIComponent(`${prompt}, digital art, vibrant colors`)
      return `${POLLINATIONS_BASE}/${fallbackPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed + 1}`
    },
    3,
    15_000
  )

  let imageUrl: string
  let persona = false
  if (personaUrl) {
    try {
      imageUrl = await withResilience(
        'generate-image-kontext',
        () => verifyImage(`${buildPersonaUrl(prompt, personaUrl, width, height)}&seed=${seed}`),
        undefined,
        1,
        30_000
      )
      persona = true
    } catch {
      imageUrl = await standardGeneration()
    }
  } else {
    imageUrl = await standardGeneration()
  }

  return NextResponse.json({ imageUrl, persona })
}
