import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";

export function FileTree() {
  const { current, selectFile, currentFilePath, deleteFile, snapshot } = useProjectStore();
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

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Files</div>
        <Button size="sm" variant="secondary" onClick={onSnapshot} aria-label="Create snapshot">Snapshot</Button>
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
            <Button size="sm" variant="ghost" aria-label={`Delete ${f.path}`} onClick={() => onDelete(f.path)}>
              ✕
            </Button>
          </li>
        ))}
        {files.length === 0 && <li className="text-muted-foreground">No files yet</li>}
      </ul>
    </div>
  );
}