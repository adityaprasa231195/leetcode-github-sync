

import { getExtension } from "./language-map"


export function sanitiseName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "") 
    .replace(/\s+/g, " ")         
    .trim()
}


export function folderName(problemId: number, problemTitle: string): string {
  return `${problemId} ${sanitiseName(problemTitle)}`
}


export function solutionPath(
  repoFolder: string,
  problemId: number,
  problemTitle: string,
  language: string
): string {
  const ext = getExtension(language)
  return `${repoFolder}/${folderName(problemId, problemTitle)}/solution.${ext}`
}


export function readmePath(
  repoFolder: string,
  problemId: number,
  problemTitle: string
): string {
  return `${repoFolder}/${folderName(problemId, problemTitle)}/README.md`
}
