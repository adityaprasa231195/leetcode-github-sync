

import type { LeetCodeLanguage } from "~types"

/** Map from LeetCode language slug → file extension (without the leading dot). */
export const LANGUAGE_EXTENSION: Record<string, string> = {
  cpp: "cpp",
  java: "java",
  python: "py",
  python3: "py",
  c: "c",
  csharp: "cs",
  javascript: "js",
  typescript: "ts",
  php: "php",
  swift: "swift",
  kotlin: "kt",
  dart: "dart",
  golang: "go",
  ruby: "rb",
  scala: "scala",
  rust: "rs",
  racket: "rkt",
  erlang: "erl",
  elixir: "ex",
  mysql: "sql",
  mssql: "sql",
  oraclesql: "sql",
  bash: "sh",
  postgresql: "sql",
  cangjie: "cj"
}

/** Map from LeetCode language slug → display name used in UI and commit messages. */
export const LANGUAGE_DISPLAY: Record<string, string> = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  python3: "Python 3",
  c: "C",
  csharp: "C#",
  javascript: "JavaScript",
  typescript: "TypeScript",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  golang: "Go",
  ruby: "Ruby",
  scala: "Scala",
  rust: "Rust",
  racket: "Racket",
  erlang: "Erlang",
  elixir: "Elixir",
  mysql: "MySQL",
  mssql: "MS SQL Server",
  oraclesql: "Oracle SQL",
  bash: "Bash",
  postgresql: "PostgreSQL",
  cangjie: "Cangjie"
}


export function getExtension(language: string): string {
  return LANGUAGE_EXTENSION[language.toLowerCase()] ?? "txt"
}


export function getDisplayName(language: string): string {
  const key = language.toLowerCase()
  return (
    LANGUAGE_DISPLAY[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
  )
}


export function normaliseLanguage(raw: string): LeetCodeLanguage {
  return raw.toLowerCase() as LeetCodeLanguage
}
