import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";

type Node = { type: "folder"; name: string; path: string; children: Node[] } | { type: "file"; name: string; path: string };

function buildTree(paths: string[]): Node[] {
  const root: Record<string, any> = {};
  for (const p of paths) {
    const parts = p.split("/").filter(Boolean);
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        cur[part] = cur[part] || { __file: true };
      } else {
        cur[part] = cur[part] || {};
        cur = cur[part];
      }
    }
  }
  function toNodes(obj: any, basePath: string): Node[] {
    const folders: Node[] = [];
    const files: Node[] = [];
    for (const key of Object.keys(obj).sort()) {
      const val = obj[key];
      const full = basePath ? `${basePath}/${key}` : key;
      if (val && val.__file) {
        files.push({ type: "file", name: key, path: full });
      } else {
        folders.push({ type: "folder", name: key, path: full, children: toNodes(val, full) });
      }
    }
    return [...folders, ...files];
  }
  return toNodes(root, "");
}

export function FileTree() {
  const { current, selectFile, currentFilePath, deleteFile, snapshot, createFile, renameFile } = useProjectStore();
  const files = current?.files ?? [];
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  const [creating, setCreating] = React.useState<boolean>(false);
  const [createValue, setCreateValue] = React.useState<string>("");
  const createInputRef = React.useRef<HTMLInputElement>(null);

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("bf_tree_open") || "{}");
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    localStorage.setItem("bf_tree_open", JSON.stringify(open));
  }, [open]);

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

  const tree = buildTree(files.map((f) => f.path));

  const renderNode = (node: Node) => {
    if (node.type === "file") {
      return (
        <li key={node.path} className="flex items-center justify-between gap-2">
          {renaming === node.path ? (
            <input
              ref={renameInputRef}
              defaultValue={node.path}
              onBlur={(e) => applyRename(node.path, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyRename(node.path, (e.target as HTMLInputElement).value);
                if (e.key === "Escape") setRenaming(null);
              }}
              className="flex-1 h-8 rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Rename ${node.path}`}
            />
          ) : (
            <button
              onClick={() => selectFile(node.path)}
              className={`text-left flex-1 rounded px-2 py-1 hover:bg-muted ${currentFilePath === node.path ? "bg-muted" : ""}`}
              aria-label={`Open ${node.path}`}
            >
              {node.name}
            </button>
          )}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" aria-label={`Rename ${node.path}`} onClick={() => startRename(node.path)}>
              ✎
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Delete ${node.path}`} onClick={() => onDelete(node.path)}>
              ✕
            </Button>
          </div>
        </li>
      );
    }
    // folder
    const isOpen = open[node.path] ?? true;
    return (
      <li key={node.path}>
        <div className="flex items-center justify-between">
          <button
            className="text-left flex-1 rounded px-2 py-1 hover:bg-muted"
            onClick={() => setOpen((o) => ({ ...o, [node.path]: !isOpen }))}
            aria-label={`Toggle ${node.name}`}
          >
            {isOpen ? "📂" : "📁"} {node.name}
          </button>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" aria-label={`New in ${node.path}`} onClick={() => startCreate(node.path + "/")}>
              ＋
            </Button>
          </div>
        </div>
        {isOpen && node.children.length > 0 && <ul className="ml-4 space-y-1">{node.children.map(renderNode)}</ul>}
      </li>
    );
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
        {tree.length > 0 ? tree.map(renderNode) : !creating && <li className="text-muted-foreground">No files yet</li>}
      </ul>
    </div>
  );
}