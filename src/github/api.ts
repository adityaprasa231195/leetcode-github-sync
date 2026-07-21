/**
 * GitHub API module — thin, typed wrapper around @octokit/rest.
 *
 * Responsibilities:
 *   • List the authenticated user's repositories.
 *   • Check whether a file already exists (and retrieve its SHA).
 *   • Create or update a file (PUT /repos/{owner}/{repo}/contents/{path}).
 *   • All calls use the access token from storage.
 *
 * We use @octokit/rest (official GitHub SDK) throughout.
 * No custom HTTP calls except where Octokit doesn't expose an endpoint.
 *
 * Retry behaviour is handled by withRetry() from utils/retry.
 */

import { Octokit } from "@octokit/rest"
import type { RequestError } from "@octokit/types"
import { getCredentials, getSettings } from "~storage"
import type { GitHubRepo } from "~types"
import { isRetryableHttpError, withRetry } from "~utils/retry"

// ---------------------------------------------------------------------------
// Octokit factory
// ---------------------------------------------------------------------------

/**
 * Creates an authenticated Octokit instance using the stored access token.
 * Throws if the user is not authenticated.
 */
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
    // Octokit has built-in request throttling via @octokit/plugin-throttling
    // when installed.  Without it we rely on our own withRetry() wrapper.
  })
}

// ---------------------------------------------------------------------------
// Repository helpers
// ---------------------------------------------------------------------------

/** Maximum number of repos to load per page (GitHub API max is 100). */
const REPOS_PER_PAGE = 100

/**
 * Returns all repositories accessible to the authenticated user,
 * sorted by most recently pushed.
 *
 * Fetches up to 5 pages (500 repos) to cover large accounts.
 */
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

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

export interface ExistingFileInfo {
  sha: string
  content: string // base64-encoded, as returned by GitHub
  encodedContent: string // decoded UTF-8 string
}

/**
 * Checks whether a file exists in the repository at the given path.
 *
 * Returns the file's SHA and current content if it exists, or null if not found.
 *
 * @param owner  – repository owner login
 * @param repo   – repository name
 * @param path   – path relative to repo root (e.g. "LeetCode/29 Divide Two Integers/solution.cpp")
 * @param branch – branch to check (defaults to the repo's default branch)
 */
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

    // getContent can return an array (directory) or a single file object
    if (Array.isArray(data) || data.type !== "file") {
      return null
    }

    const raw = data as {
      sha: string
      content: string
      encoding: string
    }

    // Decode base64 → UTF-8
    const encoded = raw.content.replace(/\n/g, "")
    const decoded = decodeBase64ToUtf8(encoded)

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
  /** Whether the file was newly created (false = updated). */
  created: boolean
  /** GitHub permalink to the file on the default branch. */
  fileUrl: string
  /** Git commit SHA. */
  commitSha: string
}

/**
 * Creates or updates a file in the repository.
 *
 * If a file already exists at `path` (determined by the presence of `existingSha`),
 * the SHA is included in the request so GitHub performs an update rather than
 * creating a duplicate.
 *
 * Content is UTF-8 encoded to base64 before upload, as required by the API.
 *
 * @param owner        – repository owner login
 * @param repo         – repository name
 * @param path         – destination path relative to repo root
 * @param content      – UTF-8 file content
 * @param message      – Git commit message
 * @param existingSha  – SHA of the existing file blob (omit to create new file)
 * @param branch       – target branch (defaults to repo default branch)
 */
export async function uploadFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  existingSha?: string,
  branch?: string
): Promise<UploadFileResult> {
  const octokit = await getOctokit()
  const base64Content = encodeUtf8ToBase64(content)

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

// ---------------------------------------------------------------------------
// Composite: upsert file with duplicate detection
// ---------------------------------------------------------------------------

export type UpsertResult =
  | { status: "created"; fileUrl: string; commitSha: string }
  | { status: "updated"; fileUrl: string; commitSha: string }
  | { status: "skipped"; reason: string }

/**
 * High-level helper that:
 *   1. Checks whether the file already exists.
 *   2. If it does and the content is identical → skips upload.
 *   3. If it does and content differs → updates the file.
 *   4. If it doesn't exist → creates it.
 *
 * Returns a discriminated union describing the outcome.
 */
export async function upsertFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  commitMessage: string,
  branch?: string
): Promise<UpsertResult> {
  const existing = await getExistingFile(owner, repo, path, branch)

  if (existing) {
    // Compare decoded content — normalise line endings before comparison
    const normaliseLE = (s: string) => s.replace(/\r\n/g, "\n").trimEnd()
    if (normaliseLE(existing.encodedContent) === normaliseLE(content)) {
      return {
        status: "skipped",
        reason: "File already exists with identical content"
      }
    }

    const result = await uploadFile(
      owner,
      repo,
      path,
      content,
      commitMessage,
      existing.sha,
      branch
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
    branch
  )
  return { status: "created", fileUrl: result.fileUrl, commitSha: result.commitSha }
}

// ---------------------------------------------------------------------------
// Utility: Base64 ↔ UTF-8 (handles non-ASCII code like Chinese variable names)
// ---------------------------------------------------------------------------

function encodeUtf8ToBase64(str: string): string {
  // TextEncoder gives us a Uint8Array from the UTF-8 representation
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
