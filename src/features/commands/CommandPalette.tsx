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
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createFile, renameFile, deleteFile, snapshot, exportZip, current, currentFilePath } = useProjectStore();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: "new-file",
      label: "New File",
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
      run: async () => {
        if (!currentFilePath) return;
        const to = prompt("Rename to", currentFilePath);
        if (to && to !== currentFilePath) await renameFile(currentFilePath, to);
      },
    },
    {
      id: "delete-file",
      label: "Delete Current File",
      run: async () => {
        if (!currentFilePath) return;
        if (confirm(`Delete ${currentFilePath}?`)) await deleteFile(currentFilePath);
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
        <ul className="max-h-80 overflow-auto p-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                className="w-full text-left rounded px-2 py-2 hover:bg-muted"
                onClick={async () => {
                  await c.run();
                  onClose();
                }}
              >
                {c.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="text-sm text-muted-foreground px-2 py-2">No commands</li>}
        </ul>
      </div>
    </div>
  );
}