

export default {
  async fetch(request, env) {
    
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, env)
    }

    if (request.method !== "POST") {
      return corsResponse({ error: "Method not allowed" }, 405, env)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return corsResponse({ error: "Invalid JSON body" }, 400, env)
    }

    const { code, state, redirect_uri } = body

    if (!code || typeof code !== "string") {
      return corsResponse({ error: "Missing or invalid code" }, 400, env)
    }

    
    const githubResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri
        })
      }
    )

    if (!githubResponse.ok) {
      return corsResponse(
        { error: `GitHub returned ${githubResponse.status}` },
        502,
        env
      )
    }

    const data = await githubResponse.json()

    if (data.error) {
      return corsResponse({ error: data.error_description || data.error }, 400, env)
    }

    if (!data.access_token) {
      return corsResponse({ error: "No access_token in GitHub response" }, 502, env)
    }

    
    return corsResponse({ access_token: data.access_token }, 200, env)
  }
}

function corsResponse(body, status, env) {
  const allowedOrigin = env.ALLOWED_EXTENSION_ID
    ? `chrome-extension://${env.ALLOWED_EXTENSION_ID}`
    : "*"

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }

  return new Response(body ? JSON.stringify(body) : null, { status, headers })
}
