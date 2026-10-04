

import "~styles/globals.css"

import { useEffect, useState } from "react"
import { useMessage } from "~popup/hooks/useMessage"
import { Button } from "~popup/components/Button"
import { Spinner } from "~popup/components/Spinner"
import { RepoSelector } from "~popup/components/RepoSelector"
import type { ExtensionSettings, ExtensionStatus, GitHubRepo } from "~types"

export default function OptionsPage() {
  const [status, setStatus] = useState<ExtensionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRepoSelector, setShowRepoSelector] = useState(false)

  const getStatus = useMessage<ExtensionStatus>("GET_STATUS")
  const logout = useMessage("LOGOUT")
  const setSettings = useMessage<ExtensionSettings>("SET_SETTINGS")
  const clearHistory = useMessage("CLEAR_HISTORY")
  const clearRepo = useMessage("SET_REPO")

  async function refresh() {
    setLoading(true)
    try {
      const s = await getStatus.send()
      setStatus(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    
  }, [])

  async function handleSettingChange(patch: Partial<ExtensionSettings>) {
    if (!status) return
    const updated = await setSettings.send(patch)
    setStatus((prev) =>
      prev ? { ...prev, settings: updated as ExtensionSettings } : prev
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={28} />
      </div>
    )
  }

  if (!status) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <p className="text-red-600 mb-4">Could not load extension status.</p>
        <Button variant="secondary" onClick={refresh}>
          Retry
        </Button>
      </div>
    )
  }

  const { credentials, selectedRepo, settings, isAuthenticated } = status

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-8 animate-fade-in">
      {}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-brand-500 mt-1">
          Configure how LeetCode GitHub Sync behaves.
        </p>
      </div>

      {}
      <Section title="GitHub Account">
        {isAuthenticated && credentials ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={credentials.avatarUrl}
                alt={credentials.login}
                className="w-9 h-9 rounded-full border border-brand-200"
              />
              <div>
                <p className="text-sm font-medium">{credentials.name}</p>
                <p className="text-xs text-brand-500">@{credentials.login}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={logout.loading}
              onClick={async () => {
                await logout.send()
                await refresh()
              }}
            >
              Log out
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-500">Not connected</p>
            <Button
              size="sm"
              onClick={() => chrome.runtime.sendMessage({ type: "TRIGGER_OAUTH" }, () => refresh())}
            >
              Connect GitHub
            </Button>
          </div>
        )}
        {logout.error && (
          <p className="text-xs text-red-600 mt-2">{logout.error}</p>
        )}
      </Section>

      {}
      <Section title="Repository">
        {showRepoSelector ? (
          <RepoSelector
            currentRepo={selectedRepo}
            onSelect={async () => {
              setShowRepoSelector(false)
              await refresh()
            }}
            onCancel={() => setShowRepoSelector(false)}
          />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              {selectedRepo ? (
                <>
                  <p className="text-sm font-medium">{selectedRepo.fullName}</p>
                  <p className="text-xs text-brand-500 mt-0.5">
                    {selectedRepo.isPrivate ? "Private" : "Public"} ·{" "}
                    {selectedRepo.defaultBranch}
                  </p>
                </>
              ) : (
                <p className="text-sm text-brand-500">No repository selected</p>
              )}
            </div>
            <div className="flex gap-2">
              {selectedRepo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    
                    await chrome.runtime.sendMessage(
                      { type: "SET_REPO", payload: null },
                      () => refresh()
                    )
                  }}
                >
                  Reset
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRepoSelector(true)}
              >
                {selectedRepo ? "Change" : "Select"}
              </Button>
            </div>
          </div>
        )}
      </Section>

      {}
      <Section title="Sync">
        <div className="space-y-4">
          <ToggleRow
            label="Require approach upload"
            description="Pause auto-push until you upload or write your problem-solving approach."
            checked={settings.requireApproach}
            onChange={(v) => handleSettingChange({ requireApproach: v })}
          />
          <ToggleRow
            label="Auto-sync"
            description="Automatically upload accepted solutions as you solve them."
            checked={settings.autoSyncEnabled}
            onChange={(v) => handleSettingChange({ autoSyncEnabled: v })}
          />
          <ToggleRow
            label="Desktop notifications"
            description="Show a notification after each upload or error."
            checked={settings.notificationsEnabled}
            onChange={(v) => handleSettingChange({ notificationsEnabled: v })}
          />
          <ToggleRow
            label="Generate README"
            description="Create a README.md per problem with metadata and a solutions table."
            checked={settings.generateReadme}
            onChange={(v) => handleSettingChange({ generateReadme: v })}
          />
          <ToggleRow
            label="Save runtime & memory stats"
            description="Include LeetCode runtime and memory percentiles in the README."
            checked={settings.saveStats}
            onChange={(v) => handleSettingChange({ saveStats: v })}
          />
        </div>
      </Section>

      <Section title="File Structure">
        <div className="space-y-4">
          <LabeledInput
            label="Root folder"
            description="The top-level folder name inside the repository."
            value={settings.repoFolder}
            placeholder="LeetCode"
            onCommit={(v) => handleSettingChange({ repoFolder: v || "LeetCode" })}
          />
          <p className="text-xs text-brand-400 font-mono bg-brand-50 rounded-lg p-3 leading-relaxed">
            {settings.repoFolder || "LeetCode"}/
            <br />
            &nbsp;&nbsp;29 Divide Two Integers/
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;solution.cpp
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;approach.md (or .pdf, image, .txt)
            <br />
            &nbsp;&nbsp;&nbsp;&nbsp;README.md
          </p>
        </div>
      </Section>


      {}
      <Section title="GitHub Enterprise (optional)">
        <LabeledInput
          label="API base URL"
          description="Leave blank for github.com. Set to your GitHub Enterprise URL if applicable."
          value={settings.githubApiBaseUrl === "https://api.github.com" ? "" : settings.githubApiBaseUrl}
          placeholder="https://api.github.com"
          onCommit={(v) =>
            handleSettingChange({
              githubApiBaseUrl: v || "https://api.github.com"
            })
          }
        />
      </Section>

      {}
      <Section title="Danger Zone">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Clear upload history</p>
            <p className="text-xs text-brand-500 mt-0.5">
              Removes the local record of past uploads. Does not affect GitHub.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            loading={clearHistory.loading}
            onClick={async () => {
              if (!confirm("Clear upload history? This cannot be undone.")) return
              await clearHistory.send()
              await refresh()
            }}
          >
            Clear history
          </Button>
        </div>
        {clearHistory.error && (
          <p className="text-xs text-red-600 mt-2">{clearHistory.error}</p>
        )}
      </Section>

      {}
      <footer className="text-xs text-brand-400 text-center pb-4">
        LeetCode GitHub Sync · v1.0.0
      </footer>
    </div>
  )
}





function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-500 border-b border-brand-100 pb-2">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-brand-500 mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
          checked ? "bg-black" : "bg-brand-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  )
}

function LabeledInput({
  label,
  description,
  value,
  placeholder,
  onCommit
}: {
  label: string
  description: string
  value: string
  placeholder?: string
  onCommit: (v: string) => void
}) {
  const [local, setLocal] = useState(value)

  
  useEffect(() => setLocal(value), [value])

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium block">{label}</label>
      <p className="text-xs text-brand-500">{description}</p>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(local)}
        onKeyDown={(e) => e.key === "Enter" && onCommit(local)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm placeholder:text-brand-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black font-mono"
      />
    </div>
  )
}
