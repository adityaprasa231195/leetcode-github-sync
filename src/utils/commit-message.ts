/**
 * Generates clean, consistent GitHub commit messages for solution uploads.
 */

import { getDisplayName } from "./language-map"
import type { SubmissionDetail } from "~types"

/**
 * Generates a commit message for adding or updating a solution file.
 *
 * Examples:
 *   "Add LeetCode #29 - Divide Two Integers (C++)"
 *   "Update LeetCode #29 - Divide Two Integers (Rust)"
 */
export function buildCommitMessage(
  submission: SubmissionDetail,
  isUpdate: boolean
): string {
  const verb = isUpdate ? "Update" : "Add"
  const lang = getDisplayName(submission.language)
  return `${verb} LeetCode #${submission.problemId} - ${submission.problemTitle} (${lang})`
}

/**
 * Generates a commit message for a README update.
 */
export function buildReadmeCommitMessage(submission: SubmissionDetail): string {
  return `Update README for LeetCode #${submission.problemId} - ${submission.problemTitle}`
}
