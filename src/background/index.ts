/**
 * Background Service Worker — the brain of the extension.
 *
 * In Manifest V3, the background page is replaced by a service worker.
 * Plasmo automatically registers this file as the background script when it
 * lives at src/background/index.ts.
 *
 * Responsibilities
 * ─────────────────
 * • Receive SUBMISSION_ACCEPTED messages from the content script.
 * • Orchestrate the full upload pipeline:
 *     validate settings → fetch settings/repo → build paths →
 *     upsert solution file → upsert README → record history → notify.
 * • Handle all other message types from the popup and options page
 *   (GET_STATUS, TRIGGER_OAUTH, LOGOUT, GET_REPOS, SET_REPO, etc.).
 * • Retry failed uploads via chrome.alarms (service workers cannot use
 *   setInterval as they may be suspended).
 *
 * Message protocol
 * ─────────────────
 * All messages conform to ExtensionMessage<T>.
 * All responses conform to ExtensionResponse<T>.
 * Handlers return true from onMessage to keep the channel open for
 * async responses (required by Chrome's messaging API).
 */

import { upsertFile } from "~github/api"
import { authenticateWithPAT, initiateOAuthFlow, logout } from "~github/oauth"
import { generateReadme } from "~leetcode/readme-generator"
import {
  addUploadRecord,
  clearAll,
  clearSelectedRepo,
  clearUploadHistory,
  getCredentials,
  getSelectedRepo,
  getSettings,
  getUploadHistory,
  setSelectedRepo,
  setSettings
} from "~storage"
import type {
  ExtensionMessage,
  ExtensionResponse,
  ExtensionStatus,
  GitHubRepo,
  SubmissionDetail,
  UploadRecord
} from "~types"
import { buildCommitMessage, buildReadmeCommitMessage } from "~utils/commit-message"
import { listRepositories } from "~github/api"
import {
  notifyAuthExpired,
  notifyError,
  notifyRateLimit,
  notifySkipped,
  notifySuccess
} from "~utils/notifications"
import { readmePath, solutionPath } from "~utils/path"

// ---------------------------------------------------------------------------
// Pending-retry queue
// Submissions that failed are stored here and retried via chrome.alarms.
// In a real production build you'd persist this queue to storage.
// ---------------------------------------------------------------------------

interface PendingUpload {
  submission: SubmissionDetail
  attempts: number
  nextRetryAt: number
}

const pendingQueue: PendingUpload[] = []
const ALARM_NAME = "lgs:retry"
const MAX_RETRY_ATTEMPTS = 5

// ---------------------------------------------------------------------------
// Core upload pipeline
// ---------------------------------------------------------------------------

/**
 * Full upload pipeline for a single accepted submission.
 *
 * Steps:
 *   1. Check settings — is auto-sync enabled?
 *   2. Ensure the user is authenticated.
 *   3. Ensure a repository is selected.
 *   4. Build the solution file path.
 *   5. Upsert the solution file (skip if identical).
 *   6. Optionally upsert the README.md.
 *   7. Record the upload in history.
 *   8. Show a browser notification.
 */
async function uploadSubmission(
  submission: SubmissionDetail
): Promise<UploadRecord> {
  const settings = await getSettings()

  if (!settings.autoSyncEnabled) {
    return makeRecord(submission, "skipped", "Auto-sync is disabled")
  }

  const credentials = await getCredentials()
  if (!credentials?.accessToken) {
    if (settings.notificationsEnabled) notifyAuthExpired()
    throw new Error("Not authenticated")
  }

  // Check token hasn't expired (PATs don't have expiry but OAuth tokens might)
  if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
    if (settings.notificationsEnabled) notifyAuthExpired()
    throw new Error("GitHub token has expired — please log in again")
  }

  const repo = await getSelectedRepo()
  if (!repo) {
    throw new Error("No repository selected")
  }

  const filePath = solutionPath(
    settings.repoFolder,
    submission.problemId,
    submission.problemTitle,
    submission.language
  )

  const commitMsg = buildCommitMessage(submission, false /* will be overridden by upsert */)

  // Upsert solution file
  const result = await upsertFile(
    repo.owner,
    repo.name,
    filePath,
    submission.code,
    commitMsg,
    repo.defaultBranch
  )

  if (result.status === "skipped") {
    const record = makeRecord(submission, "skipped", result.reason)
    await addUploadRecord(record)
    if (settings.notificationsEnabled) notifySkipped(submission)
    return record
  }

  const record = makeRecord(submission, "success", undefined, result.fileUrl)
  await addUploadRecord(record)

  // Upsert README.md (optional, per settings)
  if (settings.generateReadme) {
    const history = await getUploadHistory()
    const priorUploads = history.filter(
      (r) => r.problemId === submission.problemId && r.status === "success"
    )
    const readmeContent = generateReadme(submission, priorUploads)
    const rmPath = readmePath(
      settings.repoFolder,
      submission.problemId,
      submission.problemTitle
    )
    const readmeCommitMsg = buildReadmeCommitMessage(submission)

    // README failures are non-fatal — log but don't block the success record
    await upsertFile(
      repo.owner,
      repo.name,
      rmPath,
      readmeContent,
      readmeCommitMsg,
      repo.defaultBranch
    ).catch((err) => {
      console.error("[LGS] README upsert failed:", err)
    })
  }

  if (settings.notificationsEnabled) notifySuccess(record)
  return record
}

// ---------------------------------------------------------------------------
// Retry logic via chrome.alarms
// ---------------------------------------------------------------------------

/** Schedules a retry alarm if there are pending uploads. */
function scheduleRetry(): void {
  if (pendingQueue.length === 0) return
  const earliest = Math.min(...pendingQueue.map((p) => p.nextRetryAt))
  const delayMinutes = Math.max(1, (earliest - Date.now()) / 60_000)
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: delayMinutes })
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return

  const now = Date.now()
  const due = pendingQueue.filter((p) => p.nextRetryAt <= now)

  for (const pending of due) {
    pendingQueue.splice(pendingQueue.indexOf(pending), 1)
    try {
      await uploadSubmission(pending.submission)
    } catch {
      pending.attempts++
      if (pending.attempts < MAX_RETRY_ATTEMPTS) {
        const backoff = Math.min(30, 2 ** pending.attempts) // minutes
        pending.nextRetryAt = Date.now() + backoff * 60_000
        pendingQueue.push(pending)
      }
    }
  }

  scheduleRetry()
})

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

type MessageSender = chrome.runtime.MessageSender
type SendResponse = (response: ExtensionResponse) => void

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: MessageSender,
    sendResponse: SendResponse
  ): boolean => {
    handleMessage(message)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => {
        console.error("[LGS] Message handler error:", message.type, err)
        const errMsg = err instanceof Error ? err.message : String(err)

        // Surface specific error classes as typed notifications
        if (errMsg.includes("rate limit") || errMsg.includes("429")) {
          notifyRateLimit()
        } else if (
          errMsg.includes("token") ||
          errMsg.includes("401") ||
          errMsg.includes("credentials")
        ) {
          notifyAuthExpired()
        } else {
          notifyError("Upload failed", errMsg)
        }

        sendResponse({ success: false, error: errMsg })
      })

    // Return true to keep the message channel open for the async response
    return true
  }
)

async function handleMessage(
  message: ExtensionMessage
): Promise<unknown> {
  switch (message.type) {
    // ── Submission from content script ──────────────────────────────────────
    case "SUBMISSION_ACCEPTED": {
      const submission = message.payload as SubmissionDetail
      try {
        return await uploadSubmission(submission)
      } catch (err) {
        // Queue for retry
        pendingQueue.push({
          submission,
          attempts: 1,
          nextRetryAt: Date.now() + 2 * 60_000 // first retry in 2 min
        })
        scheduleRetry()
        throw err
      }
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    case "TRIGGER_OAUTH": {
      // payload may optionally be a PAT string for PAT-based auth
      const pat = (message.payload as { pat?: string } | undefined)?.pat
      if (pat) {
        return await authenticateWithPAT(pat)
      }
      return await initiateOAuthFlow()
    }

    case "LOGOUT": {
      await logout()
      await clearAll()
      return null
    }

    // ── Status snapshot ───────────────────────────────────────────────────────
    case "GET_STATUS": {
      const [credentials, selectedRepo, settings, history] = await Promise.all([
        getCredentials(),
        getSelectedRepo(),
        getSettings(),
        getUploadHistory()
      ])
      const status: ExtensionStatus = {
        isAuthenticated: !!credentials?.accessToken,
        credentials: credentials ?? undefined,
        selectedRepo: selectedRepo ?? undefined,
        settings,
        lastUpload: history[0]
      }
      return status
    }

    // ── Repository management ─────────────────────────────────────────────────
    case "GET_REPOS": {
      return await listRepositories()
    }

    case "SET_REPO": {
      const repo = message.payload as GitHubRepo
      await setSelectedRepo(repo)
      return repo
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    case "GET_SETTINGS": {
      return await getSettings()
    }

    case "SET_SETTINGS": {
      const partial = message.payload as Partial<import("~types").ExtensionSettings>
      await setSettings(partial)
      return await getSettings()
    }

    // ── History ───────────────────────────────────────────────────────────────
    case "GET_UPLOAD_HISTORY": {
      return await getUploadHistory()
    }

    case "CLEAR_HISTORY": {
      await clearUploadHistory()
      return null
    }

    // ── Reset repo ────────────────────────────────────────────────────────────
    case "MANUAL_SYNC": {
      // Placeholder: manual sync would iterate recent accepted submissions.
      // Full implementation would require storing accepted-but-not-uploaded
      // submissions or re-fetching from the LeetCode API, which requires
      // scraping the user's submission history — outside our current scope.
      // We surface this as a UI trigger for now.
      return { message: "Manual sync triggered — check the LeetCode tab" }
    }

    default:
      throw new Error(`Unknown message type: ${(message as { type: string }).type}`)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(
  submission: SubmissionDetail,
  status: UploadRecord["status"],
  message?: string,
  fileUrl?: string
): UploadRecord {
  return {
    timestamp: Date.now(),
    problemId: submission.problemId,
    problemTitle: submission.problemTitle,
    language: submission.language,
    status,
    fileUrl,
    message
  }
}

// Keeps the service worker alive for the duration of long operations.
// MV3 service workers can be suspended; we use chrome.alarms as a keepalive.
chrome.alarms.create("lgs:keepalive", { periodInMinutes: 0.4 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "lgs:keepalive") {
    // No-op — just keeps the service worker registered
  }
})

console.info("[LGS] Background service worker started")
