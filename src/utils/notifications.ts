

import type { SubmissionDetail, UploadRecord } from "~types"
import { getDisplayName } from "./language-map"


const NOTIF_BASE = "lgs"

import iconUrlBase64 from "data-base64:../../assets/icon128.png"


const ICON_URL = iconUrlBase64





function create(
  id: string,
  title: string,
  message: string,
  contextMessage = ""
): void {
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: ICON_URL,
    title,
    message,
    contextMessage,
    priority: 1
  })
}






export function notifySuccess(record: UploadRecord): void {
  create(
    `${NOTIF_BASE}:success:${record.problemId}`,
    "✅ Solution uploaded",
    `${record.problemId}. ${record.problemTitle}`,
    `Language: ${getDisplayName(record.language)}`
  )
}


export function notifySkipped(submission: SubmissionDetail): void {
  create(
    `${NOTIF_BASE}:skipped:${submission.problemId}`,
    "Already synced",
    `${submission.problemId}. ${submission.problemTitle}`,
    `No changes detected — skipping upload`
  )
}


export function notifyError(title: string, message: string): void {
  create(`${NOTIF_BASE}:error`, `⚠️ ${title}`, message)
}


export function notifyAuthExpired(): void {
  create(
    `${NOTIF_BASE}:auth`,
    "GitHub authentication expired",
    "Please log in again to continue syncing solutions."
  )
}


export function notifyRateLimit(): void {
  create(
    `${NOTIF_BASE}:ratelimit`,
    "GitHub rate limit reached",
    "Upload will be retried automatically in a few minutes."
  )
}

export function notifyPendingApproach(submission: SubmissionDetail): void {
  create(
    `${NOTIF_BASE}:pending:${submission.problemId}`,
    "📝 Upload your approach",
    `${submission.problemId}. ${submission.problemTitle}`,
    "Auto-push paused until your approach is uploaded."
  )
}

