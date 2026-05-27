import { chat } from '@/lib/groq'

// 1. Scores a single hook 0-100 for scroll-stopping power
export async function scoreHook(hook: string): Promise<number> {
  const raw = await chat(
    'You are a viral content scorer. Score this hook 0-100 for scroll-stopping power. Respond in JSON: { "score": number }',
    `Hook: "${hook}"`,
    true
  )
  const { score } = JSON.parse(raw) as { score: number }
  return Math.min(100, Math.max(0, score ?? 50))
}

// 2. Detects emotional triggers in text
export async function analyzeEmotion(
  text: string
): Promise<{ dominant: string; triggers: string[]; score: number }> {
  const raw = await chat(
    `You are an emotional intelligence analyst. Identify the dominant emotion, emotional triggers, and intensity score in the given text.
    Respond in JSON: { "dominant": string, "triggers": [string], "score": number }
    Score 0-100 represents emotional intensity.`,
    `Text: "${text}"`,
    true
  )
  const parsed = JSON.parse(raw) as { dominant: string; triggers: string[]; score: number }
  return {
    dominant: parsed.dominant ?? 'neutral',
    triggers: parsed.triggers ?? [],
    score: Math.min(100, Math.max(0, parsed.score ?? 50)),
  }
}

// 3. Flesch reading ease analysis
export async function checkReadability(
  caption: string
): Promise<{ score: number; issues: string[] }> {
  const raw = await chat(
    `You are a readability expert. Analyze the reading ease of this caption.
    Consider sentence length, word complexity, clarity, and flow.
    Respond in JSON: { "score": number, "issues": [string] }
    Score 0-100 where 100 = easiest to read.`,
    `Caption: "${caption}"`,
    true
  )
  const parsed = JSON.parse(raw) as { score: number; issues: string[] }
  return {
    score: Math.min(100, Math.max(0, parsed.score ?? 70)),
    issues: parsed.issues ?? [],
  }
}

// 4. Checks if scene timing is optimal for platform
export async function analyzePacing(
  scenes: Array<{ duration: number }>
): Promise<{ score: number; recommendation: string }> {
  const raw = await chat(
    `You are a video pacing expert. Analyze scene timing for optimal audience retention.
    Consider: scene variety, total duration, individual scene lengths, pacing rhythm.
    Respond in JSON: { "score": number, "recommendation": string }
    Score 0-100 where 100 = perfect pacing.`,
    `Scenes with durations (seconds): ${JSON.stringify(scenes)}`,
    true
  )
  const parsed = JSON.parse(raw) as { score: number; recommendation: string }
  return {
    score: Math.min(100, Math.max(0, parsed.score ?? 70)),
    recommendation: parsed.recommendation ?? 'Pacing looks acceptable.',
  }
}

// 5. CTA effectiveness scorer
export async function evaluateCTA(
  cta: string,
  funnel_stage: string
): Promise<{ score: number; improvement: string }> {
  const raw = await chat(
    `You are a conversion optimization expert. Evaluate this CTA for effectiveness at the given funnel stage.
    Funnel stage: ${funnel_stage}
    Consider: clarity, urgency, value proposition, action specificity.
    Respond in JSON: { "score": number, "improvement": string }
    Score 0-100 where 100 = perfect CTA.`,
    `CTA: "${cta}"`,
    true
  )
  const parsed = JSON.parse(raw) as { score: number; improvement: string }
  return {
    score: Math.min(100, Math.max(0, parsed.score ?? 60)),
    improvement: parsed.improvement ?? '',
  }
}

// 6. Trend fit score
export async function scoreTrendRelevance(
  topic: string,
  niche: string
): Promise<number> {
  const raw = await chat(
    `You are a trend relevance analyst. Score how well this topic fits the given niche on a scale of 0-100.
    Respond in JSON: { "score": number }`,
    `Topic: "${topic}"\nNiche: "${niche}"`,
    true
  )
  const { score } = JSON.parse(raw) as { score: number }
  return Math.min(100, Math.max(0, score ?? 50))
}

// 7. Brand voice consistency checker
export async function checkBrandConsistency(
  script: string,
  style_profile: Record<string, unknown>
): Promise<{ consistent: boolean; issues: string[] }> {
  const raw = await chat(
    `You are a brand voice guardian. Check if this script is consistent with the given style profile.
    Style profile: ${JSON.stringify(style_profile)}
    Respond in JSON: { "consistent": boolean, "issues": [string] }`,
    `Script: "${script.slice(0, 500)}"`,
    true
  )
  const parsed = JSON.parse(raw) as { consistent: boolean; issues: string[] }
  return {
    consistent: parsed.consistent ?? true,
    issues: parsed.issues ?? [],
  }
}

// 8. Rough engagement prediction
export async function predictEngagement(
  content: Record<string, unknown>
): Promise<{ views: number; likes: number; shares: number }> {
  const raw = await chat(
    `You are a social media engagement predictor. Estimate realistic engagement metrics for this content.
    Base predictions on an account with 1000-10000 followers.
    Respond in JSON: { "views": number, "likes": number, "shares": number }`,
    `Content: ${JSON.stringify(content).slice(0, 500)}`,
    true
  )
  const parsed = JSON.parse(raw) as { views: number; likes: number; shares: number }
  return {
    views: Math.max(0, parsed.views ?? 500),
    likes: Math.max(0, parsed.likes ?? 50),
    shares: Math.max(0, parsed.shares ?? 10),
  }
}

// 9. Rewrites script for platform norms
export async function adaptForPlatform(
  script: string,
  platform: string
): Promise<string> {
  const platformNorms: Record<string, string> = {
    tiktok: 'fast-paced, hook in 1s, casual Gen-Z tone, 15-60 seconds',
    instagram: 'visual-first, lifestyle tone, 30-90 seconds, polished but authentic',
    youtube: 'educational depth, 5-15 minutes, chapters, detailed explanations',
    twitter: 'punchy, under 280 chars, witty, strong opinion or fact',
    linkedin: 'professional insight, value-driven, story with a lesson',
    facebook: 'conversational, community-focused, shareable',
  }
  const raw = await chat(
    `You are a platform adaptation specialist. Rewrite this script to match ${platform} norms exactly.
    Platform norms: ${platformNorms[platform] ?? 'general social media'}
    Return only the rewritten script as a plain string.
    Respond in JSON: { "adapted_script": string }`,
    `Original script: "${script.slice(0, 800)}"`,
    true
  )
  const parsed = JSON.parse(raw) as { adapted_script: string }
  return parsed.adapted_script ?? script
}

// 10. Final pass/fail quality gate
export async function qualityGate(
  scores: Record<string, number>
): Promise<{ pass: boolean; overall: number; blockers: string[] }> {
  const values = Object.values(scores)
  const overall = values.length
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : 0

  const raw = await chat(
    `You are a quality assurance gatekeeper for video content. Given these quality scores, determine if the content passes or fails.
    Minimum passing score: 65 overall. Any individual score below 50 is a blocker.
    Respond in JSON: { "pass": boolean, "blockers": [string] }`,
    `Scores: ${JSON.stringify(scores)}\nOverall average: ${overall}`,
    true
  )
  const parsed = JSON.parse(raw) as { pass: boolean; blockers: string[] }
  return {
    pass: parsed.pass ?? overall >= 65,
    overall,
    blockers: parsed.blockers ?? [],
  }
}
