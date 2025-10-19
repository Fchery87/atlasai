import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";

export function FileTree() {
  const { current, selectFile, currentFilePath, deleteFile, snapshot, createFile, renameFile } = useProjectStore();
  const files = current?.files ?? [];

  const onDelete = async (path: string) => {
    if (confirm(`Delete ${path}?`)) {
      await deleteFile(path);
    }
  };

  const onSnapshot = async () => {
    const label = prompt("Snapshot label") || "snapshot";
    await snapshot(label);
  };

  const onCreate = async () => {
    const path = prompt("New file path (e.g., index.html)");
    if (!path) return;
    try {
      await createFile(path);
    } catch (e: any) {
      alert(e?.message ?? "Failed to create file");
    }
  };

  const onRename = async (oldPath: string) => {
    const newPath = prompt("Rename to", oldPath);
    if (!newPath || newPath === oldPath) return;
    try {
      await renameFile(oldPath, newPath);
    } catch (e: any) {
      alert(e?.message ?? "Failed to rename file");
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Files</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onCreate} aria-label="Create file">New</Button>
          <Button size="sm" variant="secondary" onClick={onSnapshot} aria-label="Create snapshot">Snapshot</Button>
        </div>
      </div>
      <ul className="space-y-1">
        {files.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-2">
            <button
              onClick={() => selectFile(f.path)}
              className={`text-left flex-1 rounded px-2 py-1 hover:bg-muted ${currentFilePath === f.path ? "bg-muted" : ""}`}
              aria-label={`Open ${f.path}`}
            >
              {f.path}
            </button>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" aria-label={`Rename ${f.path}`} onClick={() => onRename(f.path)}>
                ✎
              </Button>
              <Button size="sm" variant="ghost" aria-label={`Delete ${f.path}`} onClick={() => onDelete(f.path)}>
                ✕
              </Button>
            </div>
          </li>
        ))}
        {files.length === 0 && <li className="text-muted-foreground">No files yet</li>}
      </ul>
    </div>
  );
}