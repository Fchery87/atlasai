import JSZip from "jszip";

export type FileEntry = { path: string; contents: string };

export async function packFilesToZip(files: FileEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.contents);
  }
  return zip.generateAsync({ type: "blob" });
}

export async function sha1Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
