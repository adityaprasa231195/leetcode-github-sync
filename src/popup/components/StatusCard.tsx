/**
 * StatusCard — shows the current sync status, last upload, and quick controls.
 */

import type { ExtensionStatus, UploadRecord } from "~types"
import { getDisplayName } from "~utils/language-map"
import { Badge } from "./Badge"

interface StatusCardProps {
  status: ExtensionStatus
  onChangeRepo: () => void
  onToggleSync: (enabled: boolean) => void
}

export function StatusCard({ status, onChangeRepo, onToggleSync }: StatusCardProps) {
  const { selectedRepo, lastUpload, settings } = status

  return (
    <div className="flex flex-col gap-0 divide-y divide-brand-100">
      {/* Repository row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-brand-500 uppercase tracking-wide">
            Repository
          </span>
          {selectedRepo ? (
            <span className="text-sm font-medium text-black truncate mt-0.5">
              {selectedRepo.fullName}
            </span>
          ) : (
            <span className="text-sm text-brand-400 mt-0.5">Not selected</span>
          )}
        </div>
        <button
          onClick={onChangeRepo}
          className="shrink-0 text-xs text-brand-500 hover:text-black underline underline-offset-2 transition-colors ml-2"
        >
          {selectedRepo ? "Change" : "Select"}
        </button>
      </div>

      {/* Auto-sync toggle */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <span className="text-xs font-medium text-brand-500 uppercase tracking-wide">
            Auto Sync
          </span>
          <p className="text-xs text-brand-400 mt-0.5">
            {settings.autoSyncEnabled
              ? "Uploads accepted solutions automatically"
              : "Paused — solutions will not be uploaded"}
          </p>
        </div>
        <Toggle
          checked={settings.autoSyncEnabled}
          onChange={onToggleSync}
        />
      </div>

      {/* Last upload */}
      <div className="px-4 py-3">
        <span className="text-xs font-medium text-brand-500 uppercase tracking-wide">
          Last Upload
        </span>
        {lastUpload ? (
          <UploadSummary record={lastUpload} />
        ) : (
          <p className="text-sm text-brand-400 mt-1">No uploads yet</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UploadSummary({ record }: { record: UploadRecord }) {
  const timeAgo = formatRelative(record.timestamp)
  const lang = getDisplayName(record.language)

  return (
    <div className="flex items-start justify-between mt-1.5 gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-black truncate">
          {record.problemId}. {record.problemTitle}
        </p>
        <p className="text-xs text-brand-400 mt-0.5">
          {lang} · {timeAgo}
        </p>
      </div>
      <Badge
        variant={
          record.status === "success"
            ? "success"
            : record.status === "skipped"
            ? "neutral"
            : "error"
        }
      >
        {record.status === "success"
          ? "✓"
          : record.status === "skipped"
          ? "–"
          : "✗"}
      </Badge>
    </div>
  )
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
        checked ? "bg-black" : "bg-brand-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  )
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
