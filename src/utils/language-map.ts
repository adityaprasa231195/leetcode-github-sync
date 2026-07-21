/**
 * Maps LeetCode language identifiers to file extensions and display names.
 *
 * LeetCode sends language slugs in submission results (e.g. "cpp", "python3").
 * This module normalises them to file extensions and human-readable labels.
 */

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

/**
 * Returns the file extension for a given LeetCode language slug.
 * Falls back to "txt" if the language is unrecognised.
 */
export function getExtension(language: string): string {
  return LANGUAGE_EXTENSION[language.toLowerCase()] ?? "txt"
}

/**
 * Returns the human-readable display name for a LeetCode language slug.
 * Falls back to the raw slug with first letter capitalised.
 */
export function getDisplayName(language: string): string {
  const key = language.toLowerCase()
  return (
    LANGUAGE_DISPLAY[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
  )
}

/**
 * Normalises a LeetCode language slug to our canonical LeetCodeLanguage type.
 * Unknown slugs are returned as-is (cast).
 */
export function normaliseLanguage(raw: string): LeetCodeLanguage {
  return raw.toLowerCase() as LeetCodeLanguage
}
