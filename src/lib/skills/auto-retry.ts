// Circuit breaker state (module-level, per-process)
const circuitState: Record<string, {
  failures: number
  lastFailureTime: number
  openUntil: number
}> = {}

const CIRCUIT_FAILURE_THRESHOLD = 5
const CIRCUIT_WINDOW_MS = 60_000   // 1 minute
const CIRCUIT_OPEN_DURATION_MS = 5 * 60_000 // 5 minutes

interface RetryOptions {
  retries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  jitter?: boolean
  circuitKey?: string
}

function getCircuit(key: string) {
  if (!circuitState[key]) {
    circuitState[key] = { failures: 0, lastFailureTime: 0, openUntil: 0 }
  }
  return circuitState[key]
}

function isCircuitOpen(key: string): boolean {
  const circuit = getCircuit(key)
  if (Date.now() < circuit.openUntil) return true
  // Reset if window has passed
  if (Date.now() - circuit.lastFailureTime > CIRCUIT_WINDOW_MS) {
    circuit.failures = 0
  }
  return false
}

function recordFailure(key: string): void {
  const circuit = getCircuit(key)
  circuit.failures += 1
  circuit.lastFailureTime = Date.now()
  if (circuit.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuit.openUntil = Date.now() + CIRCUIT_OPEN_DURATION_MS
    console.warn(`[auto-retry] Circuit open for "${key}" until ${new Date(circuit.openUntil).toISOString()}`)
  }
}

function recordSuccess(key: string): void {
  const circuit = getCircuit(key)
  circuit.failures = 0
  circuit.openUntil = 0
}

export async function withSmartRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 500,
    maxDelayMs = 16_000,
    jitter = true,
    circuitKey = 'default',
  } = options

  if (isCircuitOpen(circuitKey)) {
    throw new Error(`Circuit breaker open for "${circuitKey}". Too many recent failures.`)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await fn()
      recordSuccess(circuitKey)
      return result
    } catch (err) {
      lastError = err as Error
      recordFailure(circuitKey)

      if (attempt < retries - 1) {
        const exponential = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
        const delay = jitter
          ? exponential * (0.5 + Math.random() * 0.5)
          : exponential
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }

  throw lastError ?? new Error('withSmartRetry: all attempts failed')
}
