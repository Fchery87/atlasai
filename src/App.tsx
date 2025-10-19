import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Separator } from "./components/ui/separator";
import { Button } from "./components/ui/button";
import { ProviderManager } from "./features/providers/ProviderManager";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useProjectStore } from "./lib/store/projectStore";
import { languageFromPath } from "./lib/editor/lang";
import { useDebounced } from "./lib/hooks/useDebounced";

function Header() {
  const { current } = useProjectStore();
  return (
    <header className="sticky top-0 z-10 bg-white/80 bg-blur border-b">
      <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center gap-3">
        <Button size="icon" aria-label="Toggle sidebar">☰</Button>
        <nav aria-label="Breadcrumbs" className="text-sm text-muted-foreground">
          BoltForge {current ? `/ ${current.name}` : ""}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary">Save</Button>
          <Button>Run</Button>
        </div>
      </div>
    </header>
  );
}

function EditorPanel() {
  const { current, currentFilePath, upsertFile, stageDiff, staged, approveDiff, rejectDiff, fileLock } = useProjectStore();
  const file = current?.files.find((f) => f.path === currentFilePath);
  const [code, setCode] = React.useState<string>(file?.contents ?? "// Start coding...\n");
  const debouncedCode = useDebounced(code, 150);
  const lang = languageFromPath(currentFilePath);
  const [formatOnSave, setFormatOnSave] = React.useState<boolean>(() => localStorage.getItem("bf_format_on_save") === "1");

  React.useEffect(() => {
    setCode(file?.contents ?? "");
  }, [currentFilePath, file?.contents]);

  const canStage = !!currentFilePath;
  const onStage = () => {
    if (currentFilePath) stageDiff(currentFilePath, debouncedCode);
  };
  const onSave = async () => {
    if (!currentFilePath) return;
    let output = debouncedCode;
    if (formatOnSave) {
      const { formatContentAsync } = await import("./lib/editor/format");
      output = await formatContentAsync(lang, output);
      setCode(output);
    }
    await upsertFile(currentFilePath, output);
  };

  // Keyboard shortcuts: Cmd/Ctrl+S save, Cmd/Ctrl+Enter stage, Shift+Cmd/Ctrl+Enter approve, Escape reject
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) {
        if (e.key === "Escape" && staged) {
          e.preventDefault();
          rejectDiff();
        }
        return;
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (staged && !fileLock) approveDiff();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onStage();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave, onStage, staged, approveDiff, rejectDiff, fileLock, debouncedCode, currentFilePath, formatOnSave, lang]);

  React.useEffect(() => {
    localStorage.setItem("bf_format_on_save", formatOnSave ? "1" : "0");
  }, [formatOnSave]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Editor (Monaco){currentFilePath ? ` — ${currentFilePath}` : ""}</CardTitle>
        <div className="ml-auto flex items-center gap-3">
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={formatOnSave}
              onChange={(e) => setFormatOnSave(e.currentTarget.checked)}
              aria-label="Format on save"
            />
            Format on save
          </label>
          <Button
            onClick={async () => {
              if (!current || !currentFilePath) return;
              const [{ formatContentAsync }, { languageFromPath: langFrom }] = await Promise.all([
                import("./lib/editor/format"),
                import("./lib/editor/lang"),
              ]);
              const l = langFrom(currentFilePath);
              const formatted = await formatContentAsync(l, debouncedCode);
              setCode(formatted);
            }}
            disabled={!currentFilePath}
            title="Format Document"
            variant="ghost"
          >
            Format
          </Button>
          <Button onClick={onSave} disabled={!currentFilePath} title="Save (Ctrl/Cmd+S)">Save</Button>
          <Button variant="secondary" onClick={onStage} disabled={!canStage} title="Propose Change (Ctrl/Cmd+Enter)">Propose Change</Button>
          {staged && (
            <>
              <Button onClick={approveDiff} disabled={fileLock} title="Approve (Shift+Ctrl/Cmd+Enter)">Approve</Button>
              <Button variant="ghost" onClick={rejectDiff} title="Reject (Esc)">Reject</Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 grow min-h-[200px]">
        <Editor
          height="100%"
          defaultLanguage={lang}
          language={lang}
          value={debouncedCode}
          onChange={(v) => setCode(v ?? "")}
          options={{ fontSize: 13, minimap: { enabled: false } }}
        />
      </CardContent>
    </Card>
  );
}

function DiffPanel() {
  const { staged } = useProjectStore();
  if (!staged) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="justify-between">
          <CardTitle>Diff</CardTitle>
        </CardHeader>
        <CardContent className="grow text-sm text-muted-foreground flex items-center justify-center min-h-[200px]">
          No staged changes
        </CardContent>
      </Card>
    );
  }
  const titleOp = staged.op === "delete" ? "Delete" : staged.op === "add" ? "Add" : "Modify";
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Diff — {staged.path} ({titleOp})</CardTitle>
      </CardHeader>
      <CardContent className="p-0 grow min-h-[200px]">
        {staged.op === "delete" && (
          <div className="px-3 py-2 text-xs bg-amber-50 text-amber-900 border-b border-amber-200">
            This is a delete preview. Approving will remove the file from the project.
          </div>
        )}
        <DiffEditor
          height="100%"
          original={staged.before}
          modified={staged.op === "delete" ? "" : staged.after}
          options={{ readOnly: true, renderSideBySide: true, renderIndicators: true, fontSize: 13, minimap: { enabled: false } }}
        />
      </CardContent>
    </Card>
  );
}

function ChatPanel() {
  const [prompt, setPrompt] = React.useState("");
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent className="grow flex flex-col">
        <div className="flex-1 text-sm text-muted-foreground">Assistant stream will appear here.</div>
        <Separator className="my-2" />
        <form className="flex gap-2" aria-label="Prompt input" onSubmit={(e) => e.preventDefault()}>
          <input
            aria-label="Prompt"
            className="flex-1 h-10 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Ask to edit code..."
            value={prompt}
            onChange={(e) => setPrompt(e.currentTarget.value)}
          />
          <Button type="submit" disabled={!prompt.trim()}>Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PreviewPanel() {
  const { previewHtml } = useProjectStore();
  const { append } = useTerminalStore();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as any;
      if (data && data.__bf_console) {
        append(`[preview] ${data.type}: ${data.args.join(" ")}`);
      } else if (data && data.__bf_pong) {
        append(`[preview] pong ${new Date(data.ts).toLocaleTimeString()}`);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [append]);

  React.useEffect(() => {
    // Ping after load
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ __bf_ping: true }, "*");
    }, 300);
    return () => clearTimeout(t);
  }, [previewHtml]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Preview (Sandbox)</CardTitle>
      </CardHeader>
      <CardContent className="grow p-0">
        <iframe
          ref={iframeRef}
          title="Preview"
          className="w-full h-full"
          sandbox="allow-scripts allow-downloads"
          referrerPolicy="no-referrer"
          srcDoc={previewHtml}
        />
      </CardContent>
    </Card>
  );
}

function TerminalPanel() {
  const { lines, clear } = useTerminalStore();
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Terminal</CardTitle>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={clear} aria-label="Clear terminal" title="Clear">Clear</Button>
        </div>
      </CardHeader>
      <CardContent className="grow">
        <pre className="text-xs overflow-auto max-h-48" aria-live="polite">
          {lines.join("\n")}
        </pre>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const { createProject, exportZip, importZip, current, loadProjects, projects, openProject } = useProjectStore();
  const [name, setName] = React.useState("");
  const fileInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const doCreate = async () => {
    if (!name.trim()) return;
    await createProject(name.trim());
    setName("");
  };

  const doExport = async () => {
    if (!current) return;
    const blob = await exportZip();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.name}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    await importZip(f);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="Project name"
          className="flex-1 h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
        <Button onClick={doCreate} disabled={!name.trim()}>Create</Button>
      </div>
      <div className="flex items-center gap-2">
        <input ref={fileInput} aria-label="Import ZIP" type="file" accept=".zip" onChange={onImport} />
        <Button onClick={doExport} disabled={!current}>Export ZIP</Button>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Projects</div>
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <Button key={p.id} variant="secondary" onClick={() => openProject(p.id)} aria-label={`Open ${p.name}`}>
              {p.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { FileTree } from "./features/files/FileTree";
import { SearchBar } from "./features/search/SearchBar";
import { useTerminalStore } from "./lib/store/terminalStore";
import { SnapshotList } from "./features/snapshots/SnapshotList";
import { CommandPalette, useCommandPalette } from "./features/commands/CommandPalette";
import { GitPanel } from "./features/git/GitPanel";
import { DeployPanel } from "./features/deploy/DeployPanel";

export default function App() {
  const { open, setOpen } = useCommandPalette();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main id="main" className="max-w-screen-2xl mx-auto p-4">
        <section aria-label="Quick Actions" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader><CardTitle>Providers</CardTitle></CardHeader>
            <CardContent><ProviderManager /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
            <CardContent><QuickActions /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Search</CardTitle></CardHeader>
            <CardContent><SearchBar /></CardContent>
          </Card>
        </section>
        <section aria-label="Integrations" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader><CardTitle>Git</CardTitle></CardHeader>
            <CardContent><GitPanel /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Deploy</CardTitle></CardHeader>
            <CardContent><DeployPanel /></CardContent>
          </Card>
        </section>
        <section aria-label="Workbench" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Files</CardTitle></CardHeader>
              <CardContent><FileTree /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Snapshots</CardTitle></CardHeader>
              <CardContent><SnapshotList /></CardContent>
            </Card>
            <TerminalPanel />
          </div>
          <div className="space-y-4 lg:col-span-1">
            <EditorPanel />
            <DiffPanel />
          </div>
          <div className="space-y-4 lg:col-span-1">
            <ChatPanel />
            <PreviewPanel />
          </div>
        </section>
      </main>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </div>
  );
}