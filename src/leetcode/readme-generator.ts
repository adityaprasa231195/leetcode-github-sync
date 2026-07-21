/**
 * Generates a per-problem README.md file with problem metadata.
 *
 * The README is stored alongside the solution files:
 *   LeetCode/<id> <title>/README.md
 *
 * It contains:
 *   - Problem number, title, difficulty, and LeetCode link
 *   - Topic tags
 *   - A table of all uploaded solutions (language, runtime, memory, date)
 *
 * When a new language solution is uploaded, the README is re-generated to
 * include the new row.  The function accepts an array of all existing
 * UploadRecord entries for the same problem so the table stays complete.
 */

import type { SubmissionDetail, UploadRecord } from "~types"
import { getDisplayName } from "~utils/language-map"

// Difficulty badge colours (rendered as plain text labels in GitHub markdown)
const DIFFICULTY_LABEL: Record<string, string> = {
  Easy: "🟢 Easy",
  Medium: "🟡 Medium",
  Hard: "🔴 Hard"
}

/**
 * Generates the full README.md content for a problem.
 *
 * @param submission   The latest accepted submission (used for metadata).
 * @param priorUploads Previously uploaded solutions for this problem (may be empty).
 */
export function generateReadme(
  submission: SubmissionDetail,
  priorUploads: UploadRecord[]
): string {
  const difficulty = DIFFICULTY_LABEL[submission.difficulty] ?? submission.difficulty
  const leetcodeUrl = `https://leetcode.com/problems/${submission.problemSlug}/`
  const tags =
    submission.tags.length > 0
      ? submission.tags.map((t) => `\`${t}\``).join(" · ")
      : "_none_"

  // Build the solutions table — deduplicate by language, prefer the latest entry
  const byLanguage = new Map<string, UploadRecord>()

  // Add prior uploads first (older)
  for (const r of priorUploads) {
    if (r.status === "success") {
      byLanguage.set(r.language, r)
    }
  }

  // Overwrite with the current submission so the latest data wins
  const now = Date.now()
  byLanguage.set(submission.language, {
    timestamp: now,
    problemId: submission.problemId,
    problemTitle: submission.problemTitle,
    language: submission.language,
    status: "success",
    message: undefined,
    fileUrl: undefined
  })

  const tableRows = Array.from(byLanguage.values())
    .sort((a, b) => getDisplayName(a.language).localeCompare(getDisplayName(b.language)))
    .map((r) => {
      const lang = getDisplayName(r.language)
      const file = `[solution.${getExt(r.language)}](solution.${getExt(r.language)})`
      const date = new Date(r.timestamp).toISOString().slice(0, 10)
      return `| ${lang} | ${file} | ${date} |`
    })
    .join("\n")

  // Runtime / memory block (only for the current submission if available)
  const statsBlock =
    submission.runtime || submission.memory
      ? `\n## Stats (latest submission)\n\n| Metric | Value |\n|--------|-------|\n${submission.runtime ? `| Runtime | ${submission.runtime} |\n` : ""}${submission.memory ? `| Memory  | ${submission.memory} |\n` : ""}`
      : ""

  return `# ${submission.problemId}. ${submission.problemTitle}

**Difficulty:** ${difficulty}  
**Link:** [LeetCode #${submission.problemId}](${leetcodeUrl})  
**Tags:** ${tags}

## Solutions

| Language | File | Date |
|----------|------|------|
${tableRows}
${statsBlock}
---

_Auto-synced by [LeetCode GitHub Sync](https://github.com/your-username/leetcode-github-sync)._
`
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getExt(language: string): string {
  // Inline minimal map to avoid circular imports between modules
  const map: Record<string, string> = {
    cpp: "cpp", java: "java", python: "py", python3: "py", c: "c",
    csharp: "cs", javascript: "js", typescript: "ts", php: "php",
    swift: "swift", kotlin: "kt", dart: "dart", golang: "go", ruby: "rb",
    scala: "scala", rust: "rs", racket: "rkt", erlang: "erl", elixir: "ex",
    mysql: "sql", mssql: "sql", oraclesql: "sql", bash: "sh",
    postgresql: "sql", cangjie: "cj"
  }
  return map[language.toLowerCase()] ?? "txt"
}
