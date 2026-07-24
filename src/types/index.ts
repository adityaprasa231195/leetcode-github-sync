

// ---------------------------------------------------------------------------
// Submission & problem types
// ---------------------------------------------------------------------------

/** Every programming language LeetCode supports, mapped to a file extension. */
export type LeetCodeLanguage =
  | "cpp"
  | "java"
  | "python"
  | "python3"
  | "c"
  | "csharp"
  | "javascript"
  | "typescript"
  | "php"
  | "swift"
  | "kotlin"
  | "dart"
  | "golang"
  | "ruby"
  | "scala"
  | "rust"
  | "racket"
  | "erlang"
  | "elixir"
  | "mysql"
  | "mssql"
  | "oraclesql"
  | "bash"
  | "postgresql"
  | "cangjie"

/** Details of a single accepted submission, as collected by the content script. */
export interface SubmissionDetail {
  /** LeetCode's numeric problem ID (e.g. 29). */
  problemId: number
  /** Human-readable problem title (e.g. "Divide Two Integers"). */
  problemTitle: string
  /** URL-friendly slug (e.g. "divide-two-integers"). */
  problemSlug: string
  /** Difficulty label. */
  difficulty: "Easy" | "Medium" | "Hard"
  /** The language the solution was submitted in. */
  language: LeetCodeLanguage
  /** The full solution source code. */
  code: string
  /** LeetCode's internal submission ID (string). */
  submissionId: string
  /** Unix timestamp (milliseconds) of submission time. */
  submittedAt: number
  /** Runtime from the result page (e.g. "72 ms"). May be empty string if unavailable. */
  runtime: string
  /** Memory from the result page (e.g. "42.1 MB"). May be empty string if unavailable. */
  memory: string
  /** Problem topic tags (e.g. ["Array", "Hash Table"]). */
  tags: string[]
}

// ---------------------------------------------------------------------------
// GitHub types
// ---------------------------------------------------------------------------

/** Stored GitHub credentials. */
export interface GitHubCredentials {
  /** OAuth access token. */
  accessToken: string
  /** GitHub username of the authenticated user. */
  login: string
  /** Display name (may differ from login). */
  name: string
  /** Avatar URL. */
  avatarUrl: string
  /** Token expiry timestamp in ms (undefined if non-expiring PAT). */
  expiresAt?: number
}

/** Minimal repository descriptor used in the UI. */
export interface GitHubRepo {
  /** owner/repo format. */
  fullName: string
  owner: string
  name: string
  description: string
  isPrivate: boolean
  defaultBranch: string
  /** UTC ISO string of last push. */
  pushedAt: string
}

// ---------------------------------------------------------------------------
// Extension storage types
// ---------------------------------------------------------------------------

/** The full settings object persisted in chrome.storage.local. */
export interface ExtensionSettings {
  /** Whether the auto-sync feature is enabled. */
  autoSyncEnabled: boolean
  /** Whether desktop notifications are enabled. */
  notificationsEnabled: boolean
  /** Custom GitHub API base URL for GitHub Enterprise support. */
  githubApiBaseUrl: string
  /** The root folder name inside the repository. */
  repoFolder: string
  /** Whether to generate a README.md per problem. */
  generateReadme: boolean
  /** Whether to save runtime & memory stats in the README. */
  saveStats: boolean
  /** Theme preference. */
  theme: "light" | "dark" | "system"
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoSyncEnabled: true,
  notificationsEnabled: true,
  githubApiBaseUrl: "https://api.github.com",
  repoFolder: "LeetCode",
  generateReadme: true,
  saveStats: true,
  theme: "system"
}

// ---------------------------------------------------------------------------
// Upload history / recent uploads
// ---------------------------------------------------------------------------

export type UploadStatus = "success" | "skipped" | "error"

export interface UploadRecord {
  /** Milliseconds timestamp. */
  timestamp: number
  problemId: number
  problemTitle: string
  language: LeetCodeLanguage
  status: UploadStatus
  /** GitHub permalink to the committed file. */
  fileUrl?: string
  /** Human-readable reason for skipped/error status. */
  message?: string
}

// ---------------------------------------------------------------------------
// Messaging protocol (content ↔ background)
// ---------------------------------------------------------------------------


export type MessageType =
  | "SUBMISSION_ACCEPTED"
  | "GET_STATUS"
  | "TRIGGER_OAUTH"
  | "LOGOUT"
  | "UPLOAD_NOW"
  | "GET_REPOS"
  | "SET_REPO"
  | "GET_SETTINGS"
  | "SET_SETTINGS"
  | "GET_UPLOAD_HISTORY"
  | "CLEAR_HISTORY"
  | "MANUAL_SYNC"

export interface ExtensionMessage<T = unknown> {
  type: MessageType
  payload?: T
}

export interface ExtensionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export interface OAuthState {
  /** Random nonce used for CSRF protection. */
  state: string
  /** Timestamp the auth flow started (ms). */
  startedAt: number
}

// ---------------------------------------------------------------------------
// Status snapshot (returned to popup on GET_STATUS)
// ---------------------------------------------------------------------------

export interface ExtensionStatus {
  isAuthenticated: boolean
  credentials?: GitHubCredentials
  selectedRepo?: GitHubRepo
  settings: ExtensionSettings
  lastUpload?: UploadRecord
  pendingSubmission?: SubmissionDetail
}
