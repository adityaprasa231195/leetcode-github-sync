

export interface RetryOptions {
  
  maxAttempts?: number
  
  baseDelayMs?: number
  
  maxDelayMs?: number
  
  jitter?: number
  
  shouldRetry?: (error: unknown, attempt: number) => boolean
}


export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    jitter = 0.2,
    shouldRetry = () => true
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      if (attempt === maxAttempts || !shouldRetry(err, attempt)) {
        break
      }

      const exponential = baseDelayMs * 2 ** (attempt - 1)
      const capped = Math.min(exponential, maxDelayMs)
      const withJitter = capped * (1 + jitter * Math.random())
      await sleep(withJitter)
    }
  }

  throw lastError
}


export function isRetryableHttpError(error: unknown): boolean {
  if (error instanceof Error) {
    
    const status = (error as { status?: number }).status
    if (status === undefined) return true          
    if (status === 429) return true               
    if (status >= 500 && status < 600) return true 
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
