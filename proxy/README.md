# OAuth Proxy — Cloudflare Worker

This directory contains a minimal Cloudflare Worker that acts as the OAuth
token exchange proxy for the LeetCode GitHub Sync extension.

## Why is this needed?

GitHub OAuth Apps require a `client_secret` to exchange the temporary
authorisation code for an access token. A browser extension cannot keep a
secret — anyone can unpack the `.crx` file. The proxy keeps the secret
server-side and only returns the resulting access token to the extension.

## Deploy in 3 steps

```bash
# 1. Install Wrangler (Cloudflare's CLI)
npm install -g wrangler
wrangler login

# 2. Set your secrets (interactive prompts — never stored in files)
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# 3. Optional: lock CORS to your specific extension
wrangler secret put ALLOWED_EXTENSION_ID   # your chrome extension ID

# 4. Deploy
wrangler deploy
```

Update `wrangler.toml` with your actual domain/route before deploying.

## Free tier

Cloudflare Workers' free tier includes 100,000 requests/day — more than
enough for personal use.

## Alternatives

- Vercel Edge Functions (same concept, different runtime)
- AWS Lambda + API Gateway
- Any Node.js server that can make outbound HTTPS requests

The request/response contract is simple:

**Request:** `POST /api/github-oauth`
```json
{ "code": "...", "state": "...", "redirect_uri": "..." }
```

**Response:** `200 OK`
```json
{ "access_token": "gho_..." }
```
