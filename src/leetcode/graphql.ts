/**
 * LeetCode GraphQL queries and types.
 *
 * LeetCode exposes an undocumented but stable GraphQL endpoint at:
 *   https://leetcode.com/graphql
 *
 * These queries are the same ones the LeetCode web app itself uses, making
 * them the most reliable approach available without an official public API.
 *
 * All queries are executed from the content script (leetcode.com origin),
 * so the user's session cookies are included automatically — no token needed.
 *
 * IMPORTANT: We never scrape DOM for submission data. We always use the
 * GraphQL API directly, making the extension resilient to UI redesigns.
 */

/** The GraphQL endpoint used by the LeetCode web application. */
export const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql/"

// ---------------------------------------------------------------------------
// Query: submission details
// ---------------------------------------------------------------------------

/**
 * Fetches full details for a submission by its numeric ID.
 *
 * Returns the source code, language, and status, plus a nested `question`
 * object with the problem's metadata.
 *
 * This query mirrors what LeetCode's own submission-detail page uses.
 */
export const SUBMISSION_DETAILS_QUERY = /* GraphQL */ `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      runtime
      runtimePercentile
      memory
      memoryPercentile
      code
      timestamp
      statusCode
      lang {
        name
        verboseName
      }
      question {
        questionId
        titleSlug
        title
        difficulty
        topicTags {
          name
        }
      }
      totalCorrect
      totalTestcases
    }
  }
`

// ---------------------------------------------------------------------------
// Raw response shapes (mirrors the GraphQL schema)
// ---------------------------------------------------------------------------

export interface SubmissionDetailsResponse {
  data: {
    submissionDetails: {
      runtime: string | null
      runtimePercentile: number | null
      memory: string | null
      memoryPercentile: number | null
      code: string
      timestamp: number
      statusCode: number
      lang: {
        name: string       // e.g. "cpp"
        verboseName: string // e.g. "C++"
      }
      question: {
        questionId: string // numeric string, e.g. "29"
        titleSlug: string
        title: string
        difficulty: string // "Easy" | "Medium" | "Hard"
        topicTags: { name: string }[]
      }
      totalCorrect: number
      totalTestcases: number
    } | null
  }
}

// ---------------------------------------------------------------------------
// Query executor
// ---------------------------------------------------------------------------

/**
 * Executes a GraphQL query against the LeetCode API.
 *
 * Must be called from a context with access to leetcode.com cookies
 * (i.e., from a content script injected into leetcode.com).
 *
 * @throws {Error} on HTTP failure or if the response contains GraphQL errors.
 */
export async function leetcodeGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // LeetCode's CSRF mechanism uses a header derived from the csrftoken cookie.
      // When running from a content script the cookie is automatically included
      // by the browser; the x-csrftoken header value mirrors the cookie value.
      "x-csrftoken": getCsrfToken()
    },
    credentials: "include", // send session cookies
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) {
    throw new Error(
      "LeetCode GraphQL HTTP error: " + response.status + " " + response.statusText
    )
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] }

  if (json.errors?.length) {
    throw new Error(
      "LeetCode GraphQL error: " + json.errors.map((e) => e.message).join("; ")
    )
  }

  if (!json.data) {
    throw new Error("LeetCode GraphQL returned no data")
  }

  return json.data
}

// ---------------------------------------------------------------------------
// CSRF token helper
// ---------------------------------------------------------------------------

/**
 * Reads the csrftoken cookie value from document.cookie.
 *
 * LeetCode sets this cookie on every page.  We echo it in the
 * x-csrftoken request header so LeetCode's CSRF middleware accepts
 * the request from our content script.
 */
function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ""
}
