const OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize";
import { encryptString, decryptString } from "../crypto/keys";

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

const SEC_TOKEN = "sec_gh_access_token";
const SEC_CLIENT_ID = "sec_gh_client_id";
const SEC_WORKER_URL = "sec_gh_worker_url";

export async function saveEncrypted(key: string, val: string) {
  const enc = await encryptString(val);
  localStorage.setItem(key, enc);
}

export async function loadDecrypted(key: string): Promise<string | undefined> {
  const enc = localStorage.getItem(key);
  if (!enc) return undefined;
  try {
    return await decryptString(enc);
  } catch {
    return undefined;
  }
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

export async function completeGitHubOAuth(): Promise<{
  access_token?: string;
  error?: string;
}> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const expected = sessionStorage.getItem("gh_oauth_state") || "";
  const code_verifier = sessionStorage.getItem("gh_code_verifier") || "";
  const _redirect_uri = sessionStorage.getItem("gh_redirect_uri") || "";
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

  await saveEncrypted(SEC_TOKEN, data.access_token);
  return { access_token: data.access_token };
}

export async function getGitHubToken(): Promise<string | null> {
  return (await loadDecrypted(SEC_TOKEN)) || null;
}

export function clearGitHubToken() {
  localStorage.removeItem(SEC_TOKEN);
}

export async function saveGitHubClientConfig(
  clientId: string,
  workerUrl: string,
) {
  await saveEncrypted(SEC_CLIENT_ID, clientId);
  await saveEncrypted(SEC_WORKER_URL, workerUrl);
}

export async function loadGitHubClientConfig(): Promise<{
  clientId?: string;
  workerUrl?: string;
}> {
  const [clientId, workerUrl] = await Promise.all([
    loadDecrypted(SEC_CLIENT_ID),
    loadDecrypted(SEC_WORKER_URL),
  ]);
  return { clientId, workerUrl };
}
