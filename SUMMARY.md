# LeetCode GitHub Sync — Session Summary

---

## Original Prompt Used

> **Build a production-ready browser extension (Chrome + Edge compatible) that automatically syncs accepted LeetCode solutions to a GitHub repository.**
>
> The extension should **only upload solutions when the submission is Accepted (AC)**.
>
> Use existing APIs, SDKs, and libraries whenever possible. Do not reinvent functionality that already exists. The code should be modular, maintainable, and well documented.
>
> **Technology:** Plasmo (preferred), React, TypeScript, Tailwind CSS, Octokit, GitHub OAuth, Chrome Extension Manifest V3.
>
> **Core Features:**
> 1. Detect Accepted Submission only — ignore Wrong Answer, TLE, Runtime Error, MLE, etc.
> 2. Read submission details — Problem ID, Title, Difficulty, Slug, Language, Code, Time
> 3. GitHub Login via OAuth — Login with GitHub button, secure storage, allow logout
> 4. Repository Selection — browse repos, search, select, save, change, reset
> 5. Upload Structure — `LeetCode/<id> <title>/solution.<ext>`
> 6. Multiple Language Support — all 24+ LeetCode languages, never overwrite other languages
> 7. Naming Convention — `<id> <title>/solution.<ext>`
> 8. Commit Messages — `Add LeetCode #29 - Divide Two Integers (C++)`
> 9. Duplicate Detection — skip if identical, update if changed
> 10. Settings Page — login status, repo, change repo, reset, sync toggle, auto upload, manual sync
> 11. UI — black and white theme, clean, modern, rounded, minimal animations
> 12. Upload Flow — Accepted → Read → Metadata → Check Repo → Save → Commit → Push → Notify
> 13. Notifications — success, already synced, auth expired
> 14. Error Handling — network, OAuth expiry, rate limits, deleted repo, missing permissions
> 15. Security — never expose tokens, chrome.storage, minimum permissions, OAuth best practices
> 16. Manifest V3
> 17. Browser Support — Chrome, Edge, Brave, Opera, Chromium
> 18. Architecture — background/, content/, popup/, options/, github/, leetcode/, storage/, utils/
> 19. Libraries — Octokit, Plasmo, React, TypeScript, Zustand, Tailwind, WebExtension Polyfill
> 20. Bonus — README.md per problem, problem tags, runtime/memory stats, GitHub Enterprise support, manual sync, GitHub Actions, dark/light mode
>
> **Critical Rules:** Do not hallucinate. Do not invent APIs. Every dependency must be real. Every command must be executable. Produce working production-ready code. Follow Manifest V3. No missing files or broken imports.

---

## What Was Built

A complete **Chrome/Edge browser extension** (Manifest V3) that automatically
syncs accepted LeetCode solutions to a GitHub repository.

---

## Project Location

```
C:\Users\study\Downloads\vidddddddddddddddddd\leetcode-github-sync\leetcode-github-sync\
```

---

## Tech Stack

| Tool | Role |
|------|------|
| [Plasmo](https://docs.plasmo.com) | Browser extension framework |
| React 18 | Popup & options page UI |
| TypeScript 5 | All source code |
| Tailwind CSS 3 | Styling (black & white theme) |
| [@octokit/rest](https://github.com/octokit/rest.js) | GitHub API (upload, upsert, duplicate detection) |
| Manifest V3 | Chrome/Edge extension standard |

---

## Project Architecture

```
leetcode-github-sync/
│
├── src/
│   ├── background/
│   │   └── index.ts                   ← Service worker (heart of the extension)
│   │
│   ├── contents/
│   │   └── leetcode.ts                ← Injected into leetcode.com
│   │
│   ├── popup/
│   │   ├── index.tsx                  ← Main popup entry point
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── LoginView.tsx          ← OAuth + PAT login UI
│   │   │   ├── RepoSelector.tsx       ← Searchable repo picker
│   │   │   ├── StatusCard.tsx         ← Sync status + toggle
│   │   │   └── HistoryList.tsx        ← Recent uploads
│   │   └── hooks/
│   │       ├── useExtensionState.ts   ← Loads status from background
│   │       └── useMessage.ts          ← Typed message sender
│   │
│   ├── options/
│   │   └── index.tsx                  ← Full settings page
│   │
│   ├── github/
│   │   ├── api.ts                     ← Octokit wrapper
│   │   └── oauth.ts                   ← OAuth + PAT auth
│   │
│   ├── leetcode/
│   │   ├── graphql.ts                 ← LeetCode GraphQL client
│   │   ├── submission-detector.ts     ← Fetch interceptor + URL observer
│   │   └── readme-generator.ts        ← Generates README.md per problem
│   │
│   ├── storage/
│   │   └── index.ts                   ← chrome.storage.local wrappers
│   │
│   ├── styles/
│   │   └── globals.css                ← Tailwind base
│   │
│   ├── types/
│   │   └── index.ts                   ← All TypeScript interfaces
│   │
│   └── utils/
│       ├── language-map.ts            ← Lang slug → extension + display name
│       ├── path.ts                    ← Builds repo file paths
│       ├── commit-message.ts          ← Git commit message builder
│       ├── retry.ts                   ← Exponential backoff retry
│       └── notifications.ts           ← Browser notification helpers
│
├── assets/
│   ├── icon.png                       ← Plasmo source icon (128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon64.png
│   └── icon128.png
│
├── proxy/
│   ├── worker.js                      ← Cloudflare Worker (OAuth proxy)
│   ├── wrangler.toml                  ← Cloudflare deploy config
│   └── README.md                      ← Proxy setup instructions
│
├── scripts/
│   └── generate-icons.js              ← Auto-generates PNG icons (no deps)
│
├── build/
│   └── chrome-mv3-prod/               ← Final extension (load this in Chrome)
│       ├── manifest.json
│       ├── popup.html
│       ├── options.html
│       ├── popup.*.js
│       ├── options.*.js
│       ├── leetcode.*.js              ← Bundled content script
│       ├── static/background/index.js ← Bundled service worker
│       └── icon*.plasmo.*.png
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── .env.example                       ← Template for GitHub client ID + proxy URL
├── README.md                          ← Full project documentation
└── SUMMARY.md                         ← This file
```

---

## Full Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER ON LEETCODE.COM                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ submits solution
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/contents/leetcode.ts                           │
│                                                                 │
│  Two parallel detection mechanisms:                             │
│                                                                 │
│  [1] Fetch Interceptor (submission-detector.ts)                 │
│      window.fetch patched → watches /check/ polling response    │
│      if state="SUCCESS" AND status_code=10 → fires              │
│                                                                 │
│  [2] URL Observer (submission-detector.ts)                      │
│      history.pushState patched + MutationObserver               │
│      if URL matches /submissions/<id>/ → fires                  │
│                                                                 │
│  Both paths → fetchSubmissionDetails(submissionId)              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/leetcode/graphql.ts                            │
│                                                                 │
│  POST https://leetcode.com/graphql/                             │
│  Query: submissionDetails(submissionId)                         │
│  Returns: code, language, statusCode, runtime, memory,          │
│           problemId, title, slug, difficulty, topicTags         │
│                                                                 │
│  statusCode !== 10?  →  return null (not Accepted, skip)        │
│  statusCode === 10?  →  return SubmissionDetail object          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ SubmissionDetail
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/contents/leetcode.ts                           │
│                                                                 │
│  chrome.runtime.sendMessage({                                   │
│    type: "SUBMISSION_ACCEPTED",                                 │
│    payload: SubmissionDetail                                    │
│  })                                                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/background/index.ts   (Service Worker)         │
│                                                                 │
│  chrome.runtime.onMessage.addListener(...)                      │
│                                                                 │
│  ┌─ Check: autoSyncEnabled? ──── NO  ──► return "skipped"       │
│  │                                                              │
│  ├─ Check: credentials valid? ── NO  ──► notifyAuthExpired()    │
│  │         src/storage/index.ts                                 │
│  │                                                              │
│  ├─ Check: token expired? ────── YES ──► notifyAuthExpired()    │
│  │                                                              │
│  └─ Check: repo selected? ────── NO  ──► throw (no repo)        │
│                                                                 │
│  ▼ All checks passed                                            │
│                                                                 │
│  src/utils/path.ts                                              │
│  → solutionPath() builds:                                       │
│    "LeetCode/29 Divide Two Integers/solution.cpp"               │
│                                                                 │
│  src/utils/commit-message.ts                                    │
│  → "Add LeetCode #29 - Divide Two Integers (C++)"               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/github/api.ts   (Octokit wrapper)              │
│                                                                 │
│  upsertFile(owner, repo, path, content, commitMsg)              │
│                                                                 │
│  ┌─ getExistingFile() → GET /repos/{owner}/{repo}/contents/{path}│
│  │                                                              │
│  ├─ File not found?                                             │
│  │   → uploadFile() → PUT (create new file)                    │
│  │   → return { status: "created" }                             │
│  │                                                              │
│  ├─ File found, content IDENTICAL?                              │
│  │   → return { status: "skipped" }                             │
│  │                                                              │
│  └─ File found, content CHANGED?                                │
│      → uploadFile(sha) → PUT (update existing)                  │
│      → return { status: "updated" }                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/leetcode/readme-generator.ts  (if enabled)     │
│                                                                 │
│  generateReadme(submission, priorUploads)                        │
│  → markdown with: difficulty, link, tags, solutions table,      │
│    runtime, memory, auto-sync credit                            │
│                                                                 │
│  → upsertFile(..., "LeetCode/29 .../README.md", content)        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/storage/index.ts                               │
│                                                                 │
│  addUploadRecord({ problemId, title, language,                  │
│                    status, fileUrl, timestamp })                 │
│  → stored in chrome.storage.local (max 100 records)             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              src/utils/notifications.ts                         │
│                                                                 │
│  status = "created"  → notifySuccess()   ✅ Solution uploaded   │
│  status = "updated"  → notifySuccess()   ✅ Solution updated    │
│  status = "skipped"  → notifySkipped()   — Already synced       │
│  on error            → notifyError()     ⚠ Upload failed        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              On Failure — Retry Queue                           │
│              src/background/index.ts                            │
│                                                                 │
│  pendingQueue.push(submission)                                  │
│  chrome.alarms.create("lgs:retry")                              │
│  → retries with exponential backoff (2m → 4m → 8m → 16m → 30m) │
│  → max 5 attempts                                               │
└─────────────────────────────────────────────────────────────────┘


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     POPUP / OPTIONS UI FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  src/popup/index.tsx
       │
       ├── useExtensionState.ts  → GET_STATUS → background → storage
       │
       ├── Not authenticated?
       │     └── src/popup/components/LoginView.tsx
       │           ├── OAuth button  → TRIGGER_OAUTH → github/oauth.ts
       │           │                   → chrome.identity.launchWebAuthFlow
       │           │                   → proxy/worker.js (code exchange)
       │           └── PAT input     → TRIGGER_OAUTH { pat: "ghp_..." }
       │                               → github/oauth.ts → fetch /user
       │
       ├── Authenticated, no repo?
       │     └── src/popup/components/RepoSelector.tsx
       │           → GET_REPOS → background → github/api.ts
       │           → SET_REPO → background → storage/index.ts
       │
       └── Fully configured?
             ├── src/popup/components/StatusCard.tsx
             │     → shows repo, auto-sync toggle, last upload
             │     → SET_SETTINGS → background → storage
             │
             └── src/popup/components/HistoryList.tsx
                   → GET_UPLOAD_HISTORY → background → storage
                   → shows last 20 uploads with GitHub links


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     MESSAGE PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  All messages: { type: MessageType, payload?: unknown }
  All responses: { success: boolean, data?: T, error?: string }

  SUBMISSION_ACCEPTED   content  → background  upload pipeline
  TRIGGER_OAUTH         popup    → background  login (OAuth or PAT)
  LOGOUT                popup    → background  clear all credentials
  GET_STATUS            popup    → background  full status snapshot
  GET_REPOS             popup    → background  list GitHub repos
  SET_REPO              popup    → background  save selected repo
  GET_SETTINGS          options  → background  load settings
  SET_SETTINGS          options  → background  save settings
  GET_UPLOAD_HISTORY    popup    → background  load history records
  CLEAR_HISTORY         options  → background  wipe history
  MANUAL_SYNC           options  → background  trigger manual sync
```

---

## Data Storage Map

```
chrome.storage.local

  lgs:credentials  →  { accessToken, login, name, avatarUrl, expiresAt? }
  lgs:repo         →  { fullName, owner, name, defaultBranch, isPrivate }
  lgs:settings     →  { autoSyncEnabled, notificationsEnabled, repoFolder,
                        generateReadme, saveStats, githubApiBaseUrl, theme }
  lgs:history      →  UploadRecord[]  (max 100 entries)
  lgs:oauth_state  →  { state, startedAt }  (ephemeral, cleared after auth)
```

---

## GitHub Repo Output Structure

```
YourRepo/
└── LeetCode/
    ├── 1 Two Sum/
    │   ├── solution.py       ← submitted in Python
    │   ├── solution.cpp      ← submitted in C++ (later)
    │   └── README.md         ← auto-generated
    ├── 29 Divide Two Integers/
    │   ├── solution.cpp
    │   ├── solution.rs
    │   └── README.md
    └── 345 Reverse Vowels of a String/
        ├── solution.go
        └── README.md
```

---

## Issues Fixed During Session

| # | Problem | Fix |
|---|---------|-----|
| 1 | `oauth2.client_id` manifest error — Chrome refused to load extension | Removed `oauth2` block and `identity` permission from `package.json` |
| 2 | Tailwind warning — `node_modules` being scanned | Fixed glob: `./**/*.tsx` → `src/**/*.{tsx,ts}` |
| 3 | Build error — Plasmo couldn't find icon PNGs | Wrote `scripts/generate-icons.js` (pure Node.js, zero extra deps) |
| 4 | Template literal syntax issue in minified output | Replaced tagged templates with string concatenation in `graphql.ts` + `leetcode.ts` |

---

## Build Status

```
npm run build      ✅  Zero errors
npm run typecheck  ✅  Zero TypeScript errors
Output             →   build/chrome-mv3-prod/
```

---

## How to Run (Quick Reference)

```bash
# 1. Build
npm run build

# 2. Load in Chrome
#    chrome://extensions → Developer mode ON → Load unpacked → build/chrome-mv3-prod

# 3. Get GitHub PAT
#    https://github.com/settings/tokens/new
#    Scopes: repo + read:user

# 4. Click extension icon → "Use Personal Access Token" → paste → Connect
# 5. Select a repository
# 6. Go to leetcode.com → submit → wait for Accepted → done
```

---

## Supported Languages (24)

`C++` · `Java` · `Python` · `Python 3` · `C` · `C#` · `JavaScript` · `TypeScript`
· `PHP` · `Swift` · `Kotlin` · `Dart` · `Go` · `Ruby` · `Scala` · `Rust`
· `Racket` · `Erlang` · `Elixir` · `MySQL` · `MS SQL` · `Oracle SQL` · `Bash` · `PostgreSQL`

---

*Generated: July 2026*
