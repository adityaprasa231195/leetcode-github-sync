/**
 * Generic exponential-backoff retry utility.
 *
 * Used when calling the GitHub API (rate limits, transient 5xx errors) and
 * when polling LeetCode for submission results.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number
  /** Base delay in milliseconds. Default: 500 */
  baseDelayMs?: number
  /** Maximum delay cap in milliseconds. Default: 10_000 */
  maxDelayMs?: number
  /** Jitter factor 0–1 added to each delay to avoid thundering herd. Default: 0.2 */
  jitter?: number
  /** Predicate to decide whether to retry for a given error. Default: always retry. */
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

/**
 * Executes `fn` with exponential backoff on failure.
 *
 * @throws The last error if all attempts are exhausted.
 */
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

/** Returns true when the error looks like a transient HTTP error worth retrying. */
export function isRetryableHttpError(error: unknown): boolean {
  if (error instanceof Error) {
    // Octokit wraps HTTP errors with a `status` property
    const status = (error as { status?: number }).status
    if (status === undefined) return true          // network-level error
    if (status === 429) return true               // rate limited
    if (status >= 500 && status < 600) return true // server errors
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
