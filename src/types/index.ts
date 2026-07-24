






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


export interface SubmissionDetail {
  
  problemId: number
  
  problemTitle: string
  
  problemSlug: string
  
  difficulty: "Easy" | "Medium" | "Hard"
  
  language: LeetCodeLanguage
  
  code: string
  
  submissionId: string
  
  submittedAt: number
  
  runtime: string
  
  memory: string
  
  tags: string[]
}






export interface GitHubCredentials {
  
  accessToken: string
  
  login: string
  
  name: string
  
  avatarUrl: string
  
  expiresAt?: number
}


export interface GitHubRepo {
  
  fullName: string
  owner: string
  name: string
  description: string
  isPrivate: boolean
  defaultBranch: string
  
  pushedAt: string
}






export interface ExtensionSettings {
  
  autoSyncEnabled: boolean
  
  notificationsEnabled: boolean
  
  githubApiBaseUrl: string
  
  repoFolder: string
  
  generateReadme: boolean
  
  saveStats: boolean
  
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





export type UploadStatus = "success" | "skipped" | "error"

export interface UploadRecord {
  
  timestamp: number
  problemId: number
  problemTitle: string
  language: LeetCodeLanguage
  status: UploadStatus
  
  fileUrl?: string
  
  message?: string
}






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





export interface OAuthState {
  
  state: string
  
  startedAt: number
}





export interface ExtensionStatus {
  isAuthenticated: boolean
  credentials?: GitHubCredentials
  selectedRepo?: GitHubRepo
  settings: ExtensionSettings
  lastUpload?: UploadRecord
  pendingSubmission?: SubmissionDetail
}
