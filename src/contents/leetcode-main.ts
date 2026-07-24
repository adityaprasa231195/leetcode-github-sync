

import type { PlasmoCSConfig } from "plasmo"
import { interceptFetch, watchUrlChanges } from "~leetcode/submission-detector"
import type { SubmissionDetail } from "~types"





export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/*"],
  run_at: "document_idle",
  all_frames: false,
  world: "MAIN"
}






const LGS_MESSAGE_TYPE = "LGS_SUBMISSION_ACCEPTED"






function handleAcceptedSubmission(submission: SubmissionDetail): void {
  console.info(
    "[LGS] Accepted submission detected: #" + submission.problemId + " " + submission.problemTitle + " (" + submission.language + ")"
  )

  
  window.postMessage(
    {
      type: LGS_MESSAGE_TYPE,
      payload: submission
    },
    "*"
  )
}





let cleanupFetch: (() => void) | null = null
let cleanupUrlWatch: (() => void) | null = null

function init() {
  
  cleanupFetch = interceptFetch(handleAcceptedSubmission)
  cleanupUrlWatch = watchUrlChanges(handleAcceptedSubmission)

  console.info("[LGS] LeetCode GitHub Sync MAIN world script active")
}

function cleanup() {
  cleanupFetch?.()
  cleanupUrlWatch?.()
}

init()


window.addEventListener("pagehide", cleanup)
