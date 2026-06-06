import { chat } from '@/lib/groq'

export interface StyleProfile {
  tone: string
  hooks: string[]
  pacing: string
  vocabulary_level: string
  emotional_triggers: string[]
  sentence_structure: string
  cta_style: string
  niche?: string
}

export async function extractStyleFromText(examples: string[]): Promise<StyleProfile> {
  if (!examples.length) {
    return {
      tone: 'neutral',
      hooks: [],
      pacing: 'moderate',
      vocabulary_level: 'conversational',
      emotional_triggers: [],
      sentence_structure: 'mixed',
      cta_style: 'soft',
    }
  }

  const raw = await chat(
    `You are a brand voice analyst. Analyze these content examples and extract a style profile.
    Respond in JSON: {
      "tone": string,
      "hooks": [string],
      "pacing": string,
      "vocabulary_level": string,
      "emotional_triggers": [string],
      "sentence_structure": string,
      "cta_style": string,
      "niche": string
    }
    tone: e.g. "professional", "casual", "authoritative", "friendly"
    hooks: list of hook patterns observed
    pacing: "fast", "moderate", "slow"
    vocabulary_level: "simple", "conversational", "technical"
    emotional_triggers: emotions the content targets
    sentence_structure: "short and punchy", "long and detailed", "mixed"
    cta_style: "soft", "direct", "urgency-based"`,
    `Content examples:\n${examples.slice(0, 5).map((e, i) => `Example ${i + 1}:\n${e.slice(0, 300)}`).join('\n\n')}`,
    true
  )

  const parsed = JSON.parse(raw) as StyleProfile
  return {
    tone: parsed.tone ?? 'neutral',
    hooks: parsed.hooks ?? [],
    pacing: parsed.pacing ?? 'moderate',
    vocabulary_level: parsed.vocabulary_level ?? 'conversational',
    emotional_triggers: parsed.emotional_triggers ?? [],
    sentence_structure: parsed.sentence_structure ?? 'mixed',
    cta_style: parsed.cta_style ?? 'soft',
    niche: parsed.niche,
  }
}
