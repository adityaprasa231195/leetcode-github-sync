

import type {
  ExtensionSettings,
  GitHubCredentials,
  GitHubRepo,
  OAuthState,
  PendingSubmission,
  UploadRecord
} from "~types"
import { DEFAULT_SETTINGS } from "~types"

const KEYS = {
  CREDENTIALS: "lgs:credentials",
  REPO: "lgs:repo",
  SETTINGS: "lgs:settings",
  HISTORY: "lgs:history",
  OAUTH_STATE: "lgs:oauth_state",
  PENDING_SUBMISSION: "lgs:pending_submission"
} as const

const MAX_HISTORY = 100







async function get<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(result[key] as T | undefined)
      }
    })
  })
}


async function set<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })
}


async function remove(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })
}





export async function getCredentials(): Promise<GitHubCredentials | null> {
  return (await get<GitHubCredentials>(KEYS.CREDENTIALS)) ?? null
}

export async function setCredentials(
  credentials: GitHubCredentials
): Promise<void> {
  await set(KEYS.CREDENTIALS, credentials)
}

export async function clearCredentials(): Promise<void> {
  await remove(KEYS.CREDENTIALS)
}





export async function getSelectedRepo(): Promise<GitHubRepo | null> {
  return (await get<GitHubRepo>(KEYS.REPO)) ?? null
}

export async function setSelectedRepo(repo: GitHubRepo): Promise<void> {
  await set(KEYS.REPO, repo)
}

export async function clearSelectedRepo(): Promise<void> {
  await remove(KEYS.REPO)
}





export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await get<Partial<ExtensionSettings>>(KEYS.SETTINGS)
  
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function setSettings(
  settings: Partial<ExtensionSettings>
): Promise<void> {
  const current = await getSettings()
  await set(KEYS.SETTINGS, { ...current, ...settings })
}





export async function getUploadHistory(): Promise<UploadRecord[]> {
  return (await get<UploadRecord[]>(KEYS.HISTORY)) ?? []
}

export async function addUploadRecord(record: UploadRecord): Promise<void> {
  const history = await getUploadHistory()
  
  const updated = [record, ...history].slice(0, MAX_HISTORY)
  await set(KEYS.HISTORY, updated)
}

export async function clearUploadHistory(): Promise<void> {
  await set(KEYS.HISTORY, [])
}





export async function getOAuthState(): Promise<OAuthState | null> {
  return (await get<OAuthState>(KEYS.OAUTH_STATE)) ?? null
}

export async function setOAuthState(state: OAuthState): Promise<void> {
  await set(KEYS.OAUTH_STATE, state)
}

export async function clearOAuthState(): Promise<void> {
  await remove(KEYS.OAUTH_STATE)
}

export async function getPendingSubmission(): Promise<PendingSubmission | null> {
  return (await get<PendingSubmission>(KEYS.PENDING_SUBMISSION)) ?? null
}

export async function setPendingSubmission(
  pending: PendingSubmission
): Promise<void> {
  await set(KEYS.PENDING_SUBMISSION, pending)
}

export async function clearPendingSubmission(): Promise<void> {
  await remove(KEYS.PENDING_SUBMISSION)
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    clearCredentials(),
    clearSelectedRepo(),
    clearOAuthState(),
    clearPendingSubmission()
  ])
}

