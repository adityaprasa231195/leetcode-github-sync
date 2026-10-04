

import { Octokit } from "@octokit/rest"
import type { RequestError } from "@octokit/types"
import { getCredentials, getSettings } from "~storage"
import type { GitHubRepo } from "~types"
import { isRetryableHttpError, withRetry } from "~utils/retry"






async function getOctokit(): Promise<Octokit> {
  const credentials = await getCredentials()
  if (!credentials?.accessToken) {
    throw new Error("Not authenticated — please log in with GitHub first")
  }

  const settings = await getSettings()

  return new Octokit({
    auth: credentials.accessToken,
    baseUrl: settings.githubApiBaseUrl || "https://api.github.com",
    userAgent: "LeetCode-GitHub-Sync/1.0.0",
    
    
  })
}






const REPOS_PER_PAGE = 100


export async function listRepositories(): Promise<GitHubRepo[]> {
  const octokit = await getOctokit()

  const repos: GitHubRepo[] = []
  let page = 1
  const maxPages = 5

  while (page <= maxPages) {
    const { data } = await withRetry(
      () =>
        octokit.rest.repos.listForAuthenticatedUser({
          sort: "pushed",
          direction: "desc",
          per_page: REPOS_PER_PAGE,
          page,
          affiliation: "owner,collaborator,organization_member"
        }),
      { shouldRetry: isRetryableHttpError }
    )

    if (data.length === 0) break

    for (const r of data) {
      repos.push({
        fullName: r.full_name,
        owner: r.owner.login,
        name: r.name,
        description: r.description ?? "",
        isPrivate: r.private,
        defaultBranch: r.default_branch,
        pushedAt: r.pushed_at ?? ""
      })
    }

    if (data.length < REPOS_PER_PAGE) break
    page++
  }

  return repos
}





export interface ExistingFileInfo {
  sha: string
  content: string 
  encodedContent: string 
}


export async function getExistingFile(
  owner: string,
  repo: string,
  path: string,
  branch?: string
): Promise<ExistingFileInfo | null> {
  const octokit = await getOctokit()

  try {
    const { data } = await withRetry(
      () =>
        octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ...(branch ? { ref: branch } : {})
        }),
      { shouldRetry: isRetryableHttpError }
    )

    
    if (Array.isArray(data) || data.type !== "file") {
      return null
    }

    const raw = data as {
      sha: string
      content: string
      encoding: string
    }

    
    const encoded = raw.content.replace(/\n/g, "")
    let decoded = ""
    try {
      decoded = decodeBase64ToUtf8(encoded)
    } catch {
      decoded = ""
    }

    return {
      sha: raw.sha,
      content: raw.content,
      encodedContent: decoded
    }
  } catch (err) {
    const status = (err as RequestError).status
    if (status === 404) return null
    throw err
  }
}

export interface UploadFileResult {
  created: boolean
  fileUrl: string
  commitSha: string
}

export async function uploadFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  existingSha?: string,
  branch?: string,
  isBase64?: boolean
): Promise<UploadFileResult> {
  const octokit = await getOctokit()
  const base64Content = isBase64 ? content : encodeUtf8ToBase64(content)

  const { data } = await withRetry(
    () =>
      octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: base64Content,
        ...(existingSha ? { sha: existingSha } : {}),
        ...(branch ? { branch } : {})
      }),
    { shouldRetry: isRetryableHttpError }
  )

  const htmlUrl =
    data.content?.html_url ??
    `https://github.com/${owner}/${repo}/blob/${data.commit.sha}/${path}`

  return {
    created: !existingSha,
    fileUrl: htmlUrl,
    commitSha: data.commit.sha ?? ""
  }
}

export type UpsertResult =
  | { status: "created"; fileUrl: string; commitSha: string }
  | { status: "updated"; fileUrl: string; commitSha: string }
  | { status: "skipped"; reason: string }

export async function upsertFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  commitMessage: string,
  branch?: string,
  isBase64?: boolean
): Promise<UpsertResult> {
  const existing = await getExistingFile(owner, repo, path, branch)

  if (existing) {
    if (isBase64) {
      const cleanExisting = existing.content.replace(/\s+/g, "")
      const cleanNew = content.replace(/\s+/g, "")
      if (cleanExisting === cleanNew) {
        return {
          status: "skipped",
          reason: "File already exists with identical content"
        }
      }
    } else {
      const normaliseLE = (s: string) => s.replace(/\r\n/g, "\n").trimEnd()
      if (normaliseLE(existing.encodedContent) === normaliseLE(content)) {
        return {
          status: "skipped",
          reason: "File already exists with identical content"
        }
      }
    }

    const result = await uploadFile(
      owner,
      repo,
      path,
      content,
      commitMessage,
      existing.sha,
      branch,
      isBase64
    )
    return { status: "updated", fileUrl: result.fileUrl, commitSha: result.commitSha }
  }

  const result = await uploadFile(
    owner,
    repo,
    path,
    content,
    commitMessage,
    undefined,
    branch,
    isBase64
  )
  return { status: "created", fileUrl: result.fileUrl, commitSha: result.commitSha }
}





function encodeUtf8ToBase64(str: string): string {
  
  const bytes = new TextEncoder().encode(str)
  let binary = ""
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function decodeBase64ToUtf8(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
