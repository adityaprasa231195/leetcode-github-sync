import cssText from "data-text:~styles/globals.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"
import { ApproachUploadForm } from "~components/ApproachUploadForm"
import { getSettings } from "~storage"
import type {
  ExtensionMessage,
  PendingSubmission,
  SubmissionDetail,
  UploadRecord
} from "~types"
import { getDisplayName } from "~utils/language-map"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/*"],
  run_at: "document_idle",
  all_frames: false
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

const LGS_MESSAGE_TYPE = "LGS_SUBMISSION_ACCEPTED"

function isSubmissionDetail(data: unknown): data is SubmissionDetail {
  if (typeof data !== "object" || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.problemId === "number" &&
    typeof obj.problemTitle === "string" &&
    typeof obj.problemSlug === "string" &&
    typeof obj.language === "string" &&
    typeof obj.code === "string" &&
    typeof obj.submissionId === "string"
  )
}

export default function LeetCodeApproachModal() {
  const [activeSubmission, setActiveSubmission] =
    useState<SubmissionDetail | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    async function checkExistingPending() {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "GET_PENDING_SUBMISSION"
        })
        if (response && response.success && response.data) {
          const pending = response.data as PendingSubmission
          if (pending?.submission) {
            const currentSlug = window.location.pathname.split("/")[2]
            if (
              !currentSlug ||
              currentSlug === pending.submission.problemSlug
            ) {
              setActiveSubmission(pending.submission)
              setIsOpen(true)
            }
          }
        }
      } catch {
        
      }
    }

    checkExistingPending()
  }, [])

  useEffect(() => {
    async function onWindowMessage(event: MessageEvent) {
      if (event.source !== window) return
      const data = event.data
      if (typeof data !== "object" || data === null) return
      if (data.type !== LGS_MESSAGE_TYPE) return

      const payload = data.payload
      if (!isSubmissionDetail(payload)) {
        console.warn("[LGS] Received invalid submission payload, ignoring:", payload)
        return
      }

      const settings = await getSettings().catch(() => null)
      const requireApproach = settings ? settings.requireApproach : true

      const forwardMessage: ExtensionMessage<SubmissionDetail> = {
        type: "SUBMISSION_ACCEPTED",
        payload
      }
      chrome.runtime.sendMessage(forwardMessage).catch((err) => {
        console.warn("[LGS] Could not notify background:", err)
      })

      if (requireApproach) {
        setActiveSubmission(payload)
        setIsOpen(true)
      }
    }

    window.addEventListener("message", onWindowMessage)
    return () => {
      window.removeEventListener("message", onWindowMessage)
    }
  }, [])

  function handleDismiss() {
    setIsOpen(false)
  }

  function handleSuccess(_record: UploadRecord) {
    setTimeout(() => {
      setIsOpen(false)
      setActiveSubmission(null)
    }, 1500)
  }

  if (!isOpen || !activeSubmission) {
    return null
  }

  const difficultyColors: Record<string, string> = {
    Easy: "bg-green-100 text-green-700 border-green-200",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Hard: "bg-red-100 text-red-700 border-red-200"
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px"
      }}
    >
      <div className="bg-white text-gray-900 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-slide-up">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs select-none">
              LC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900 leading-tight">
                  #{activeSubmission.problemId} {activeSubmission.problemTitle}
                </h2>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    difficultyColors[activeSubmission.difficulty] ||
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {activeSubmission.difficulty}
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  {getDisplayName(activeSubmission.language)}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                LeetCode GitHub Sync · Upload Problem Approach
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full text-gray-400 hover:text-black hover:bg-gray-200 flex items-center justify-center text-sm font-semibold transition-colors"
            title="Dismiss for now (you can upload later from the extension popup)"
          >
            ✕
          </button>
        </header>

        <div className="p-5">
          <ApproachUploadForm
            submission={activeSubmission}
            onSuccess={handleSuccess}
            onCancel={handleDismiss}
          />
        </div>
      </div>
    </div>
  )
}
