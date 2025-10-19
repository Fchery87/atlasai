import JSZip from "jszip";

export type FileEntry = { path: string; contents: string };

export async function packFilesToZip(files: FileEntry[]): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.contents);
  }
  return zip.generateAsync({ type: "blob" });
}