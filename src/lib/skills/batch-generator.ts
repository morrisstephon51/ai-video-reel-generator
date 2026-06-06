interface BatchOptions {
  styleProfile?: Record<string, unknown>
  delayMs?: number
}

export async function batchGenerate(
  topics: string[],
  options: BatchOptions = {}
): Promise<string[]> {
  const { delayMs = 2000 } = options
  const videoIds: string[] = []

  for (const topic of topics) {
    try {
      // Step 1: Enhance prompt
      const enhanceRes = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: topic }),
      })
      const { enhanced } = await enhanceRes.json() as { enhanced: string }
      const finalPrompt = enhanced ?? topic

      // Step 2: Create video record
      const createRes = await fetch('/api/create-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_prompt: topic,
          enhanced_prompt: enhanced ?? null,
          topic: topic.slice(0, 100),
        }),
      })
      const { id: videoId } = await createRes.json() as { id: string }

      // Step 3: Generate script
      await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, videoId }),
      })

      videoIds.push(videoId)

      // Rate limit protection between topics
      if (delayMs > 0 && topics.indexOf(topic) < topics.length - 1) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    } catch (err) {
      console.error(`[batchGenerate] Failed for topic "${topic}":`, (err as Error).message)
      // Continue with remaining topics
    }
  }

  return videoIds
}
