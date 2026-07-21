/**
 * Submission detector — watches for accepted LeetCode submissions and
 * extracts full submission details via the GraphQL API.
 *
 * STRATEGY
 * ─────────
 * LeetCode is a React SPA. Submissions happen without a full page reload, so
 * we cannot rely on navigation events.  Instead we use two complementary
 * detection mechanisms that work together:
 *
 *   1. XHR / Fetch interception
 *      We wrap window.fetch so we can observe the JSON responses LeetCode's
 *      own code receives.  When the submission-check response reports
 *      status_msg === "Accepted", we extract the submission ID and fetch
 *      full details via the GraphQL API.
 *
 *   2. URL change observer
 *      LeetCode navigates to /submissions/detail/<id>/ on the result page.
 *      A MutationObserver on document watches for URL changes and triggers
 *      a detail fetch when we land on a submission detail URL.
 *
 * Both paths converge on fetchSubmissionDetails(), which pulls the canonical
 * data from GraphQL and returns a SubmissionDetail object.
 *
 * Only submissions with statusCode === 10 (Accepted) are forwarded.
 */

import { leetcodeGraphQL, SUBMISSION_DETAILS_QUERY } from "./graphql"
import type { SubmissionDetailsResponse } from "./graphql"
import type { SubmissionDetail } from "~types"
import { normaliseLanguage } from "~utils/language-map"

// ---------------------------------------------------------------------------
// LeetCode status codes (from their internal API)
// ---------------------------------------------------------------------------

/** LeetCode internal status code for "Accepted". */
const STATUS_ACCEPTED = 10

// ---------------------------------------------------------------------------
// Submission detail fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches full submission details from the LeetCode GraphQL API.
 *
 * @returns SubmissionDetail if the submission was Accepted, null otherwise.
 * @throws on network or GraphQL errors.
 */
export async function fetchSubmissionDetails(
  submissionId: string
): Promise<SubmissionDetail | null> {
  const numericId = parseInt(submissionId, 10)
  if (isNaN(numericId)) {
    console.warn("[LGS] Invalid submission ID:", submissionId)
    return null
  }

  const data = await leetcodeGraphQL<
    SubmissionDetailsResponse["data"]
  >(SUBMISSION_DETAILS_QUERY, { submissionId: numericId })

  const details = data.submissionDetails
  if (!details) return null

  // Only proceed for Accepted submissions
  if (details.statusCode !== STATUS_ACCEPTED) return null

  const question = details.question

  return {
    problemId: parseInt(question.questionId, 10),
    problemTitle: question.title,
    problemSlug: question.titleSlug,
    difficulty: question.difficulty as SubmissionDetail["difficulty"],
    language: normaliseLanguage(details.lang.name),
    code: details.code,
    submissionId: String(numericId),
    submittedAt: details.timestamp * 1000, // seconds → milliseconds
    runtime: details.runtime ?? "",
    memory: details.memory ?? "",
    tags: details.question.topicTags.map((t) => t.name)
  }
}

// ---------------------------------------------------------------------------
// Submission ID extraction helpers
// ---------------------------------------------------------------------------

/**
 * Attempts to extract a submission ID from the current page URL.
 *
 * LeetCode submission detail pages follow this pattern:
 *   https://leetcode.com/problems/<slug>/submissions/<id>/
 *   https://leetcode.com/submissions/detail/<id>/
 */
export function extractSubmissionIdFromUrl(url: string): string | null {
  // New-style URL: /problems/<slug>/submissions/<id>/
  const newStyle = url.match(/\/problems\/[^/]+\/submissions\/(\d+)/)
  if (newStyle) return newStyle[1]

  // Old-style URL: /submissions/detail/<id>/
  const oldStyle = url.match(/\/submissions\/detail\/(\d+)/)
  if (oldStyle) return oldStyle[1]

  return null
}

// ---------------------------------------------------------------------------
// Check-result response interceptor
// ---------------------------------------------------------------------------

/**
 * Shape of LeetCode's submission check polling response.
 * Only the fields we care about are typed here.
 */
interface CheckResultResponse {
  state?: string         // "SUCCESS" | "PENDING" | "STARTED"
  status_msg?: string    // "Accepted" | "Wrong Answer" | etc.
  status_code?: number   // 10 = Accepted
  submission_id?: string | number
}

type SubmissionCallback = (submission: SubmissionDetail) => void

/**
 * Patches window.fetch to intercept LeetCode's submission check polling.
 *
 * LeetCode polls an endpoint like:
 *   https://leetcode.com/submissions/detail/<id>/check/
 *   https://leetcode.com/problems/<slug>/submit/    (POST, returns submission id)
 *
 * When a completed "Accepted" result is detected, we call fetchSubmissionDetails
 * to get the full data and invoke the callback.
 *
 * Returns a cleanup function that restores the original fetch.
 */
export function interceptFetch(onAccepted: SubmissionCallback): () => void {
  const originalFetch = window.fetch.bind(window)

  // Track submission IDs we've already processed to avoid duplicate uploads
  const processedIds = new Set<string>()

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const response = await originalFetch(input, init)
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url

    // Only inspect LeetCode check-polling and submit responses
    if (isCheckUrl(url) || isSubmitUrl(url)) {
      console.info("[LGS] Intercepted submission endpoint:", url)
      // Clone the response so we can read it without consuming the stream
      const clone = response.clone()
      clone
        .json()
        .then((json: CheckResultResponse) => {
          console.info("[LGS] Submission response payload:", json)
          handleCheckResponse(json, processedIds, onAccepted)
        })
        .catch((err) => {
          console.debug("[LGS] Non-JSON or unparseable response:", err)
        })
    }

    return response
  }

  // Return cleanup so the content script can restore fetch on unload
  return () => {
    window.fetch = originalFetch
  }
}

/**
 * Handles a parsed LeetCode check-result JSON object.
 * Fires the callback if the result is a new Accepted submission.
 */
async function handleCheckResponse(
  json: CheckResultResponse,
  processedIds: Set<string>,
  onAccepted: SubmissionCallback
): Promise<void> {
  // Must be a completed successful state
  if (json.state !== "SUCCESS") {
    console.debug("[LGS] Submission state is not SUCCESS yet:", json.state)
    return
  }
  if (json.status_code !== STATUS_ACCEPTED && json.status_msg !== "Accepted") {
    console.info("[LGS] Submission was not Accepted (status:", json.status_msg || json.status_code, ")")
    return
  }

  const rawId = json.submission_id
  if (!rawId) {
    console.warn("[LGS] No submission_id found in SUCCESS payload:", json)
    return
  }
  const submissionId = String(rawId)

  // Deduplicate — the check endpoint is polled multiple times
  if (processedIds.has(submissionId)) return
  processedIds.add(submissionId)

  try {
    console.info("[LGS] Fetching submission details for ID:", submissionId)
    const detail = await fetchSubmissionDetails(submissionId)
    if (detail) {
      console.info("[LGS] Retrieved submission detail successfully for:", detail.problemTitle)
      onAccepted(detail)
    }
  } catch (err) {
    console.error("[LGS] Failed to fetch submission details:", err)
    processedIds.delete(submissionId) // allow retry on next poll
  }
}

// ---------------------------------------------------------------------------
// URL-change observer
// ---------------------------------------------------------------------------

/**
 * Watches for SPA navigation to submission detail pages.
 *
 * LeetCode uses the History API for navigation, so we observe both
 * popstate events and MutationObserver changes to detect URL transitions.
 *
 * Returns a cleanup function.
 */
export function watchUrlChanges(onAccepted: SubmissionCallback): () => void {
  const processedIds = new Set<string>()
  let lastUrl = location.href

  function checkCurrentUrl() {
    const current = location.href
    if (current === lastUrl) return
    lastUrl = current

    const submissionId = extractSubmissionIdFromUrl(current)
    if (!submissionId || processedIds.has(submissionId)) return
    processedIds.add(submissionId)

    fetchSubmissionDetails(submissionId)
      .then((detail) => {
        if (detail) onAccepted(detail)
      })
      .catch((err) => {
        console.error("[LGS] URL-change submission fetch error:", err)
        processedIds.delete(submissionId)
      })
  }

  // Listen for back/forward navigation
  window.addEventListener("popstate", checkCurrentUrl)

  // Observe DOM changes to catch pushState navigation (SPA routing)
  const observer = new MutationObserver(checkCurrentUrl)
  observer.observe(document.body, { childList: true, subtree: true })

  // Also patch history.pushState / replaceState
  const origPush = history.pushState.bind(history)
  const origReplace = history.replaceState.bind(history)

  history.pushState = function (...args) {
    origPush(...args)
    setTimeout(checkCurrentUrl, 100)
  }
  history.replaceState = function (...args) {
    origReplace(...args)
    setTimeout(checkCurrentUrl, 100)
  }

  return () => {
    window.removeEventListener("popstate", checkCurrentUrl)
    observer.disconnect()
    history.pushState = origPush
    history.replaceState = origReplace
  }
}

// ---------------------------------------------------------------------------
// URL pattern matchers
// ---------------------------------------------------------------------------

function isCheckUrl(url: string): boolean {
  return url.includes("/submissions/detail/") && url.includes("/check")
}

function isSubmitUrl(url: string): boolean {
  return url.includes("/problems/") && url.includes("/submit")
}
