

import { upsertFile } from "~github/api"
import { authenticateWithPAT, initiateOAuthFlow, logout } from "~github/oauth"
import { generateReadme } from "~leetcode/readme-generator"
import {
  addUploadRecord,
  clearAll,
  clearPendingSubmission,
  clearSelectedRepo,
  clearUploadHistory,
  getCredentials,
  getPendingSubmission,
  getSelectedRepo,
  getSettings,
  getUploadHistory,
  setPendingSubmission,
  setSelectedRepo,
  setSettings
} from "~storage"
import type {
  ApproachPayload,
  ExtensionMessage,
  ExtensionResponse,
  ExtensionStatus,
  GitHubRepo,
  PendingSubmission,
  SubmissionDetail,
  UploadRecord
} from "~types"
import {
  buildApproachCommitMessage,
  buildCommitMessage,
  buildReadmeCommitMessage
} from "~utils/commit-message"
import { listRepositories } from "~github/api"
import {
  notifyAuthExpired,
  notifyError,
  notifyPendingApproach,
  notifyRateLimit,
  notifySkipped,
  notifySuccess
} from "~utils/notifications"
import { approachPath, readmePath, solutionPath } from "~utils/path"








interface PendingUpload {
  submission: SubmissionDetail
  attempts: number
  nextRetryAt: number
}

const pendingQueue: PendingUpload[] = []
const ALARM_NAME = "lgs:retry"
const MAX_RETRY_ATTEMPTS = 5






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

  const commitMsg = buildCommitMessage(submission, false )

  
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

async function uploadSubmissionWithApproach(
  submission: SubmissionDetail,
  approach: ApproachPayload
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
  const commitMsg = buildCommitMessage(submission, false)

  const solResult = await upsertFile(
    repo.owner,
    repo.name,
    filePath,
    submission.code,
    commitMsg,
    repo.defaultBranch
  )

  const appPath = approachPath(
    settings.repoFolder,
    submission.problemId,
    submission.problemTitle,
    approach.extension
  )
  const appCommitMsg = buildApproachCommitMessage(submission, false)

  await upsertFile(
    repo.owner,
    repo.name,
    appPath,
    approach.contentBase64,
    appCommitMsg,
    repo.defaultBranch,
    true
  )

  if (settings.generateReadme) {
    const history = await getUploadHistory()
    const priorUploads = history.filter(
      (r) => r.problemId === submission.problemId && r.status === "success"
    )
    const readmeContent = generateReadme(submission, priorUploads, approach)
    const rmPath = readmePath(
      settings.repoFolder,
      submission.problemId,
      submission.problemTitle
    )
    const readmeCommitMsg = buildReadmeCommitMessage(submission)

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

  const fileUrl = solResult.status !== "skipped" ? solResult.fileUrl : undefined
  const record = makeRecord(submission, "success", undefined, fileUrl)
  await addUploadRecord(record)
  if (settings.notificationsEnabled) notifySuccess(record)
  return record
}







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
        const backoff = Math.min(30, 2 ** pending.attempts) 
        pending.nextRetryAt = Date.now() + backoff * 60_000
        pendingQueue.push(pending)
      }
    }
  }

  scheduleRetry()
})





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

    
    return true
  }
)

async function handleMessage(
  message: ExtensionMessage
): Promise<unknown> {
  switch (message.type) {
    
    case "SUBMISSION_ACCEPTED": {
      const submission = message.payload as SubmissionDetail
      const settings = await getSettings()

      if (!settings.autoSyncEnabled) {
        return makeRecord(submission, "skipped", "Auto-sync is disabled")
      }

      if (settings.requireApproach) {
        const pending: PendingSubmission = {
          submission,
          detectedAt: Date.now()
        }
        await setPendingSubmission(pending)
        if (settings.notificationsEnabled) {
          notifyPendingApproach(submission)
        }
        return { status: "pending_approach", submission }
      }

      try {
        return await uploadSubmission(submission)
      } catch (err) {
        pendingQueue.push({
          submission,
          attempts: 1,
          nextRetryAt: Date.now() + 2 * 60_000 
        })
        scheduleRetry()
        throw err
      }
    }

    case "SUBMIT_APPROACH": {
      const payload = message.payload as {
        submission: SubmissionDetail
        approach: ApproachPayload
      }
      const record = await uploadSubmissionWithApproach(
        payload.submission,
        payload.approach
      )
      await clearPendingSubmission()
      return record
    }

    case "GET_PENDING_SUBMISSION": {
      return await getPendingSubmission()
    }

    case "DISCARD_PENDING_SUBMISSION": {
      await clearPendingSubmission()
      return null
    }

    case "TRIGGER_OAUTH": {
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

    case "GET_STATUS": {
      const [credentials, selectedRepo, settings, history, pendingSubmission] =
        await Promise.all([
          getCredentials(),
          getSelectedRepo(),
          getSettings(),
          getUploadHistory(),
          getPendingSubmission()
        ])
      const status: ExtensionStatus = {
        isAuthenticated: !!credentials?.accessToken,
        credentials: credentials ?? undefined,
        selectedRepo: selectedRepo ?? undefined,
        settings,
        lastUpload: history[0],
        pendingSubmission: pendingSubmission ?? undefined
      }
      return status
    }


    
    case "GET_REPOS": {
      return await listRepositories()
    }

    case "SET_REPO": {
      const repo = message.payload as GitHubRepo
      await setSelectedRepo(repo)
      return repo
    }

    
    case "GET_SETTINGS": {
      return await getSettings()
    }

    case "SET_SETTINGS": {
      const partial = message.payload as Partial<import("~types").ExtensionSettings>
      await setSettings(partial)
      return await getSettings()
    }

    
    case "GET_UPLOAD_HISTORY": {
      return await getUploadHistory()
    }

    case "CLEAR_HISTORY": {
      await clearUploadHistory()
      return null
    }

    
    case "MANUAL_SYNC": {
      
      
      
      
      
      return { message: "Manual sync triggered — check the LeetCode tab" }
    }

    default:
      throw new Error(`Unknown message type: ${(message as { type: string }).type}`)
  }
}





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



chrome.alarms.create("lgs:keepalive", { periodInMinutes: 0.4 })
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "lgs:keepalive") {
    
  }
})

console.info("[LGS] Background service worker started")
