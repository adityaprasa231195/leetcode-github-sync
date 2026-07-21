# LeetCode GitHub Sync

A production-ready Chrome/Edge browser extension that automatically pushes your accepted LeetCode solutions to a GitHub repository — organised, committed, and ready to browse.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-black)
![React](https://img.shields.io/badge/React-18-black)
![Plasmo](https://img.shields.io/badge/Plasmo-0.90-black)

---

## Installation (For Users)

> No Chrome Web Store account needed — just download and load!

**Step 1: Download the Extension**
1. Go to the **[GitHub Releases Page](https://github.com/adityaprasa231195/leetcode-github-sync/releases/latest)**.
2. Under the "Assets" section at the bottom of the latest release, click to download the file named **`chrome-mv3-prod.zip`**.
3. **Unzip** (extract) the downloaded file to a permanent folder on your computer.

**Step 2: Install in Chrome**
1. Open Google Chrome and type **`chrome://extensions/`** in the URL bar.
2. Turn on **Developer mode** (the toggle switch in the top-right corner).
3. Click the **Load unpacked** button in the top-left.
4. Select the **unzipped folder** you extracted in Step 1.
5. The extension is now installed! Click the LeetCode Sync icon in your browser toolbar to sign in and set up your repository.

> **How to update in the future:** Download the new release zip, replace the old folder's contents with the new ones, and click the 🔄 reload button on the `chrome://extensions/` page.



## Features

- **Automatic detection** — intercepts accepted submissions on LeetCode without any manual action
- **Only uploads Accepted** — Wrong Answer, TLE, Runtime Error, and all other non-AC results are ignored
- **Multi-language** — supports every language available on LeetCode (C++, Python, Java, Rust, Go, TypeScript, and 20+ more)
- **Per-language files** — solving the same problem in multiple languages stores all versions side by side, never overwriting another language
- **Duplicate detection** — skips the upload if the file already exists with identical content; updates it if the code has changed
- **README per problem** — generates a `README.md` with difficulty, topic tags, a solutions table, and runtime/memory stats
- **GitHub OAuth + PAT** — supports both GitHub OAuth (via a tiny proxy worker) and Personal Access Tokens
- **Repository selection** — browse and search all your GitHub repos, switch at any time
- **Upload history** — tracks every upload locally with links back to GitHub
- **Retry queue** — failed uploads are automatically retried with exponential backoff
- **GitHub Enterprise** — configurable API base URL
- **Notifications** — browser notifications on success, skip, error, and auth expiry
- **Black-and-white UI** — clean, minimal popup and full options page

---

## Repository structure

```
LeetCode/
  1 Two Sum/
    solution.py
    solution.cpp
    README.md
  29 Divide Two Integers/
    solution.cpp
    solution.rs
    README.md
  345 Reverse Vowels of a String/
    solution.go
    README.md
```

---

## Project layout

```
leetcode-github-sync/
├── src/
│   ├── background/         # Service worker — message routing & upload pipeline
│   ├── contents/           # Content script injected into leetcode.com
│   ├── popup/              # Extension popup (React)
│   │   ├── components/     # Button, Badge, Spinner, LoginView, RepoSelector …
│   │   └── hooks/          # useExtensionState, useMessage
│   ├── options/            # Full settings page (React)
│   ├── github/             # Octokit wrapper + OAuth flow
│   ├── leetcode/           # GraphQL client, submission detector, README generator
│   ├── storage/            # chrome.storage.local typed helpers
│   ├── styles/             # Tailwind base CSS
│   ├── types/              # Shared TypeScript interfaces
│   └── utils/              # Language map, path builder, commit messages, retry, notifications
├── assets/                 # Extension icons
├── proxy/                  # Cloudflare Worker — OAuth token exchange proxy
├── .env.example            # Environment variable template
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 | LTS recommended |
| pnpm | ≥ 8 | `npm i -g pnpm` |
| Git | any | — |
| Chrome / Edge | latest | Manifest V3 required |

---

## Quick start

### 1 — Clone and install

```bash
git clone https://github.com/your-username/leetcode-github-sync.git
cd leetcode-github-sync
pnpm install
```

### 2 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
PLASMO_PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_app_client_id
PLASMO_PUBLIC_TOKEN_EXCHANGE_URL=https://your-proxy.example.com/api/github-oauth
```

> **Skip this step** if you plan to use Personal Access Token (PAT) authentication only — PAT auth works without any server.

### 3 — Development build

```bash
pnpm dev
```

Plasmo watches for file changes and rebuilds automatically. The unpacked extension lives at:

```
build/chrome-mv3-dev/
```

Load it in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select `build/chrome-mv3-dev/`

The extension reloads automatically when you save source files.

### 4 — Production build

```bash
pnpm build
```

Output: `build/chrome-mv3-prod/`

For Microsoft Edge:

```bash
pnpm build:edge
```

Output: `build/edge-mv3-prod/`

### 5 — Package for the Chrome Web Store

```bash
pnpm package
```

Creates a `.zip` file ready to upload to the Chrome Web Store or Edge Add-ons store.

---

## GitHub OAuth setup

OAuth lets users log in with a button click without ever touching a token. It requires two things:

### A — Create a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Fill in:
   - **Application name**: LeetCode GitHub Sync
   - **Homepage URL**: `https://github.com/your-username/leetcode-github-sync`
   - **Authorization callback URL**: `https://<your-extension-id>.chromiumapp.org/github`
     - Get your extension ID by loading the unpacked extension in Chrome — it appears on the `chrome://extensions` page
3. Click **Register application**
4. Copy the **Client ID** → paste into `.env.local` as `PLASMO_PUBLIC_GITHUB_CLIENT_ID`
5. Generate a **Client secret** → you will use this in the proxy step below (never put it in `.env.local`)

### B — Deploy the OAuth proxy

The proxy is a single-file Cloudflare Worker in `proxy/worker.js`. It holds the client secret and exchanges the OAuth code for an access token.

```bash
cd proxy
npm install -g wrangler
wrangler login

# Store secrets (interactive prompts — never stored in any file)
wrangler secret put GITHUB_CLIENT_ID       # paste your client_id
wrangler secret put GITHUB_CLIENT_SECRET   # paste your client_secret

# Optional: lock CORS to your extension only
wrangler secret put ALLOWED_EXTENSION_ID   # your chrome extension id

# Deploy
wrangler deploy
```

Copy the deployed worker URL and paste it into `.env.local` as `PLASMO_PUBLIC_TOKEN_EXCHANGE_URL`.

> See `proxy/README.md` for alternatives (Vercel, AWS Lambda, plain Node.js).

---

## Personal Access Token (PAT) — no server needed

If you prefer not to deploy a proxy server:

1. Click **Login with GitHub** in the popup
2. Choose **Use a Personal Access Token instead**
3. Generate a PAT at [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=repo,read:user&description=LeetCode+GitHub+Sync) with scopes: `repo`, `read:user`
4. Paste it in and click **Connect**

---

## First use walkthrough

1. Click the extension icon → popup opens
2. Click **Login with GitHub** (or use a PAT)
3. After login, click **Select Repository** and choose where to store solutions
4. Solve any LeetCode problem and submit — when the result is **Accepted**, the solution uploads automatically
5. A browser notification confirms the upload with a link to the file on GitHub

---

## Settings

Open the options page via the link in the popup footer or `chrome://extensions` → Details → Extension options.

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-sync | On | Upload solutions automatically on accept |
| Desktop notifications | On | Show browser notifications |
| Generate README | On | Create README.md per problem |
| Save stats | On | Include runtime/memory in README |
| Root folder | `LeetCode` | Top-level folder name in the repo |
| GitHub Enterprise API URL | `https://api.github.com` | Change for self-hosted GitHub |

---

## Supported languages

| Language | File |
|----------|------|
| C++ | `solution.cpp` |
| Java | `solution.java` |
| Python / Python 3 | `solution.py` |
| C | `solution.c` |
| C# | `solution.cs` |
| JavaScript | `solution.js` |
| TypeScript | `solution.ts` |
| PHP | `solution.php` |
| Swift | `solution.swift` |
| Kotlin | `solution.kt` |
| Dart | `solution.dart` |
| Go | `solution.go` |
| Ruby | `solution.rb` |
| Scala | `solution.scala` |
| Rust | `solution.rs` |
| Racket | `solution.rkt` |
| Erlang | `solution.erl` |
| Elixir | `solution.ex` |
| MySQL / MS SQL / Oracle SQL / PostgreSQL | `solution.sql` |
| Bash | `solution.sh` |
| Cangjie | `solution.cj` |

---

## Architecture

```
leetcode.com page
    │  (fetch interceptor + URL observer)
    │  chrome.runtime.sendMessage
    ▼
Background Service Worker
    │  validates settings & credentials
    │  calls GitHub API (Octokit)
    │  records history
    │  fires notifications
    ▼
GitHub Repository
    └── LeetCode/<id> <title>/solution.<ext>
    └── LeetCode/<id> <title>/README.md
```

### Detection strategy

The content script uses two complementary mechanisms so it works regardless of how LeetCode updates its UI:

1. **Fetch interceptor** — wraps `window.fetch` to observe responses from LeetCode's submission check polling endpoint (`/submissions/detail/<id>/check/`). When `status_code === 10` (Accepted), it fires.

2. **URL observer** — watches for SPA navigation to `/problems/<slug>/submissions/<id>/` by patching `history.pushState` and using a `MutationObserver`. This catches cases where the user navigates directly to a submission result page.

Both paths call the LeetCode GraphQL API to fetch the full submission details (code, language, problem metadata, runtime, memory).

### Upload pipeline

```
SUBMISSION_ACCEPTED message received
    → check autoSyncEnabled
    → check credentials (not null, not expired)
    → check selectedRepo
    → build file path: <repoFolder>/<id> <title>/solution.<ext>
    → upsertFile (create or update, skip if identical)
    → upsertFile README.md (if generateReadme enabled)
    → addUploadRecord (local history)
    → show notification
    → on error: queue for retry with exponential backoff via chrome.alarms
```

---

## Security

- Tokens are stored exclusively in `chrome.storage.local` — sandboxed to the extension origin, never accessible to web pages
- `chrome.storage.sync` is intentionally avoided (it would upload credentials to Google's servers)
- The OAuth client secret never leaves the proxy server
- Only the minimum required GitHub scopes are requested: `repo` + `read:user`
- All API calls use `Bearer` token authentication over HTTPS

---

## Browser compatibility

| Browser | Support |
|---------|---------|
| Google Chrome | ✓ Full |
| Microsoft Edge | ✓ Full |
| Brave | ✓ Full (Chromium) |
| Opera | ✓ Full (Chromium) |
| Firefox | ✗ Not supported (uses Manifest V3 / `chrome.*` APIs) |
| Safari | ✗ Not supported |

---

## Known limitations

- **Manual sync of past submissions** — LeetCode does not provide a public API to retrieve a user's full submission history with source code. The "manual sync" feature in the settings page triggers a notification to navigate to the LeetCode submissions tab; bulk historical backfill would require scraping, which is fragile and outside scope.
- **LeetCode CN** — `leetcode.cn` uses a different domain. The content script currently only matches `leetcode.com`. Add `https://leetcode.cn/*` to the `matches` array in `src/contents/leetcode.ts` to enable it.
- **Service worker persistence** — MV3 service workers can be suspended by the browser. A keepalive alarm fires every 24 seconds to reduce the chance of the worker being killed mid-upload. Pending uploads in the retry queue are stored in memory, so they are lost if the service worker is terminated. A future improvement would persist the queue to `chrome.storage.local`.

---

## Development

### Type checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### File structure conventions

- All source code lives under `src/`
- Plasmo auto-discovers:
  - `src/background/index.ts` → service worker
  - `src/contents/*.ts` → content scripts (filename = script ID)
  - `src/popup/index.tsx` → popup page
  - `src/options/index.tsx` → options page
- Path alias `~` maps to `src/` (configured in `tsconfig.json` and recognised by Plasmo)

### Adding a new language

1. Add the slug → extension mapping to `LANGUAGE_EXTENSION` in `src/utils/language-map.ts`
2. Add the display name to `LANGUAGE_DISPLAY` in the same file
3. Add the same mapping to the inline `getExt()` helper in `src/leetcode/readme-generator.ts`
4. Update the `LeetCodeLanguage` union type in `src/types/index.ts`

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss the approach.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a pull request

---

## License

MIT — see `LICENSE` for details.
