import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";

export function FileTree() {
  const { current, selectFile, currentFilePath, deleteFile, snapshot, createFile, renameFile } = useProjectStore();
  const files = current?.files ?? [];
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  const [creating, setCreating] = React.useState<boolean>(false);
  const [createValue, setCreateValue] = React.useState<string>("");
  const createInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  React.useEffect(() => {
    if (creating) {
      createInputRef.current?.focus();
      createInputRef.current?.select();
    }
  }, [creating]);

  const onDelete = async (path: string) => {
    if (confirm(`Delete ${path}?`)) {
      await deleteFile(path);
    }
  };

  const onSnapshot = async () => {
    const label = prompt("Snapshot label") || "snapshot";
    await snapshot(label);
  };

  const startCreate = (prefill = "") => {
    setCreateValue(prefill);
    setCreating(true);
  };

  const applyCreate = async () => {
    const raw = createValue.trim();
    setCreating(false);
    if (!raw) return;
    const path = raw.endsWith("/") ? raw + "untitled.txt" : raw;
    try {
      await createFile(path);
    } catch (e: any) {
      alert(e?.message ?? "Failed to create file");
    }
  };

  const startRename = (path: string) => setRenaming(path);

  const applyRename = async (oldPath: string, newPathRaw: string) => {
    const newPath = newPathRaw.trim();
    setRenaming(null);
    if (!newPath || newPath === oldPath) return;
    try {
      await renameFile(oldPath, newPath);
    } catch (e: any) {
      alert(e?.message ?? "Failed to rename file");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!currentFilePath) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDelete(currentFilePath);
    } else if (e.key === "F2") {
      e.preventDefault();
      startRename(currentFilePath);
    } else if ((e.key.toLowerCase() === "n") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startCreate();
    } else if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      selectFile(currentFilePath);
    }
  };

  return (
    <div className="text-sm" tabIndex={0} onKeyDown={onKeyDown} aria-label="File tree">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Files</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => startCreate()} aria-label="Create file">New</Button>
          <Button size="sm" variant="secondary" onClick={() => startCreate("folder/")} aria-label="Create folder">New Folder</Button>
          <Button size="sm" variant="secondary" onClick={onSnapshot} aria-label="Create snapshot">Snapshot</Button>
        </div>
      </div>
      <ul className="space-y-1">
        {creating && (
          <li className="flex items-center gap-2">
            <input
              ref={createInputRef}
              value={createValue}
              onChange={(e) => setCreateValue(e.currentTarget.value)}
              onBlur={applyCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="path/to/file.ext or folder/"
              className="flex-1 h-8 rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="New file path"
            />
            <Button size="sm" onClick={applyCreate}>Add</Button>
          </li>
        )}
        {files.map((f) => (
          <li key={f.path} className="flex items-center justify-between gap-2">
            {renaming === f.path ? (
              <input
                ref={renameInputRef}
                defaultValue={f.path}
                onBlur={(e) => applyRename(f.path, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyRename(f.path, (e.target as HTMLInputElement).value);
                  if (e.key === "Escape") setRenaming(null);
                }}
                className="flex-1 h-8 rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Rename ${f.path}`}
              />
            ) : (
              <button
                onClick={() => selectFile(f.path)}
                className={`text-left flex-1 rounded px-2 py-1 hover:bg-muted ${currentFilePath === f.path ? "bg-muted" : ""}`}
                aria-label={`Open ${f.path}`}
              >
                {f.path}
              </button>
            )}
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" aria-label={`Rename ${f.path}`} onClick={() => startRename(f.path)}>
                ✎
              </Button>
              <Button size="sm" variant="ghost" aria-label={`Delete ${f.path}`} onClick={() => onDelete(f.path)}>
                ✕
              </Button>
            </div>
          </li>
        ))}
        {files.length === 0 && !creating && <li className="text-muted-foreground">No files yet</li>}
      </ul>
    </div>
  );
}