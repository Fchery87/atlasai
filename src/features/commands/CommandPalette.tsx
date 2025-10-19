import * as React from "react";
import { useProjectStore } from "../../lib/store/projectStore";

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

type Command = {
  id: string;
  label: string;
  run: () => Promise<void> | void;
  hint?: string;
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createFile, renameFile, deleteFile, snapshot, current, currentFilePath, upsertFile } = useProjectStore();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: "new-file",
      label: "New File",
      hint: "Ctrl/Cmd+N in Files",
      run: async () => {
        const path = prompt("New file path");
        if (path) await createFile(path);
      },
    },
    {
      id: "new-folder",
      label: "New Folder",
      run: async () => {
        const path = prompt("New folder path");
        if (path) await createFile(path.replace(/\\/?$/, "/") + "untitled.txt");
      },
    },
    {
      id: "rename-file",
      label: "Rename Current File",
      hint: "F2",
      run: async () => {
        if (!currentFilePath) return;
        const to = prompt("Rename to", currentFilePath);
        if (to && to !== currentFilePath) await renameFile(currentFilePath, to);
      },
    },
    {
      id: "delete-file",
      label: "Delete Current File",
      hint: "Del/Backspace in Files",
      run: async () => {
        if (!currentFilePath) return;
        if (confirm(`Delete ${currentFilePath}?`)) await deleteFile(currentFilePath);
      },
    },
    {
      id: "format-doc",
      label: "Format Document",
      run: async () => {
        if (!current || !currentFilePath) return;
        const f = current.files.find((x) => x.path === currentFilePath);
        if (!f) return;
        const [{ formatContentAsync }, { languageFromPath }] = await Promise.all([
          import("../../lib/editor/format"),
          import("../../lib/editor/lang"),
        ]);
        const lang = languageFromPath(currentFilePath);
        const formatted = await formatContentAsync(lang, f.contents);
        await upsertFile(currentFilePath, formatted);
      },
    },
    {
      id: "snapshot",
      label: "Create Snapshot",
      run: async () => {
        const label = prompt("Snapshot label") || "snapshot";
        await snapshot(label);
      },
    },
    {
      id: "export-zip",
      label: "Export ZIP",
      run: async () => {
        if (!current) return;
        const blob = await (await import("../../lib/store/projectStore")).useProjectStore.getState().exportZip();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${current.name}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      },
    },
  ];

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const shortcutList = [
    { k: "Ctrl/Cmd+S", d: "Save" },
    { k: "Ctrl/Cmd+Enter", d: "Propose change" },
    { k: "Shift+Ctrl/Cmd+Enter", d: "Approve staged change" },
    { k: "Escape", d: "Reject staged change / Close dialogs" },
    { k: "Ctrl/Cmd+N", d: "New file (in Files)" },
    { k: "F2", d: "Rename selected file (in Files)" },
    { k: "Delete/Backspace", d: "Delete selected file (in Files)" },
    { k: "Ctrl/Cmd+K", d: "Toggle command palette" },
    { k: "↑/↓, Shift+↑/↓", d: "Navigate/extend selection (in Files)" },
  ];

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-24 -translate-x-1/2 w-full max-w-lg rounded-lg border bg-card shadow-lg">
        <div className="p-3 border-b">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Type a command..."
            aria-label="Command"
            className="w-full h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          <ul>
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  className="w-full text-left rounded px-2 py-2 hover:bg-muted flex items-center justify-between gap-2"
                  onClick={async () => {
                    await c.run();
                    onClose();
                  }}
                >
                  <span>{c.label}</span>
                  {c.hint && <span className="text-xs text-muted-foreground">{c.hint}</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="text-sm text-muted-foreground px-2 py-2">No commands</li>}
          </ul>
          {!query && (
            <div className="mt-3 border-t pt-2">
              <div className="text-xs font-semibold mb-1">Keyboard shortcuts</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {shortcutList.map((s) => (
                  <li key={s.k} className="flex items-center justify-between">
                    <span>{s.d}</span>
                    <span>{s.k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}