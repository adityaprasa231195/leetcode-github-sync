/**
 * LeetCode content script — MAIN world.
 *
 * Injected into every page matching https://leetcode.com/* in the MAIN world,
 * meaning it shares the page's JavaScript execution context. This is required
 * so we can:
 *   - Patch the real window.fetch (the one LeetCode's code uses)
 *   - Patch history.pushState / replaceState for SPA navigation detection
 *   - Access document.cookie for the CSRF token needed by GraphQL
 *
 * This script CANNOT use chrome.runtime.sendMessage (that API is only
 * available in the extension's ISOLATED world). Instead, detected submissions
 * are forwarded to the ISOLATED-world companion script (leetcode.ts) via
 * window.postMessage.
 *
 * Plasmo picks up this file automatically because it lives in src/contents/.
 * The `config` export tells Plasmo the match pattern, run_at, and world.
 */

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

/**
 * A unique message type string used to communicate between the MAIN world
 * (this script) and the ISOLATED world (leetcode.ts). Using a namespaced
 * string to avoid collisions with other extensions or page scripts.
 */
const LGS_MESSAGE_TYPE = "LGS_SUBMISSION_ACCEPTED"

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Called whenever an Accepted submission is detected by either the fetch
 * interceptor or the URL observer.
 *
 * Posts the submission details to the ISOLATED world companion script via
 * window.postMessage. The ISOLATED script will forward it to the background
 * service worker via chrome.runtime.sendMessage.
 */
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
