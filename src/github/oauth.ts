

import {
  clearCredentials,
  clearOAuthState,
  getOAuthState,
  setCredentials,
  setOAuthState
} from "~storage"
import type { GitHubCredentials, OAuthState } from "~types"

// ---------------------------------------------------------------------------
// Build-time configuration
// These values are injected at build time via .env files.
// Rename .env.example → .env.local and fill in your values.
// ---------------------------------------------------------------------------

/** Your GitHub OAuth App's client_id.  Safe to embed in the extension. */
const GITHUB_CLIENT_ID =
  process.env.PLASMO_PUBLIC_GITHUB_CLIENT_ID ?? "YOUR_GITHUB_CLIENT_ID"


const TOKEN_EXCHANGE_URL =
  process.env.PLASMO_PUBLIC_TOKEN_EXCHANGE_URL ?? "https://your-proxy.example.com/api/github-oauth"

/** Scopes requested from GitHub.  "repo" covers public + private repo access. */
const SCOPES = "repo read:user"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generates a cryptographically random hex string for CSRF protection. */
function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Returns the redirect URL that chrome.identity manages for us. */
function getRedirectUrl(): string {
  return chrome.identity.getRedirectURL("github")
}

// ---------------------------------------------------------------------------
// OAuth flow
// ---------------------------------------------------------------------------


export async function initiateOAuthFlow(): Promise<GitHubCredentials> {
  const state = generateState()
  const oauthState: OAuthState = { state, startedAt: Date.now() }
  await setOAuthState(oauthState)

  const redirectUrl = getRedirectUrl()

  const authUrl = new URL("https://github.com/login/oauth/authorize")
  authUrl.searchParams.set("client_id", GITHUB_CLIENT_ID)
  authUrl.searchParams.set("redirect_uri", redirectUrl)
  authUrl.searchParams.set("scope", SCOPES)
  authUrl.searchParams.set("state", state)

  // Launch the GitHub login popup managed by chrome.identity
  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (callbackUrl) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          reject(
            new Error(
              chrome.runtime.lastError?.message ?? "OAuth flow was cancelled"
            )
          )
        } else {
          resolve(callbackUrl)
        }
      }
    )
  })

  // Parse the callback URL
  const url = new URL(responseUrl)
  const returnedState = url.searchParams.get("state")
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    await clearOAuthState()
    throw new Error(`GitHub OAuth error: ${error}`)
  }

  // Verify CSRF nonce
  const savedState = await getOAuthState()
  await clearOAuthState()

  if (!savedState || returnedState !== savedState.state) {
    throw new Error("OAuth state mismatch — possible CSRF attack")
  }

  if (!code) {
    throw new Error("No authorisation code returned from GitHub")
  }

  // Exchange the code for an access token via our proxy
  const accessToken = await exchangeCodeForToken(code, state, redirectUrl)

  // Fetch the authenticated user's profile
  const credentials = await fetchUserProfile(accessToken)
  await setCredentials(credentials)

  return credentials
}

/**
 * Exchanges the temporary OAuth code for an access token.
 *
 * This call goes to the proxy server (not directly to GitHub) because
 * the client_secret must be kept on the server side.
 */
async function exchangeCodeForToken(
  code: string,
  state: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch(TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state, redirect_uri: redirectUri })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`Token exchange failed (${response.status}): ${text}`)
  }

  const json = (await response.json()) as { access_token?: string; error?: string }

  if (json.error) {
    throw new Error(`Token exchange error: ${json.error}`)
  }

  if (!json.access_token) {
    throw new Error("Token exchange returned no access_token")
  }

  return json.access_token
}

/**
 * Fetches the authenticated user's GitHub profile and returns a
 * GitHubCredentials object ready to persist.
 */
async function fetchUserProfile(
  accessToken: string
): Promise<GitHubCredentials> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub profile: ${response.status}`)
  }

  const user = (await response.json()) as {
    login: string
    name?: string
    avatar_url: string
  }

  return {
    accessToken,
    login: user.login,
    name: user.name ?? user.login,
    avatarUrl: user.avatar_url
  }
}

// ---------------------------------------------------------------------------
// PAT (Personal Access Token) — alternative to OAuth
// ---------------------------------------------------------------------------


export async function authenticateWithPAT(
  pat: string
): Promise<GitHubCredentials> {
  const trimmed = pat.trim()
  if (!trimmed) throw new Error("Personal Access Token cannot be empty")

  const credentials = await fetchUserProfile(trimmed)
  await setCredentials(credentials)
  return credentials
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------


export async function logout(): Promise<void> {
  await clearCredentials()
  await clearOAuthState()
}
