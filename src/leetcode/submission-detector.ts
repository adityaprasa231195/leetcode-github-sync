

import { leetcodeGraphQL, SUBMISSION_DETAILS_QUERY } from "./graphql"
import type { SubmissionDetailsResponse } from "./graphql"
import type { SubmissionDetail } from "~types"
import { normaliseLanguage } from "~utils/language-map"






const STATUS_ACCEPTED = 10






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
    submittedAt: details.timestamp * 1000, 
    runtime: details.runtime ?? "",
    memory: details.memory ?? "",
    tags: details.question.topicTags.map((t) => t.name)
  }
}






export function extractSubmissionIdFromUrl(url: string): string | null {
  
  const newStyle = url.match(/\/problems\/[^/]+\/submissions\/(\d+)/)
  if (newStyle) return newStyle[1]

  
  const oldStyle = url.match(/\/submissions\/detail\/(\d+)/)
  if (oldStyle) return oldStyle[1]

  return null
}






interface CheckResultResponse {
  state?: string         
  status_msg?: string    
  status_code?: number   
  submission_id?: string | number
}

type SubmissionCallback = (submission: SubmissionDetail) => void


export function interceptFetch(onAccepted: SubmissionCallback): () => void {
  const originalFetch = window.fetch.bind(window)

  
  const processedIds = new Set<string>()

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const response = await originalFetch(input, init)
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url

    
    if (isCheckUrl(url) || isSubmitUrl(url)) {
      console.info("[LGS] Intercepted submission endpoint:", url)
      
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

  
  return () => {
    window.fetch = originalFetch
  }
}


async function handleCheckResponse(
  json: CheckResultResponse,
  processedIds: Set<string>,
  onAccepted: SubmissionCallback
): Promise<void> {
  
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
    processedIds.delete(submissionId) 
  }
}






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

  
  window.addEventListener("popstate", checkCurrentUrl)

  
  const observer = new MutationObserver(checkCurrentUrl)
  observer.observe(document.body, { childList: true, subtree: true })

  
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





function isCheckUrl(url: string): boolean {
  return url.includes("/submissions/detail/") && url.includes("/check")
}

function isSubmitUrl(url: string): boolean {
  return url.includes("/problems/") && url.includes("/submit")
}
