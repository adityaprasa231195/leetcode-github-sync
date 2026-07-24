

import { useCallback, useEffect, useState } from "react"
import type { ExtensionMessage, ExtensionResponse, ExtensionStatus } from "~types"

interface UseExtensionStateResult {
  status: ExtensionStatus | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useExtensionState(): UseExtensionStateResult {
  const [status, setStatus] = useState<ExtensionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)

    const msg: ExtensionMessage = { type: "GET_STATUS" }
    chrome.runtime.sendMessage(msg, (response: ExtensionResponse<ExtensionStatus>) => {
      setLoading(false)
      if (chrome.runtime.lastError) {
        setError(chrome.runtime.lastError.message ?? "Could not reach background worker")
        return
      }
      if (!response?.success || !response.data) {
        setError(response?.error ?? "Unknown error")
        return
      }
      setStatus(response.data)
    })
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [refresh])

  return { status, loading, error, refresh }
}
