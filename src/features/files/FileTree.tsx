import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";
import { loadDecrypted, saveEncrypted } from "../../lib/oauth/github";

type Node =
  | { type: "folder"; name: string; path: string; children: Node[] }
  | { type: "file"; name: string; path: string };

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
        if (key !== ".keep") {
          files.push({ type: "file", name: key, path: full });
        }
      } else {
        folders.push({
          type: "folder",
          name: key,
          path: full,
          children: toNodes(val, full),
        });
      }
    }
    return [...folders, ...files];
  }
  return toNodes(root, "");
}

function hilite(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark>{match}</mark>
      {after}
    </>
  );
}

function filterNodes(nodes: Node[], q: string): Node[] {
  if (!q.trim()) return nodes;
  const out: Node[] = [];
  for (const n of nodes) {
    if (n.type === "file") {
      if (n.name.toLowerCase().includes(q.toLowerCase())) out.push(n);
    } else {
      const kids = filterNodes(n.children, q);
      if (n.name.toLowerCase().includes(q.toLowerCase()) || kids.length) {
        out.push({ ...n, children: kids });
      }
    }
  }
  return out;
}

export function FileTree() {
  const {
    current,
    selectFile,
    currentFilePath,
    deleteFile,
    snapshot,
    createFile,
    renameFile,
  } = useProjectStore();
  const pid = current?.id;
  const files = current?.files ?? [];
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const v = await loadDecrypted(
        pid ? `sec_help_files:${pid}` : "sec_help_files",
      );
      setShowHelp(v === "1");
    })();
  }, [pid]);
  React.useEffect(() => {
    saveEncrypted(
      pid ? `sec_help_files:${pid}` : "sec_help_files",
      showHelp ? "1" : "0",
    );
  }, [showHelp, pid]);

  React.useEffect(() => {
    const onReset = () => setShowHelp(false);
    window.addEventListener(
      "bf:reset-ui-tips",
      onReset as unknown as EventListener,
    );
    return () =>
      window.removeEventListener(
        "bf:reset-ui-tips",
        onReset as unknown as EventListener,
      );
  }, []);

  const [creating, setCreating] = React.useState<boolean>(false);
  const [creatingPath, setCreatingPath] = React.useState<string | null>(null); // "" for top-level, or folder path
  const [createValue, setCreateValue] = React.useState<string>("");
  const createInputRef = React.useRef<HTMLInputElement>(null);

  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("bf_tree_open") || "{}");
    } catch {
      return {};
    }
  });

  const [q, setQ] = React.useState("");

  // Multi-select
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [anchor, setAnchor] = React.useState<string | null>(null);

  const flattenFiles = React.useCallback((nodes: Node[]): string[] => {
    const out: string[] = [];
    const walk = (ns: Node[]) => {
      ns.forEach((n) => {
        if (n.type === "file") out.push(n.path);
        else walk(n.children);
      });
    };
    walk(nodes);
    return out;
  }, []);

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };
  const clearSelection = () => {
    setSelected(new Set());
    setAnchor(null);
  };
  const selectAll = () => {
    const all = flattenFiles(tree);
    setSelected(new Set(all));
    setAnchor(all.length ? all[0] : null);
  };
  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected file(s)?`)) return;
    for (const p of Array.from(selected)) {
      await deleteFile(p);
    }
    clearSelection();
  };

  const expandParents = (p: string) => {
    const parts = p.split("/").filter(Boolean);
    let cur = "";
    const toOpen: Record<string, boolean> = {};
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur ? `${cur}/${parts[i]}` : parts[i];
      toOpen[cur] = true;
    }
    setOpen((o) => ({ ...o, ...toOpen }));
  };

  const selectWithModifiers = (e: React.MouseEvent, path: string) => {
    // Always expand parents of the target to reveal selection
    expandParents(path);

    if (e.shiftKey) {
      const list = flattenFiles(tree);
      const targetIdx = list.indexOf(path);
      const anchorPath = anchor ?? list[0];
      const anchorIdx = list.indexOf(anchorPath);
      if (targetIdx !== -1 && anchorIdx !== -1) {
        const [start, end] =
          targetIdx > anchorIdx
            ? [anchorIdx, targetIdx]
            : [targetIdx, anchorIdx];
        const range = list.slice(start, end + 1);
        // Expand parents along the whole range to reveal selected files
        range.forEach((rp) => expandParents(rp));
        setSelected(new Set(range));
      }
    } else if (e.metaKey || e.ctrlKey) {
      toggleSelect(path);
      if (!anchor) setAnchor(path);
    } else {
      setSelected(new Set([path]));
      setAnchor(path);
    }
  };

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

  const startCreate = (prefill = "", atPath: string | null = "") => {
    setCreateValue(prefill);
    setCreatingPath(atPath);
    setCreating(true);
  };

  const applyCreate = async () => {
    const raw = createValue.trim();
    const _parent = creatingPath;
    setCreating(false);
    setCreatingPath(null);
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
    const list = flattenFiles(tree);
    const curIdx = list.indexOf(currentFilePath);
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onDelete(currentFilePath);
    } else if (e.key === "F2") {
      e.preventDefault();
      startRename(currentFilePath);
    } else if (e.key.toLowerCase() === "n" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startCreate();
    } else if (e.key === "Enter" && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      selectFile(currentFilePath);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.length === 0) return;
      let nextIdx = curIdx;
      if (e.key === "ArrowDown")
        nextIdx = Math.min(list.length - 1, curIdx + 1);
      else nextIdx = Math.max(0, curIdx - 1);
      const nextPath = list[nextIdx] ?? currentFilePath;
      expandParents(nextPath);
      selectFile(nextPath);
      if (e.shiftKey) {
        // extend selection from anchor to next
        const start = anchor ? list.indexOf(anchor) : 0;
        const [a, b] = nextIdx > start ? [start, nextIdx] : [nextIdx, start];
        const range = list.slice(
          Math.max(0, a),
          Math.min(list.length - 1, b) + 1,
        );
        setSelected(new Set(range));
      } else if (e.metaKey || e.ctrlKey) {
        // toggle only, don't change anchor
        toggleSelect(nextPath);
      } else {
        setSelected(new Set([nextPath]));
        setAnchor(nextPath);
      }
    }
  };

  const fullTree = buildTree(files.map((f) => f.path));
  const tree = filterNodes(fullTree, q);

  // Expand folders that include matches
  React.useEffect(() => {
    if (!q.trim()) return;
    const expandPaths = (nodes: Node[]) => {
      nodes.forEach((n) => {
        if (n.type === "folder") {
          if (
            n.children.length > 0 ||
            n.name.toLowerCase().includes(q.toLowerCase())
          ) {
            setOpen((o) => ({ ...o, [n.path]: true }));
            expandPaths(n.children);
          }
        }
      });
    };
    expandPaths(tree);
  }, [q, JSON.stringify(tree)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Context menu for folders
  const [menu, setMenu] = React.useState<{
    x: number;
    y: number;
    path: string;
  } | null>(null);
  React.useEffect(() => {
    const onClick = () => setMenu(null);
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const renderNode = (node: Node) => {
    if (node.type === "file") {
      return (
        <li
          key={node.path}
          data-path={node.path}
          className="flex items-center justify-between gap-2"
        >
          <input
            type="checkbox"
            aria-label={`Select ${node.path}`}
            checked={selected.has(node.path)}
            onChange={() => toggleSelect(node.path)}
            className="h-4 w-4"
          />
          {renaming === node.path ? (
            <input
              ref={renameInputRef}
              defaultValue={node.path}
              onBlur={(e) => applyRename(node.path, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  applyRename(node.path, (e.target as HTMLInputElement).value);
                if (e.key === "Escape") setRenaming(null);
              }}
              className="flex-1 h-8 rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Rename ${node.path}`}
            />
          ) : (
            <button
              onClick={(e) => {
                selectWithModifiers(e, node.path);
                selectFile(node.path);
              }}
              className={`text-left flex-1 rounded px-2 py-1 hover:bg-muted ${currentFilePath === node.path ? "bg-muted" : ""}`}
              aria-label={`Open ${node.path}`}
              title="Open"
            >
              {typeof hilite(node.name, q) === "string"
                ? node.name
                : hilite(node.name, q)}
            </button>
          )}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Rename ${node.path}`}
              onClick={() => startRename(node.path)}
              title="Rename (F2)"
            >
              ✎
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Delete ${node.path}`}
              onClick={() => onDelete(node.path)}
              title="Delete (Del/Backspace)"
            >
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
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, path: node.path });
            }}
            aria-label={`Toggle ${node.name}`}
            title={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "📂" : "📁"}{" "}
            {typeof hilite(node.name, q) === "string"
              ? node.name
              : hilite(node.name, q)}{" "}
            {node.children.length === 0 && (
              <span className="text-xs text-muted-foreground">(empty)</span>
            )}
          </button>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`New in ${node.path}`}
              onClick={() => startCreate(node.path + "/", node.path)}
              title="New here"
            >
              ＋
            </Button>
          </div>
        </div>
        {isOpen && (
          <ul className="ml-4 space-y-1">
            {creating && creatingPath === node.path && (
              <li className="flex items-center gap-2">
                <input
                  ref={createInputRef}
                  value={createValue}
                  onChange={(e) => setCreateValue(e.currentTarget.value)}
                  onBlur={applyCreate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyCreate();
                    if (e.key === "Escape") {
                      setCreating(false);
                      setCreatingPath(null);
                    }
                  }}
                  placeholder="path/to/file.ext or folder/"
                  className="flex-1 h-8 rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`New file in ${node.path}`}
                />
                <Button size="sm" onClick={applyCreate} title="Add">
                  Add
                </Button>
              </li>
            )}
            {node.children.map(renderNode)}
          </ul>
        )}
      </li>
    );
  };

  // Rubber-band (drag) selection
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const dragStart = React.useRef<{
    x: number;
    y: number;
    union: boolean;
  } | null>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    // Only left click and not on interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, a, textarea, select")) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragStart.current = { x, y, union: e.metaKey || e.ctrlKey };
    setDrag({ x, y, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sx = dragStart.current.x;
    const sy = dragStart.current.y;
    const minX = Math.min(sx, x);
    const minY = Math.min(sy, y);
    const w = Math.abs(x - sx);
    const h = Math.abs(y - sy);
    setDrag({ x: minX, y: minY, w, h });

    // Hit test file rows
    const lis = Array.from(
      containerRef.current.querySelectorAll("li[data-path]"),
    ) as HTMLLIElement[];
    const hits: string[] = [];
    const abs = containerRef.current.getBoundingClientRect();
    for (const li of lis) {
      const r = li.getBoundingClientRect();
      const rx = r.left - abs.left;
      const ry = r.top - abs.top;
      const rw = r.width;
      const rh = r.height;
      const intersects = !(
        rx > minX + w ||
        rx + rw < minX ||
        ry > minY + h ||
        ry + rh < minY
      );
      if (intersects) {
        const p = li.getAttribute("data-path");
        if (p) hits.push(p);
      }
    }
    if (dragStart.current.union) {
      setSelected((prev) => new Set([...Array.from(prev), ...hits]));
    } else {
      setSelected(new Set(hits));
    }
  };

  const onMouseUp = () => {
    dragStart.current = null;
    setDrag(null);
  };

  return (
    <div
      ref={containerRef}
      className="text-sm relative"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      aria-label="File tree"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold flex items-center gap-2">
          Files
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp((v) => !v)}
            aria-label="Files help"
          >
            ?
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem(
                pid ? `sec_help_files:${pid}` : "sec_help_files",
              );
              setShowHelp(false);
            }}
            aria-label="Reset Files UI tips"
            title="Reset Files UI tips"
          >
            Reset UI Tips
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={deleteSelected}
                aria-label="Delete selected"
                title="Delete selected"
              >
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={clearSelection}
                aria-label="Clear selection"
                title="Clear selection"
              >
                Clear
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => startCreate("", "")}
                aria-label="Create file"
                title="New (Ctrl/Cmd+N)"
              >
                New
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const name = prompt("New folder name");
                  if (!name) return;
                  const path = name.replace(/\/+$/g, "");
                  try {
                    await createFile((path ? path : "folder") + "/.keep");
                  } catch (e: any) {
                    alert(e?.message ?? "Failed to create folder");
                  }
                }}
                aria-label="Create folder"
                title="New Folder"
              >
                New Folder
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onSnapshot}
                aria-label="Create snapshot"
                title="Create Snapshot"
              >
                Snapshot
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={selectAll}
                aria-label="Select all"
                title="Select all"
              >
                Select All
              </Button>
            </>
          )}
        </div>
      </div>
      {showHelp && (
        <div className="text-xs text-muted-foreground border rounded-md p-2 mb-2">
          - Use New to create files; end with “/” to create a folder placeholder
          (.keep).
          <br />
          - Right-click a folder for context actions (new here, delete empty).
          <br />- Multi-select with Shift/Ctrl/Cmd or drag to select; use Delete
          Selected.
        </div>
      )}
      <div className="mb-2">
        <input
          aria-label="Filter files"
          className="w-full h-8 rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Quick-jump filter..."
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
      </div>
      <ul className="space-y-1">
        {creating && creatingPath === "" && (
          <li className="flex items-center gap-2">
            <input
              ref={createInputRef}
              value={createValue}
              onChange={(e) => setCreateValue(e.currentTarget.value)}
              onBlur={applyCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setCreatingPath(null);
                }
              }}
              placeholder="path/to/file.ext or folder/"
              className="flex-1 h-8 rounded-md border border-input px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="New file path"
            />
            <Button size="sm" onClick={applyCreate} title="Add">
              Add
            </Button>
          </li>
        )}
        {tree.length > 0
          ? tree.map((n) => {
              if (n.type === "file") {
                // ensure data-path on li via renderNode, fallback here if top-level
                return (
                  <li key={n.path} data-path={n.path}>
                    {renderNode(n)}
                  </li>
                );
              }
              return renderNode(n);
            })
          : !creating && (
              <li className="text-muted-foreground">No files yet</li>
            )}
      </ul>
      {drag && (
        <div
          className="absolute border-2 border-blue-400/60 bg-blue-400/10 pointer-events-none"
          style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}
        />
      )}
      {menu && (
        <div
          className="fixed z-50 rounded-md border bg-card shadow-lg text-sm"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          <button
            className="block w-full text-left px-3 py-2 hover:bg-muted"
            onClick={() => {
              startCreate(menu.path + "/", menu.path);
              setMenu(null);
            }}
          >
            New file here
          </button>
          <button
            className="block w-full text-left px-3 py-2 hover:bg-muted"
            onClick={() => {
              startCreate(menu.path + "/", menu.path);
              setMenu(null);
            }}
          >
            New folder here
          </button>
          <button
            className="block w-full text-left px-3 py-2 hover:bg-muted text-red-600"
            onClick={async () => {
              // Delete folder if empty (.keep allowed)
              const hasNonKeep = (current?.files ?? []).some(
                (f) =>
                  f.path.startsWith(menu.path + "/") &&
                  !f.path.endsWith("/.keep"),
              );
              if (hasNonKeep) {
                alert("Folder is not empty.");
              } else {
                const keepPath = menu.path + "/.keep";
                if ((current?.files ?? []).some((f) => f.path === keepPath)) {
                  await deleteFile(keepPath);
                } else {
                  alert("Folder is already empty.");
                }
              }
              setMenu(null);
            }}
          >
            Delete folder (if empty)
          </button>
        </div>
      )}
    </div>
  );
}
