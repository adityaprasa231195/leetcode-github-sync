

import "~styles/globals.css"

import { useState } from "react"
import { useExtensionState } from "./hooks/useExtensionState"
import { useMessage } from "./hooks/useMessage"
import { Button } from "./components/Button"
import { HistoryList } from "./components/HistoryList"
import { LoginView } from "./components/LoginView"
import { RepoSelector } from "./components/RepoSelector"
import { Spinner } from "./components/Spinner"
import { StatusCard } from "./components/StatusCard"
import type { GitHubRepo } from "~types"

type View = "status" | "repo-select" | "history"

export default function Popup() {
  const { status, loading, error, refresh } = useExtensionState()
  const [view, setView] = useState<View>("status")
  const logoutMsg = useMessage("LOGOUT")
  const settingsMsg = useMessage("SET_SETTINGS")

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-[380px] flex items-center justify-center h-32">
        <Spinner size={22} />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="w-[380px] p-6 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="secondary" size="sm" onClick={refresh}>
          Retry
        </Button>
      </div>
    )
  }

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!status?.isAuthenticated) {
    return (
      <div className="w-[380px]">
        <LoginView onLogin={refresh} />
      </div>
    )
  }

  // ── Authenticated but no repo selected ────────────────────────────────────
  if (!status.selectedRepo && view !== "repo-select") {
    return (
      <div className="w-[380px]">
        <PopupHeader
          credentials={status.credentials}
          onLogout={async () => {
            await logoutMsg.send()
            refresh()
          }}
          logoutLoading={logoutMsg.loading}
        />
        <div className="p-4 text-center">
          <p className="text-sm text-brand-600 mb-3">
            Choose a repository to sync your solutions into.
          </p>
          <Button size="sm" onClick={() => setView("repo-select")}>
            Select Repository
          </Button>
        </div>
      </div>
    )
  }

  // ── Repo selection view ───────────────────────────────────────────────────
  if (view === "repo-select") {
    return (
      <div className="w-[380px]">
        <PopupHeader
          credentials={status.credentials}
          onLogout={async () => {
            await logoutMsg.send()
            refresh()
          }}
          logoutLoading={logoutMsg.loading}
        />
        <RepoSelector
          currentRepo={status.selectedRepo}
          onSelect={(repo: GitHubRepo) => {
            setView("status")
            refresh()
          }}
          onCancel={() => setView("status")}
        />
      </div>
    )
  }

  // ── History view ──────────────────────────────────────────────────────────
  if (view === "history") {
    return (
      <div className="w-[380px]">
        <PopupHeader
          credentials={status.credentials}
          onLogout={async () => {
            await logoutMsg.send()
            refresh()
          }}
          logoutLoading={logoutMsg.loading}
        />
        <NavTabs view={view} onChangeView={setView} />
        <HistoryList />
      </div>
    )
  }

  // ── Main status view ──────────────────────────────────────────────────────
  return (
    <div className="w-[380px]">
      <PopupHeader
        credentials={status.credentials}
        onLogout={async () => {
          await logoutMsg.send()
          refresh()
        }}
        logoutLoading={logoutMsg.loading}
      />
      <NavTabs view={view} onChangeView={setView} />
      <StatusCard
        status={status}
        onChangeRepo={() => setView("repo-select")}
        onToggleSync={async (enabled) => {
          await settingsMsg.send({ autoSyncEnabled: enabled })
          refresh()
        }}
      />
      {/* Settings shortcut */}
      <div className="px-4 py-3 border-t border-brand-100">
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-xs text-brand-400 hover:text-black underline underline-offset-2 transition-colors"
        >
          Open Settings →
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PopupHeader({
  credentials,
  onLogout,
  logoutLoading
}: {
  credentials?: { login: string; avatarUrl: string; name: string }
  onLogout: () => void
  logoutLoading: boolean
}) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-brand-100">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center text-white text-xs font-bold select-none">
          LC
        </div>
        <span className="text-sm font-semibold tracking-tight">LeetCode Sync</span>
      </div>
      {credentials && (
        <div className="flex items-center gap-2">
          <img
            src={credentials.avatarUrl}
            alt={credentials.login}
            className="w-6 h-6 rounded-full border border-brand-200"
          />
          <span className="text-xs text-brand-600 max-w-[80px] truncate">
            {credentials.login}
          </span>
          <button
            onClick={onLogout}
            disabled={logoutLoading}
            className="text-xs text-brand-400 hover:text-black transition-colors disabled:opacity-50"
            title="Log out"
          >
            {logoutLoading ? <Spinner size={12} /> : "↩"}
          </button>
        </div>
      )}
    </header>
  )
}

function NavTabs({
  view,
  onChangeView
}: {
  view: View
  onChangeView: (v: View) => void
}) {
  const tabs: { id: View; label: string }[] = [
    { id: "status", label: "Status" },
    { id: "history", label: "History" }
  ]

  return (
    <nav className="flex border-b border-brand-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChangeView(tab.id)}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            view === tab.id
              ? "text-black border-b-2 border-black -mb-px"
              : "text-brand-500 hover:text-black"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
