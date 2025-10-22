/**
 * Minimal UUID v4 generator using crypto.getRandomValues.
 */
export function v4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Per RFC 4122 section 4.4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const b = Array.from(bytes, toHex).join("");
  return `${b.substring(0, 8)}-${b.substring(8, 12)}-${b.substring(12, 16)}-${b.substring(16, 20)}-${b.substring(20)}`;
}
