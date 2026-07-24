

import { getDisplayName } from "./language-map"
import type { SubmissionDetail } from "~types"


export function buildCommitMessage(
  submission: SubmissionDetail,
  isUpdate: boolean
): string {
  const verb = isUpdate ? "Update" : "Add"
  const lang = getDisplayName(submission.language)
  return `${verb} LeetCode #${submission.problemId} - ${submission.problemTitle} (${lang})`
}


export function buildReadmeCommitMessage(submission: SubmissionDetail): string {
  return `Update README for LeetCode #${submission.problemId} - ${submission.problemTitle}`
}
