import { chat } from '@/lib/groq'

export async function generateThumbnail(
  topic: string,
  style: string
): Promise<string> {
  // Use Groq to craft an optimized image generation prompt
  const raw = await chat(
    `You are a thumbnail prompt engineer. Create a highly optimized image generation prompt for Pollinations.ai.
    The thumbnail must be visually striking, CTR-optimized, and match the given style.
    Include: main subject, color palette, mood, composition, text overlay hints if appropriate.
    Respond in JSON: { "prompt": string }
    Prompt should be 50-100 words, no special characters that break URLs.`,
    `Topic: "${topic}"\nStyle: "${style}"`,
    true
  )

  const parsed = JSON.parse(raw) as { prompt: string }
  const imagePrompt = parsed.prompt ?? `${topic} eye-catching thumbnail, vibrant colors, professional design`

  // Encode for Pollinations.ai URL
  const encoded = encodeURIComponent(imagePrompt.slice(0, 500))
  return `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&nologo=true&seed=${Date.now()}`
}
