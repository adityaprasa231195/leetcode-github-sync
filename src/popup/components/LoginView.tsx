

import { useState } from "react"
import { useMessage } from "../hooks/useMessage"
import type { GitHubCredentials } from "~types"
import { Button } from "./Button"

interface LoginViewProps {
  onLogin: () => void
}

// GitHub OAuth App client ID — injected from .env at build time
const CLIENT_ID = process.env.PLASMO_PUBLIC_GITHUB_CLIENT_ID ?? ""

export function LoginView({ onLogin }: LoginViewProps) {
  const [showPat, setShowPat] = useState(false)
  const [pat, setPat] = useState("")
  const [patError, setPatError] = useState("")

  const oauthMsg = useMessage<GitHubCredentials>("TRIGGER_OAUTH")
  const patMsg = useMessage<GitHubCredentials>("TRIGGER_OAUTH")

  async function handleOAuth() {
    try {
      await oauthMsg.send()
      onLogin()
    } catch {
      // error is already set in oauthMsg.error
    }
  }

  async function handlePat() {
    if (!pat.trim()) {
      setPatError("Token cannot be empty")
      return
    }
    setPatError("")
    try {
      await patMsg.send({ pat: pat.trim() })
      onLogin()
    } catch {
      // error is set in patMsg.error
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-6 animate-fade-in">
      {/* Logo / header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-white text-xl font-bold select-none">
          LC
        </div>
        <h1 className="text-lg font-semibold tracking-tight">LeetCode GitHub Sync</h1>
        <p className="text-xs text-brand-500 leading-relaxed max-w-[220px]">
          Automatically push your accepted solutions to GitHub.
        </p>
      </div>

      {/* OAuth button (primary path) */}
      {CLIENT_ID && (
        <Button
          className="w-full"
          loading={oauthMsg.loading}
          onClick={handleOAuth}
        >
          <GitHubIcon />
          Login with GitHub
        </Button>
      )}

      {oauthMsg.error && (
        <p className="text-xs text-red-600 text-center">{oauthMsg.error}</p>
      )}

      {/* Divider */}
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-px bg-brand-200" />
        <span className="text-xs text-brand-400">or</span>
        <div className="flex-1 h-px bg-brand-200" />
      </div>

      {/* PAT alternative */}
      {!showPat ? (
        <button
          onClick={() => setShowPat(true)}
          className="text-xs text-brand-500 hover:text-black underline underline-offset-2 transition-colors"
        >
          Use a Personal Access Token instead
        </button>
      ) : (
        <div className="w-full flex flex-col gap-3 animate-slide-up">
          {/* How-to guide card */}
          <div className="rounded-lg bg-brand-50 p-3 border border-brand-200 text-xs text-brand-700 flex flex-col gap-1.5">
            <span className="font-semibold text-brand-900">
              📖 How to get a key:
            </span>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-brand-600 leading-normal">
              <li>
                Click{" "}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=LeetCode+GitHub+Sync"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-black underline hover:text-brand-800"
                >
                  Generate Token on GitHub ↗
                </a>
              </li>
              <li>
                Ensure required permissions (scopes) are checked:
                <div className="flex gap-1.5 my-1 ml-4 font-mono text-[10px]">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-brand-300 text-black font-semibold">✓ repo</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-brand-300 text-black font-semibold">✓ read:user</span>
                </div>
              </li>
              <li>Scroll to the bottom and click <b>Generate token</b>.</li>
              <li>Copy the token (starts with <code className="font-mono bg-white px-1 rounded border border-brand-200 text-[10px]">ghp_</code>) and paste it below.</li>
            </ol>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-brand-700">
              Personal Access Token
            </label>
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePat()}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm placeholder:text-brand-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              autoComplete="off"
            />
          </div>

          {(patError || patMsg.error) && (
            <p className="text-xs text-red-600">{patError || patMsg.error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPat(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={patMsg.loading}
              onClick={handlePat}
              className="flex-1"
            >
              Connect
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}
