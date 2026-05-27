import { chat } from '@/lib/groq'

const PLATFORM_NORMS: Record<string, string> = {
  tiktok:    'fast-paced, hook in first 1 second, casual Gen-Z tone, 60-90 words, trending references, energetic',
  instagram: 'visual-first, lifestyle tone, 80-120 words, polished but authentic, aspirational',
  youtube:   'educational depth, conversational, 300-500 words, clear structure, chapters hint, detailed explanations',
  twitter:   'punchy and witty, under 280 characters, strong opinion or surprising fact, max 1-2 hashtags',
  linkedin:  'professional insight, value-first, 150-250 words, story with a lesson, career/business focus',
  facebook:  'conversational, community-focused, 100-200 words, shareable, slightly emotional',
}

export async function repurposeForPlatform(
  script: string,
  from: string,
  to: string
): Promise<string> {
  if (from.toLowerCase() === to.toLowerCase()) return script

  const raw = await chat(
    `You are a content repurposing specialist. Rewrite this ${from} script for ${to}.
    Source platform norms (${from}): ${PLATFORM_NORMS[from.toLowerCase()] ?? 'general'}
    Target platform norms (${to}): ${PLATFORM_NORMS[to.toLowerCase()] ?? 'general'}
    Preserve the core message and key points while adapting tone, length, and style.
    Respond in JSON: { "repurposed": string }`,
    `Original ${from} script: "${script.slice(0, 800)}"`,
    true
  )

  const parsed = JSON.parse(raw) as { repurposed: string }
  return parsed.repurposed ?? script
}
