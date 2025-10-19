const OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize";

function base64url(bytes: ArrayBuffer) {
  const str = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string) {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return base64url(digest);
}

function randString(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

export type GitHubAuthConfig = {
  clientId: string;
  redirectUri: string;
  scope?: string;
  workerCallbackUrl?: string; // e.g., https://your-worker-domain/oauth/callback
};

export async function startGitHubOAuth(cfg: GitHubAuthConfig) {
  const state = randString(16);
  const code_verifier = randString(64);
  const code_challenge = await sha256(code_verifier);

  sessionStorage.setItem("gh_oauth_state", state);
  sessionStorage.setItem("gh_code_verifier", code_verifier);
  sessionStorage.setItem("gh_redirect_uri", cfg.redirectUri);
  sessionStorage.setItem("gh_worker_callback", cfg.workerCallbackUrl || "");

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    state,
    scope: cfg.scope || "repo",
    response_type: "code",
    code_challenge_method: "S256",
    code_challenge,
  });
  // redirect to GitHub
  window.location.href = `${OAUTH_AUTHORIZE}?${params.toString()}`;
}

export async function completeGitHubOAuth(): Promise<{ access_token?: string; error?: string }> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const expected = sessionStorage.getItem("gh_oauth_state") || "";
  const code_verifier = sessionStorage.getItem("gh_code_verifier") || "";
  const redirect_uri = sessionStorage.getItem("gh_redirect_uri") || "";
  const worker = sessionStorage.getItem("gh_worker_callback") || "";

  if (!code || state !== expected) {
    return { error: "invalid_state_or_code" };
  }

  // Exchange via Worker (keeps client secret out of browser)
  const exUrl = new URL(worker || "/");
  exUrl.pathname = "/oauth/callback";
  exUrl.searchParams.set("code", code);
  exUrl.searchParams.set("state", state);
  exUrl.searchParams.set("code_verifier", code_verifier);

  const resp = await fetch(exUrl.toString(), { method: "GET" });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    return { error: data?.error || "exchange_failed" };
  }
  // Cleanup
  sessionStorage.removeItem("gh_oauth_state");
  sessionStorage.removeItem("gh_code_verifier");
  sessionStorage.removeItem("gh_redirect_uri");
  sessionStorage.removeItem("gh_worker_callback");

  localStorage.setItem("gh_access_token", data.access_token);
  return { access_token: data.access_token };
}

export function getGitHubToken(): string | null {
  return localStorage.getItem("gh_access_token");
}

export function clearGitHubToken() {
  localStorage.removeItem("gh_access_token");
}