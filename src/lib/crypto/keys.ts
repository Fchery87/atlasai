const MASTER_KEY_STORAGE = "bf_master_key";

/**
 * Ensure we have a master key in localStorage.
 * Returns CryptoKey for AES-GCM 256.
 */
export async function getMasterKey(): Promise<CryptoKey> {
  let base64 = localStorage.getItem(MASTER_KEY_STORAGE);
  if (!base64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    base64 = btoa(String.fromCharCode(...raw));
    localStorage.setItem(MASTER_KEY_STORAGE, base64);
  }
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptString(plaintext: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const ctBytes = new Uint8Array(ct);
  const payload = new Uint8Array(iv.length + ctBytes.length);
  payload.set(iv, 0);
  payload.set(ctBytes, iv.length);
  return btoa(String.fromCharCode(...payload));
}

export async function decryptString(encoded: string): Promise<string> {
  const key = await getMasterKey();
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(ptBuf);
}

const PK_NS = "bf_provider_";

export async function saveProviderKey(providerId: string, rawKey: string) {
  const encrypted = await encryptString(rawKey);
  localStorage.setItem(PK_NS + providerId, encrypted);
}

export async function loadProviderKey(providerId: string): Promise<{ plaintext?: string; encrypted?: string }> {
  const encrypted = localStorage.getItem(PK_NS + providerId) || undefined;
  if (!encrypted) return {};
  try {
    const plaintext = await decryptString(encrypted);
    return { plaintext, encrypted };
  } catch {
    return { encrypted };
  }
}

export function clearProviderKey(providerId: string) {
  localStorage.removeItem(PK_NS + providerId);
}