import { createServiceClient } from './supabase/server'
import { chat } from './groq'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorClass = 'transient' | 'rate_limit' | 'platform_change' | 'code_bug' | 'config'

export interface CapturedError {
  service: string
  message: string
  stack?: string
  context?: Record<string, unknown>
  severity?: ErrorSeverity
}

export async function captureError(err: CapturedError) {
  // Bail early when Supabase is not configured — calling classifyError (Groq) before
  // knowing we can persist the result wastes rate-limit quota on every caught exception.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[captureError] skipped (Supabase not configured):', err.service, err.message)
    return
  }
  try {
    const db = createServiceClient()
    const classified = await classifyError(err)
    await db.from('error_logs').insert({
      service:    err.service,
      error_type: classified.type,
      message:    err.message,
      stack:      err.stack ?? null,
      context:    err.context ?? null,
      severity:   err.severity ?? 'medium',
      resolved:   false,
    })
  } catch {
    // Never let error logging crash the app
    console.error('[captureError] failed to log:', err.message)
  }
}

async function classifyError(err: CapturedError): Promise<{ type: ErrorClass; suggestion: string }> {
  try {
    const raw = await chat(
      'You are a system reliability engineer. Classify this error and suggest a fix. Respond in JSON: { "type": "transient|rate_limit|platform_change|code_bug|config", "suggestion": "one sentence fix" }',
      `Service: ${err.service}\nError: ${err.message}\nStack: ${err.stack ?? 'none'}`,
      true
    )
    return JSON.parse(raw)
  } catch {
    return { type: 'transient', suggestion: 'Retry with exponential backoff' }
  }
}

// Wraps any async fn with error capture + exponential backoff retry
// timeoutMs bounds each individual attempt so one hung upstream call
// can't consume the whole function budget and starve the retries/fallback
export async function withResilience<T>(
  service: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>,
  retries = 3,
  timeoutMs?: number
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs)
    } catch (err) {
      lastError = err as Error
      // Fire-and-forget: classifyError makes an LLM call — never block the retry path on it
      void captureError({
        service,
        message: lastError.message,
        stack:   lastError.stack,
        severity: attempt === retries - 1 ? 'high' : 'low',
      })
      if (attempt < retries - 1) await sleep(Math.pow(2, attempt) * 500)
    }
  }
  if (fallback) return fallback()
  throw lastError
}

function withTimeout<T>(p: Promise<T>, ms?: number): Promise<T> {
  if (!ms) return p
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    p.then(
      v => { clearTimeout(timer); resolve(v) },
      e => { clearTimeout(timer); reject(e) }
    )
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
