import { create } from "zustand";
import JSZip from "jszip";
import { v4 as uuidv4 } from "./uuid";
import type { Project, FileEntry, Snapshot } from "../types";
import { putProject, getProject, listProjects } from "../storage/indexeddb";

type StagedDiff = {
  path: string;
  before: string;
  after: string;
  op: "add" | "modify" | "delete";
};

type State = {
  current?: Project;
  projects: Array<Pick<Project, "id" | "name" | "createdAt">>;
  loading: boolean;
  error?: string;

  currentFilePath?: string;
  staged?: StagedDiff;
  fileLock: boolean;
  previewHtml?: string;
};

type Actions = {
  loadProjects: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  selectFile: (path?: string) => void;
  createFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  upsertFile: (path: string, contents: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  snapshot: (label: string) => Promise<Snapshot>;
  restoreSnapshot: (id: string) => Promise<void>;
  stageDiff: (path: string, after: string) => void;
  approveDiff: () => Promise<void>;
  rejectDiff: () => void;
  exportZip: () => Promise<Blob>;
  importZip: (file: File) => Promise<Project>;
  rebuildPreview: () => void;
};

function buildPreviewHTML(project?: Project): string {
  // If index.html exists, use it. Otherwise generate a simple listing.
  const index = project?.files.find((f) => f.path === "index.html");
  const csp =
    "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src data:; connect-src 'self';";
  if (index) {
    // Inject a bootstrap to proxy console.* to parent via postMessage
    return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>${project?.name ?? "Preview"}</title>
</head>
<body>
${index.contents}
<script>
(function(){
  const origLog = console.log, origErr = console.error, origWarn = console.warn;
  function send(type, args){ try { parent.postMessage({ __bf_console: true, type, args: Array.from(args).map(String) }, "*"); } catch(_){} }
  console.log = function(){ send("log", arguments); origLog.apply(console, arguments); };
  console.error = function(){ send("error", arguments); origErr.apply(console, arguments); };
  console.warn = function(){ send("warn", arguments); origWarn.apply(console, arguments); };
  window.addEventListener("message", (ev) => {
    if (ev.data && ev.data.__bf_ping) {
      parent.postMessage({ __bf_pong: true, ts: Date.now() }, "*");
    }
  });
})();
</script>
</body></html>`;
  }
  const list = (project?.files ?? []).map((f) => `<li>${f.path}</li>`).join("");
  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>${project?.name ?? "Preview"}</title>
<style>body{font-family: system-ui, sans-serif; padding: 1rem;}</style>
</head>
<body>
<h1>${project?.name ?? "Preview"}</h1>
<p>No index.html found. Files:</p>
<ul>${list}</ul>
<script>
(function(){
  const origLog = console.log, origErr = console.error, origWarn = console.warn;
  function send(type, args){ try { parent.postMessage({ __bf_console: true, type, args: Array.from(args).map(String) }, "*"); } catch(_){} }
  console.log = function(){ send("log", arguments); origLog.apply(console, arguments); };
  console.error = function(){ send("error", arguments); origErr.apply(console, arguments); };
  console.warn = function(){ send("warn", arguments); origWarn.apply(console, arguments); };
  window.addEventListener("message", (ev) => {
    if (ev.data && ev.data.__bf_ping) {
      parent.postMessage({ __bf_pong: true, ts: Date.now() }, "*");
    }
  });
})();
</script>
</body></html>`;
}

export const useProjectStore = create<State & Actions>((set, get) => ({
  projects: [],
  loading: false,
  fileLock: false,
  previewHtml: undefined,

  async loadProjects() {
    set({ loading: true });
    try {
      const recs = await listProjects();
      const list = recs.map((r) => ({ id: r.id, name: r.data.name as string, createdAt: r.data.createdAt as number }));
      set({ projects: list, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "Failed to list projects" });
    }
  },

  async createProject(name) {
    const now = Date.now();
    const proj: Project = { id: uuidv4(), name, createdAt: now, files: [], snapshots: [] };
    await putProject({ id: proj.id, data: proj });
    set((s) => ({
      projects: [...s.projects, { id: proj.id, name: proj.name, createdAt: proj.createdAt }],
      current: proj,
      previewHtml: buildPreviewHTML(proj),
    }));
  },

  async openProject(id) {
    const rec = await getProject(id);
    if (!rec) throw new Error("Project not found");
    const proj = rec.data as Project;
    set({ current: proj, previewHtml: buildPreviewHTML(proj) });
  },

  async renameProject(id, name) {
    const state = get();
    const cur = state.current && state.current.id === id ? { ...state.current, name } : state.current;
    if (cur && cur.id === id) {
      await putProject({ id, data: cur });
      set({ current: cur, projects: state.projects.map((p) => (p.id === id ? { ...p, name } : p)), previewHtml: buildPreviewHTML(cur) });
    }
  },

  selectFile(path) {
    set({ currentFilePath: path });
  },

  async createFile(path) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    if (state.current.files.some((f) => f.path === path)) {
      throw new Error("File already exists");
    }
    const now = Date.now();
    const updated: Project = { ...state.current, files: [...state.current.files, { path, contents: "", updatedAt: now }] };
    await putProject({ id: updated.id, data: updated });
    set({ current: updated, currentFilePath: path, previewHtml: buildPreviewHTML(updated) });
  },

  async renameFile(oldPath, newPath) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    if (state.current.files.some((f) => f.path === newPath)) {
      throw new Error("Target exists");
    }
    const files = state.current.files.map((f) => (f.path === oldPath ? { ...f, path: newPath, updatedAt: Date.now() } : f));
    const updated: Project = { ...state.current, files };
    await putProject({ id: updated.id, data: updated });
    set({ current: updated, currentFilePath: state.currentFilePath === oldPath ? newPath : state.currentFilePath, previewHtml: buildPreviewHTML(updated) });
  },

  async upsertFile(path, contents) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    const now = Date.now();
    const existingIdx = state.current.files.findIndex((f) => f.path === path);
    let files: FileEntry[];
    if (existingIdx >= 0) {
      files = state.current.files.slice();
      files[existingIdx] = { path, contents, updatedAt: now };
    } else {
      files = [...state.current.files, { path, contents, updatedAt: now }];
    }
    const updated: Project = { ...state.current, files };
    await putProject({ id: updated.id, data: updated });
    set({ current: updated, previewHtml: buildPreviewHTML(updated) });
  },

  async deleteFile(path) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    const files = state.current.files.filter((f) => f.path !== path);
    const updated: Project = { ...state.current, files };
    await putProject({ id: updated.id, data: updated });
    set({ current: updated, previewHtml: buildPreviewHTML(updated), currentFilePath: state.currentFilePath === path ? undefined : state.currentFilePath });
  },

  async snapshot(label) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    const snap: Snapshot = { id: uuidv4(), label, createdAt: Date.now(), files: state.current.files.map((f) => ({ ...f })) };
    const updated: Project = { ...state.current, snapshots: [...state.current.snapshots, snap] };
    await putProject({ id: updated.id, data: updated });
    set({ current: updated });
    return snap;
  },

  async restoreSnapshot(id) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    const snap = state.current.snapshots.find((s) => s.id === id);
    if (!snap) throw new Error("Snapshot not found");
    const updated: Project = { ...state.current, files: snap.files.map((f) => ({ ...f })), snapshots: state.current.snapshots };
    await putProject({ id: updated.id, data: updated });
    set({ current: updated, previewHtml: buildPreviewHTML(updated) });
  },

  stageDiff(path, after) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    const existing = state.current.files.find((f) => f.path === path);
    const before = existing?.contents ?? "";
    const op: "add" | "modify" | "delete" = after === undefined ? (existing ? "delete" : "add") : existing ? "modify" : "add";
    set({ staged: { path, before, after: after ?? "", op } });
  },

  async approveDiff() {
    const state = get();
    if (!state.current) throw new Error("No project open");
    if (!state.staged) return;
    if (state.fileLock) throw new Error("File lock engaged");
    set({ fileLock: true });
    try {
      if (state.staged.op === "delete") {
        await get().deleteFile(state.staged.path);
      } else {
        await get().upsertFile(state.staged.path, state.staged.after);
      }
      set({ staged: undefined });
    } finally {
      set({ fileLock: false });
    }
  },

  rejectDiff() {
    set({ staged: undefined });
  },

  async exportZip() {
    const state = get();
    if (!state.current) throw new Error("No project open");
    const zip = new JSZip();
    for (const f of state.current.files) {
      zip.file(f.path, f.contents);
    }
    return zip.generateAsync({ type: "blob" });
  },

  async importZip(file) {
    const zip = await JSZip.loadAsync(file);
    const files: FileEntry[] = [];
    const now = Date.now();
    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir) continue;
      const contents = await entry.async("string");
      files.push({ path: entry.name, contents, updatedAt: now });
    }
    const proj: Project = { id: uuidv4(), name: file.name.replace(/\.zip$/i, ""), createdAt: now, files, snapshots: [] };
    await putProject({ id: proj.id, data: proj });
    const state = get();
    set({
      projects: [...state.projects, { id: proj.id, name: proj.name, createdAt: proj.createdAt }],
      current: proj,
      previewHtml: buildPreviewHTML(proj),
    });
    return proj;
  },

  rebuildPreview() {
    const state = get();
    set({ previewHtml: buildPreviewHTML(state.current) });
  },
}));