import Groq from 'groq-sdk'

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function chat(
  systemPrompt: string,
  userMessage: string,
  jsonMode = false
): Promise<string> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 2048,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  })
  return response.choices[0]?.message?.content ?? ''
}
