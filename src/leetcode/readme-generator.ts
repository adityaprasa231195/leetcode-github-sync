

import type { ApproachPayload, SubmissionDetail, UploadRecord } from "~types"
import { getDisplayName } from "~utils/language-map"

const DIFFICULTY_LABEL: Record<string, string> = {
  Easy: "🟢 Easy",
  Medium: "🟡 Medium",
  Hard: "🔴 Hard"
}

export function generateReadme(
  submission: SubmissionDetail,
  priorUploads: UploadRecord[],
  approach?: ApproachPayload
): string {
  const difficulty = DIFFICULTY_LABEL[submission.difficulty] ?? submission.difficulty
  const leetcodeUrl = `https://leetcode.com/problems/${submission.problemSlug}/`
  const tags =
    submission.tags.length > 0
      ? submission.tags.map((t) => `\`${t}\``).join(" · ")
      : "_none_"

  const byLanguage = new Map<string, UploadRecord>()

  for (const r of priorUploads) {
    if (r.status === "success") {
      byLanguage.set(r.language, r)
    }
  }

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

  const statsBlock =
    submission.runtime || submission.memory
      ? `\n## Stats (latest submission)\n\n| Metric | Value |\n|--------|-------|\n${submission.runtime ? `| Runtime | ${submission.runtime} |\n` : ""}${submission.memory ? `| Memory  | ${submission.memory} |\n` : ""}`
      : ""

  let approachBlock = ""
  if (approach) {
    const ext = approach.extension.toLowerCase().replace(/^\./, "")
    const approachFile = `approach.${ext}`
    if (["png", "jpg", "jpeg"].includes(ext)) {
      approachBlock = `\n## Approach\n\n![Approach](${approachFile})\n`
    } else if (ext === "pdf") {
      approachBlock = `\n## Approach\n\n📄 [View Solution Approach (PDF)](${approachFile})\n`
    } else if (approach.rawText) {
      approachBlock = `\n## Approach\n\n${approach.rawText.trim()}\n\n[View approach file](${approachFile})\n`
    } else {
      approachBlock = `\n## Approach\n\n[View approach file](${approachFile})\n`
    }
  }

  return `# ${submission.problemId}. ${submission.problemTitle}

**Difficulty:** ${difficulty}  
**Link:** [LeetCode #${submission.problemId}](${leetcodeUrl})  
**Tags:** ${tags}

## Solutions

| Language | File | Date |
|----------|------|------|
${tableRows}
${statsBlock}${approachBlock}
---

_Auto-synced by [LeetCode GitHub Sync](https://github.com/your-username/leetcode-github-sync)._
`
}






function getExt(language: string): string {
  
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
