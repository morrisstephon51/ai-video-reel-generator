import { NextRequest, NextResponse } from 'next/server'
import { withResilience } from '@/lib/errors'

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

  const imageUrl = await withResilience(
    'generate-image-pollinations',
    async () => {
      const url = personaUrl
        ? `${buildPersonaUrl(prompt, personaUrl, width, height)}&seed=${seed}`
        : `${buildImageUrl(prompt, width, height)}&seed=${seed}`
      // Verify the image endpoint responds
      const check = await fetch(url, { method: 'HEAD' })
      if (!check.ok) throw new Error(`Pollinations returned ${check.status}`)
      return url
    },
    // Fallback: different style prompt
    async () => {
      const fallbackPrompt = encodeURIComponent(`${prompt}, digital art, vibrant colors`)
      return `${POLLINATIONS_BASE}/${fallbackPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed + 1}`
    }
  )

  return NextResponse.json({ imageUrl })
}
