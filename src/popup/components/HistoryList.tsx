

import { useEffect, useState } from "react"
import { useMessage } from "../hooks/useMessage"
import type { UploadRecord } from "~types"
import { getDisplayName } from "~utils/language-map"
import { Badge } from "./Badge"
import { Spinner } from "./Spinner"

export function HistoryList() {
  const [records, setRecords] = useState<UploadRecord[]>([])
  const fetchHistory = useMessage<UploadRecord[]>("GET_UPLOAD_HISTORY")
  const clearHistory = useMessage("CLEAR_HISTORY")

  useEffect(() => {
    fetchHistory.send().then(setRecords).catch(() => {})
    
  }, [])

  async function handleClear() {
    await clearHistory.send()
    setRecords([])
  }

  if (fetchHistory.loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size={18} />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium text-brand-500 uppercase tracking-wide">
          Recent Uploads
        </span>
        {records.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-brand-400 hover:text-black underline underline-offset-2 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-brand-400">
          No uploads yet
        </p>
      ) : (
        <ul className="divide-y divide-brand-100 max-h-64 overflow-y-auto">
          {records.slice(0, 20).map((record, i) => (
            <HistoryRow key={`${record.problemId}-${record.language}-${i}`} record={record} />
          ))}
        </ul>
      )}
    </div>
  )
}

function HistoryRow({ record }: { record: UploadRecord }) {
  const lang = getDisplayName(record.language)
  const date = new Date(record.timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  })

  return (
    <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-black truncate">
          {record.problemId}. {record.problemTitle}
        </p>
        <p className="text-xs text-brand-400 mt-0.5">
          {lang} · {date}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {record.fileUrl && record.status === "success" && (
          <a
            href={record.fileUrl}
            target="_blank"
            rel="noreferrer"
            title="View on GitHub"
            className="text-brand-400 hover:text-black transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon />
          </a>
        )}
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
    </li>
  )
}

function ExternalLinkIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
