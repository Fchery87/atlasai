import { create } from "zustand";
import JSZip from "jszip";
import { v4 as uuidv4 } from "./uuid";
import type { Project, FileEntry, Snapshot } from "../types";
import { putProject, getProject, listProjects } from "../storage/indexeddb";

type State = {
  current?: Project;
  projects: Array&lt;Pick&lt;Project, "id" | "name" | "createdAt">&gt;;
  loading: boolean;
  error?: string;
};

type Actions = {
  loadProjects: () => Promise&lt;void>;
  createProject: (name: string) => Promise&lt;void>;
  openProject: (id: string) => Promise&lt;void>;
  renameProject: (id: string, name: string) => Promise&lt;void>;
  upsertFile: (path: string, contents: string) => Promise&lt;void>;
  deleteFile: (path: string) => Promise&lt;void>;
  snapshot: (label: string) => Promise&lt;Snapshot>;
  exportZip: () => Promise&lt;Blob>;
  importZip: (file: File) => Promise&lt;Project>;
};

export const useProjectStore = create&lt;State &amp; Actions>((set, get) => ({
  projects: [],
  loading: false,
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
    set((s) => ({ projects: [...s.projects, { id: proj.id, name: proj.name, createdAt: proj.createdAt }], current: proj }));
  },
  async openProject(id) {
    const rec = await getProject(id);
    if (!rec) throw new Error("Project not found");
    set({ current: rec.data as Project });
  },
  async renameProject(id, name) {
    const state = get();
    const cur = state.current && state.current.id === id ? { ...state.current, name } : state.current;
    if (cur && cur.id === id) {
      await putProject({ id, data: cur });
      set({ current: cur, projects: state.projects.map((p) => (p.id === id ? { ...p, name } : p)) });
    }
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
    set({ current: updated });
  },
  async deleteFile(path) {
    const state = get();
    if (!state.current) throw new Error("No project open");
    const files = state.current.files.filter((f) => f.path !== path);
    const updated: Project = { ...state.current, files };
    await putProject({ id: updated.id, data: updated });
    set({ current: updated });
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
    set({ projects: [...state.projects, { id: proj.id, name: proj.name, createdAt: proj.createdAt }], current: proj });
    return proj;
  },
}));