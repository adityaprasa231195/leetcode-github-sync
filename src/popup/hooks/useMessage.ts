

import { useCallback, useState } from "react"
import type { ExtensionMessage, ExtensionResponse, MessageType } from "~types"

interface UseMsgResult<TData> {
  send: (payload?: unknown) => Promise<TData>
  loading: boolean
  error: string | null
  reset: () => void
}

export function useMessage<TData = unknown>(
  type: MessageType
): UseMsgResult<TData> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => setError(null), [])

  const send = useCallback(
    (payload?: unknown): Promise<TData> => {
      setLoading(true)
      setError(null)

      return new Promise((resolve, reject) => {
        const msg: ExtensionMessage = { type, payload }
        chrome.runtime.sendMessage(msg, (response: ExtensionResponse<TData>) => {
          setLoading(false)
          if (chrome.runtime.lastError) {
            const errMsg =
              chrome.runtime.lastError.message ?? "Background error"
            setError(errMsg)
            reject(new Error(errMsg))
            return
          }
          if (!response?.success) {
            const errMsg = response?.error ?? "Unknown error"
            setError(errMsg)
            reject(new Error(errMsg))
            return
          }
          resolve(response.data as TData)
        })
      })
    },
    [type]
  )

  return { send, loading, error, reset }
}
