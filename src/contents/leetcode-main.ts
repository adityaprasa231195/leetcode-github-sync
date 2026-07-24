

import type { PlasmoCSConfig } from "plasmo"
import { interceptFetch, watchUrlChanges } from "~leetcode/submission-detector"
import type { SubmissionDetail } from "~types"

// ---------------------------------------------------------------------------
// Plasmo content script configuration — MAIN world
// ---------------------------------------------------------------------------

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/*"],
  run_at: "document_idle",
  all_frames: false,
  world: "MAIN"
}

// ---------------------------------------------------------------------------
// Message key used for window.postMessage communication
// ---------------------------------------------------------------------------


const LGS_MESSAGE_TYPE = "LGS_SUBMISSION_ACCEPTED"

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------


function handleAcceptedSubmission(submission: SubmissionDetail): void {
  console.info(
    "[LGS] Accepted submission detected: #" + submission.problemId + " " + submission.problemTitle + " (" + submission.language + ")"
  )

  // Post to the ISOLATED world content script
  window.postMessage(
    {
      type: LGS_MESSAGE_TYPE,
      payload: submission
    },
    "*"
  )
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

let cleanupFetch: (() => void) | null = null
let cleanupUrlWatch: (() => void) | null = null

function init() {
  // Install both detection mechanisms
  cleanupFetch = interceptFetch(handleAcceptedSubmission)
  cleanupUrlWatch = watchUrlChanges(handleAcceptedSubmission)

  console.info("[LGS] LeetCode GitHub Sync MAIN world script active")
}

function cleanup() {
  cleanupFetch?.()
  cleanupUrlWatch?.()
}

init()

// Clean up if the content script context is invalidated (e.g. extension update)
window.addEventListener("pagehide", cleanup)
