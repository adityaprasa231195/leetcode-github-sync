

import { getExtension } from "./language-map"


export function sanitiseName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "") // illegal Windows path chars
    .replace(/\s+/g, " ")         // collapse multiple spaces
    .trim()
}

/**
 * Returns the folder name for a problem.
 *
 * @example folderName(29, "Divide Two Integers") → "29 Divide Two Integers"
 */
export function folderName(problemId: number, problemTitle: string): string {
  return `${problemId} ${sanitiseName(problemTitle)}`
}

/**
 * Returns the full path (relative to repo root) for a solution file.
 *
 * @example
 *   solutionPath("LeetCode", 29, "Divide Two Integers", "cpp")
 *   → "LeetCode/29 Divide Two Integers/solution.cpp"
 */
export function solutionPath(
  repoFolder: string,
  problemId: number,
  problemTitle: string,
  language: string
): string {
  const ext = getExtension(language)
  return `${repoFolder}/${folderName(problemId, problemTitle)}/solution.${ext}`
}

/**
 * Returns the path to the README.md for a problem.
 *
 * @example
 *   readmePath("LeetCode", 29, "Divide Two Integers")
 *   → "LeetCode/29 Divide Two Integers/README.md"
 */
export function readmePath(
  repoFolder: string,
  problemId: number,
  problemTitle: string
): string {
  return `${repoFolder}/${folderName(problemId, problemTitle)}/README.md`
}
