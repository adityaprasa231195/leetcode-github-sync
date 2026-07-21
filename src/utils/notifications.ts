/**
 * Browser notification helpers.
 *
 * Wraps chrome.notifications (available in service workers / background
 * scripts under the "notifications" manifest permission).
 *
 * All notifications use the extension's icon and a consistent ID scheme so
 * that rapid-fire notifications replace rather than stack.
 */

import type { SubmissionDetail, UploadRecord } from "~types"
import { getDisplayName } from "./language-map"

/** Base notification ID — a suffix is appended per notification type. */
const NOTIF_BASE = "lgs"

/** Icon path relative to the extension root (Plasmo copies assets/). */
const ICON_URL = chrome.runtime.getURL("assets/icon128.png")

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public notification functions
// ---------------------------------------------------------------------------

/**
 * Shows a success notification after uploading a solution.
 */
export function notifySuccess(record: UploadRecord): void {
  create(
    `${NOTIF_BASE}:success:${record.problemId}`,
    "✅ Solution uploaded",
    `${record.problemId}. ${record.problemTitle}`,
    `Language: ${getDisplayName(record.language)}`
  )
}

/**
 * Shows a "skipped" notification when the file is already in sync.
 */
export function notifySkipped(submission: SubmissionDetail): void {
  create(
    `${NOTIF_BASE}:skipped:${submission.problemId}`,
    "Already synced",
    `${submission.problemId}. ${submission.problemTitle}`,
    `No changes detected — skipping upload`
  )
}

/**
 * Shows an error notification.
 */
export function notifyError(title: string, message: string): void {
  create(`${NOTIF_BASE}:error`, `⚠️ ${title}`, message)
}

/**
 * Shows an authentication-expired notification.
 */
export function notifyAuthExpired(): void {
  create(
    `${NOTIF_BASE}:auth`,
    "GitHub authentication expired",
    "Please log in again to continue syncing solutions."
  )
}

/**
 * Shows a rate-limit warning.
 */
export function notifyRateLimit(): void {
  create(
    `${NOTIF_BASE}:ratelimit`,
    "GitHub rate limit reached",
    "Upload will be retried automatically in a few minutes."
  )
}
