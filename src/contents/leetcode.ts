

import type { PlasmoCSConfig } from "plasmo"
import type { ExtensionMessage, SubmissionDetail } from "~types"

// ---------------------------------------------------------------------------
// Plasmo content script configuration — ISOLATED world (default)
// ---------------------------------------------------------------------------

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/*"],
  run_at: "document_idle",
  all_frames: false
}

// ---------------------------------------------------------------------------
// Message key — must match the one in leetcode-main.ts
// ---------------------------------------------------------------------------

const LGS_MESSAGE_TYPE = "LGS_SUBMISSION_ACCEPTED"

// ---------------------------------------------------------------------------
// Submission detail shape validator
// ---------------------------------------------------------------------------


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

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

function onWindowMessage(event: MessageEvent): void {
  // Only accept messages from the same window (same-origin MAIN world script)
  if (event.source !== window) return

  const data = event.data
  if (typeof data !== "object" || data === null) return
  if (data.type !== LGS_MESSAGE_TYPE) return

  const payload = data.payload
  if (!isSubmissionDetail(payload)) {
    console.warn("[LGS] Received invalid submission payload, ignoring:", payload)
    return
  }

  forwardToBackground(payload)
}


async function forwardToBackground(submission: SubmissionDetail): Promise<void> {
  console.info(
    "[LGS] Forwarding submission to background: #" + submission.problemId + " " + submission.problemTitle
  )

  const message: ExtensionMessage<SubmissionDetail> = {
    type: "SUBMISSION_ACCEPTED",
    payload: submission
  }

  try {
    await chrome.runtime.sendMessage(message)
  } catch (err) {
    // Background worker may not be ready yet on first load; log and continue.
    console.warn("[LGS] Could not reach background worker:", err)
  }
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

window.addEventListener("message", onWindowMessage)

console.info("[LGS] LeetCode GitHub Sync ISOLATED world bridge active")

// Clean up on unload
window.addEventListener("pagehide", () => {
  window.removeEventListener("message", onWindowMessage)
})
