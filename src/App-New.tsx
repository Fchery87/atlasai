import * as React from "react";
import {
  Sidebar,
  SidebarItem,
  SidebarDivider,
} from "./components/layout/Sidebar";
import { Button } from "./components/ui/button";
import { ProviderManager } from "./features/providers/ProviderManager";
import {
  LazyEditor as Editor,
  LazyDiffEditor as DiffEditor,
} from "./components/editor/LazyMonaco";
import { useProjectStore } from "./lib/store/projectStore";
import { languageFromPath } from "./lib/editor/lang";
import { useDebounced } from "./lib/hooks/useDebounced";
import { SplitPane } from "./components/layout/SplitPane";
import { getTruncationInfo } from "./lib/perf/limits";
import { FileTree } from "./features/files/FileTree";
import { SnapshotList } from "./features/snapshots/SnapshotList";
import { CommandPalette, useCommandPalette } from "./features/commands";
import { GitPanel } from "./features/git/GitPanel";
import { DeployPanel } from "./features/deploy/DeployPanel";
import { TemplatesGallery } from "./features/templates/TemplatesGallery";
import { ComponentShowcase } from "./components/examples/ComponentShowcase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { RelayConfigPanel } from "./features/relay/RelayConfig";
import { Separator } from "./components/ui/separator";

// Icons using Unicode symbols for now (can replace with icon library later)
const Icons = {
  files: "📁",
  search: "🔍",
  git: "🌿",
  chat: "💬",
  settings: "⚙️",
  terminal: "⌨️",
  deploy: "🚀",
  templates: "📋",
};

function ModernHeader() {
  const { current, currentFilePath } = useProjectStore();
  return (
    <header className="h-12 bg-sidebar border-b border-border/40 flex items-center px-4 justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AtlasAI
          </span>
          {current && (
            <>
              <span className="text-muted-foreground text-sm">/</span>
              <span className="text-sm text-foreground/80">{current.name}</span>
            </>
          )}
        </div>
        {currentFilePath && (
          <div className="flex items-center gap-2 ml-8">
            <div className="px-3 py-1 bg-editor-bg rounded text-sm">
              {currentFilePath}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          Save
        </Button>
        <Button size="sm">Run</Button>
      </div>
    </header>
  );
}

function EditorPanel() {
  const {
    current,
    currentFilePath,
    upsertFile,
    stageDiff,
    staged,
    approveDiff,
    rejectDiff,
    fileLock,
    undoStack,
    redoStack,
    undoLastApply,
    redoLastApply,
  } = useProjectStore();
  const file = current?.files.find((f) => f.path === currentFilePath);
  const [code, setCode] = React.useState<string>(
    file?.contents ?? "// Start coding...\n",
  );
  const debouncedCode = useDebounced(code, 150);
  const lang = languageFromPath(currentFilePath);

  const perfWarning = React.useMemo(() => {
    if (!file) return null;
    const size = new Blob([file.contents]).size;
    const info = getTruncationInfo(size);
    return info.shouldTruncate ? info.message : null;
  }, [file]);

  const [formatOnSave, setFormatOnSave] = React.useState<boolean>(
    () => localStorage.getItem("bf_format_on_save") === "1",
  );

  React.useEffect(() => {
    setCode(file?.contents ?? "");
  }, [currentFilePath, file?.contents]);

  const canStage = !!currentFilePath;
  const onStage = React.useCallback(() => {
    if (currentFilePath) stageDiff(currentFilePath, debouncedCode);
  }, [currentFilePath, stageDiff, debouncedCode]);

  const onSave = React.useCallback(async () => {
    if (!currentFilePath) return;
    let output = debouncedCode;
    if (formatOnSave) {
      const { formatContentAsync } = await import("./lib/editor/format");
      output = await formatContentAsync(lang, output);
      setCode(output);
    }
    await upsertFile(currentFilePath, output);
  }, [currentFilePath, debouncedCode, formatOnSave, lang, upsertFile, setCode]);

  // Keyboard shortcuts
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
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        onSave();
      } else if (k === "enter" && e.shiftKey) {
        e.preventDefault();
        if (staged && !fileLock) approveDiff();
      } else if (k === "enter") {
        e.preventDefault();
        onStage();
      } else if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redoLastApply();
        } else {
          undoLastApply();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    onSave,
    onStage,
    staged,
    approveDiff,
    rejectDiff,
    fileLock,
    debouncedCode,
    currentFilePath,
    formatOnSave,
    lang,
    undoLastApply,
    redoLastApply,
  ]);

  React.useEffect(() => {
    localStorage.setItem("bf_format_on_save", formatOnSave ? "1" : "0");
  }, [formatOnSave]);

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      <div className="h-10 bg-muted/20 border-b border-border/40 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-foreground/70">
            {currentFilePath || "Editor"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs flex items-center gap-1">
            <input
              type="checkbox"
              checked={formatOnSave}
              onChange={(e) => setFormatOnSave(e.currentTarget.checked)}
              aria-label="Format on save"
              className="accent-primary"
            />
            Format on save
          </label>
          <Button
            onClick={onSave}
            disabled={!currentFilePath}
            title="Save (Ctrl/Cmd+S)"
            size="sm"
            variant="ghost"
          >
            Save
          </Button>
          <Button
            onClick={onStage}
            disabled={!canStage}
            title="Propose Change (Ctrl/Cmd+Enter)"
            size="sm"
            variant="ghost"
          >
            Stage
          </Button>
          {staged && (
            <>
              <Button
                onClick={approveDiff}
                disabled={fileLock}
                title="Approve (Shift+Ctrl/Cmd+Enter)"
                size="sm"
                variant="default"
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                onClick={rejectDiff}
                title="Reject (Esc)"
                size="sm"
              >
                Reject
              </Button>
            </>
          )}
          {!staged && (undoStack.length > 0 || redoStack.length > 0) && (
            <>
              {undoStack.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={undoLastApply}
                  title="Undo last apply"
                  size="sm"
                >
                  Undo
                </Button>
              )}
              {redoStack.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={redoLastApply}
                  title="Redo last apply"
                  size="sm"
                >
                  Redo
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {perfWarning && (
          <div className="px-3 py-2 text-xs bg-amber-900/30 text-amber-200 border-b border-amber-700/50">
            ⚠️ {perfWarning}
          </div>
        )}
        <Editor
          height="100%"
          defaultLanguage={lang}
          language={lang}
          value={debouncedCode}
          onChange={(v) => setCode(v ?? "")}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            theme: "vs-dark",
          }}
        />
      </div>
    </div>
  );
}

function DiffPanel() {
  const { staged } = useProjectStore();
  if (!staged) {
    return (
      <div className="h-full flex flex-col bg-editor-bg">
        <div className="h-10 bg-muted/20 border-b border-border/40 flex items-center px-3">
          <span className="text-sm text-foreground/70">Diff</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No staged changes
        </div>
      </div>
    );
  }
  const titleOp =
    staged.op === "delete" ? "Delete" : staged.op === "add" ? "Add" : "Modify";
  return (
    <div className="h-full flex flex-col bg-editor-bg">
      <div className="h-10 bg-muted/20 border-b border-border/40 flex items-center px-3">
        <span className="text-sm text-foreground/70">
          {staged.path} ({titleOp})
        </span>
      </div>
      <div className="flex-1 min-h-0">
        {staged.op === "delete" && (
          <div className="px-3 py-2 text-xs bg-amber-900/30 text-amber-200 border-b border-amber-700/50">
            This is a delete preview. Approving will remove the file from the
            project.
          </div>
        )}
        <DiffEditor
          height="100%"
          original={staged.before}
          modified={staged.op === "delete" ? "" : staged.after}
          options={{
            readOnly: true,
            renderSideBySide: true,
            renderIndicators: true,
            fontSize: 13,
            minimap: { enabled: false },
            theme: "vs-dark",
          }}
        />
      </div>
    </div>
  );
}

function ChatPanel() {
  const { current, currentFilePath, stageDiff } = useProjectStore();
  const [prompt, setPrompt] = React.useState("");
  const [providerId, setProviderId] = React.useState<string>("openrouter");
  const [model, setModel] = React.useState<string>("");
  const [streaming, setStreaming] = React.useState(false);
  const [output, setOutput] = React.useState("");
  const [targetPath, setTargetPath] = React.useState<string>(
    currentFilePath || "index.html",
  );
  const [status, setStatus] = React.useState<string>("");
  const [useContextFile, _setUseContextFile] = React.useState<boolean>(true);
  const [useTargetCurrentFile, _setUseTargetCurrentFile] =
    React.useState<boolean>(true);
  const [maxContextChars, _setMaxContextChars] = React.useState<number>(4000);
  const [contextExpanded, _setContextExpanded] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (currentFilePath) {
      if (useTargetCurrentFile) setTargetPath(currentFilePath);
    }
  }, [currentFilePath, useTargetCurrentFile]);

  type AdapterBundle = {
    def: import("./lib/providers/types").ProviderDefinition;
    adapter: import("./lib/providers/types").ProviderAdapter;
    needsKey: boolean;
  };

  const [registry, setRegistry] = React.useState<Record<
    string,
    AdapterBundle
  > | null>(null);

  React.useEffect(() => {
    const loadRegistry = async () => {
      const [
        { OpenRouterDef, OpenRouterAdapter },
        { OllamaDef, OllamaAdapter },
        { GroqDef, GroqAdapter },
        { AnthropicDef, AnthropicAdapter },
        { GPT5Def, GPT5Adapter },
      ] = await Promise.all([
        import("./lib/providers/openrouter"),
        import("./lib/providers/ollama"),
        import("./lib/providers/groq"),
        import("./lib/providers/anthropic"),
        import("./lib/providers/gpt5"),
      ]);
      setRegistry({
        openrouter: {
          def: OpenRouterDef,
          adapter: OpenRouterAdapter,
          needsKey: true,
        },
        ollama: { def: OllamaDef, adapter: OllamaAdapter, needsKey: false },
        groq: { def: GroqDef, adapter: GroqAdapter, needsKey: true },
        anthropic: {
          def: AnthropicDef,
          adapter: AnthropicAdapter,
          needsKey: true,
        },
        gpt5: { def: GPT5Def, adapter: GPT5Adapter, needsKey: false },
      });
    };
    loadRegistry();
  }, []);

  const modelsForProvider = React.useMemo(() => {
    const bundle = registry?.[providerId];
    return bundle?.def.models?.map((m) => m.id) ?? [];
  }, [registry, providerId]);

  React.useEffect(() => {
    if (!modelsForProvider.includes(model)) {
      setModel(modelsForProvider[0] || "");
    }
  }, [modelsForProvider, model]);

  const currentFileContent = React.useMemo(() => {
    if (!current || !currentFilePath) return "";
    return (
      current.files.find((f) => f.path === currentFilePath)?.contents ?? ""
    );
  }, [current, currentFilePath]);

  const buildMessages = (): Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> => {
    const msgs: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [];
    let sys = "";
    if (useContextFile && currentFilePath && currentFileContent) {
      const full = currentFileContent;
      const needsTruncate = !contextExpanded && full.length > maxContextChars;
      const slice = needsTruncate
        ? full.slice(0, Math.max(0, maxContextChars))
        : full;
      const note = needsTruncate
        ? `\n\n[context truncated to ${slice.length} of ${full.length} chars]`
        : "";
      sys +=
        `You are a coding assistant. The user is working on file ${currentFilePath} and wants to update ${targetPath}.\n` +
        `Here is the current content of ${currentFilePath}:${note}\n` +
        "```text\n" +
        slice +
        "\n```";
    }
    if (sys) msgs.push({ role: "system", content: sys });
    msgs.push({ role: "user", content: prompt });
    return msgs;
  };

  const stopRef = React.useRef<boolean>(false);

  const send = async () => {
    const bundle = registry?.[providerId];
    if (!bundle) return;
    setStreaming(true);
    stopRef.current = false;
    setOutput("");
    setStatus("Starting...");
    let key = "";
    if (bundle.needsKey) {
      const { loadProviderKey } = await import("./lib/crypto/keys");
      const k = await loadProviderKey(bundle.def.id);
      if (!k.plaintext) {
        setStatus("Missing API key for provider");
        setStreaming(false);
        return;
      }
      key = k.plaintext;
    }
    const ac = new AbortController();
    stopRef.current = false;
    try {
      const payload = {
        model: model || (bundle.def.models[0]?.id ?? ""),
        messages: buildMessages(),
      };
      for await (const chunk of bundle.adapter.stream(
        bundle.def,
        key,
        payload,
        { signal: ac.signal },
      )) {
        if (stopRef.current) {
          ac.abort();
          setStatus("Stopped");
          break;
        }
        if (chunk.type === "text") {
          setOutput((prev) => prev + chunk.data);
        } else {
          setStatus(chunk.data);
        }
      }
      if (!stopRef.current) setStatus("Done");
    } catch (e: unknown) {
      const error = e as { name?: string; message?: string };
      if (error?.name === "AbortError") {
        setStatus("Stopped");
      } else {
        setStatus(error?.message ?? "Stream failed");
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      <div className="h-10 bg-muted/20 border-b border-border/40 flex items-center justify-between px-3">
        <span className="text-sm text-foreground/70">Chat</span>
        <span className="text-xs text-muted-foreground">{status}</span>
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">
            <span className="block mb-1">Provider</span>
            <select
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={providerId}
              onChange={(e) => setProviderId(e.currentTarget.value)}
            >
              {registry &&
                Object.keys(registry).map((id) => (
                  <option key={id} value={id}>
                    {registry[id].def.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="block mb-1">Model</span>
            <select
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
            >
              {modelsForProvider.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <input
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Ask to edit code..."
            value={prompt}
            onChange={(e) => setPrompt(e.currentTarget.value)}
          />
          <div className="flex gap-2">
            {!streaming ? (
              <Button
                onClick={send}
                disabled={!prompt.trim()}
                className="flex-1"
              >
                Send
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => {
                  stopRef.current = true;
                }}
                className="flex-1"
              >
                Stop
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <div className="flex-1 min-h-0">
          <div className="text-xs font-medium mb-2">Assistant output</div>
          <textarea
            className="w-full h-32 rounded-md border border-input bg-background p-2 text-sm font-mono resize-y"
            value={output}
            onChange={(e) => setOutput(e.currentTarget.value)}
            placeholder="Model output will appear here..."
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Target file path"
            value={targetPath}
            onChange={(e) => setTargetPath(e.currentTarget.value)}
            disabled={useTargetCurrentFile}
          />
          <Button
            variant="secondary"
            onClick={() => targetPath && stageDiff(targetPath, output)}
            disabled={!targetPath || !output}
          >
            Stage to file
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel() {
  const { previewHtml } = useProjectStore();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const debouncedPreviewHtml = useDebounced(previewHtml, 300);

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      <div className="h-10 bg-muted/20 border-b border-border/40 flex items-center px-3">
        <span className="text-sm text-foreground/70">Preview</span>
      </div>
      <div className="flex-1 min-h-0 bg-white">
        <iframe
          ref={iframeRef}
          title="Preview"
          className="w-full h-full"
          sandbox="allow-scripts allow-downloads"
          referrerPolicy="no-referrer"
          srcDoc={debouncedPreviewHtml}
        />
      </div>
    </div>
  );
}

export default function App() {
  const { open, setOpen } = useCommandPalette();
  const [showcaseOpen, setShowcaseOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<string>("files");

  // Listen for showcase command
  React.useEffect(() => {
    const handler = () => setShowcaseOpen(true);
    window.addEventListener("bf:open-showcase", handler);
    return () => window.removeEventListener("bf:open-showcase", handler);
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar>
        <SidebarItem
          icon={Icons.files}
          label="Files"
          active={activeView === "files"}
          onClick={() => setActiveView("files")}
        />
        <SidebarItem
          icon={Icons.search}
          label="Search"
          active={activeView === "search"}
          onClick={() => setActiveView("search")}
        />
        <SidebarItem
          icon={Icons.git}
          label="Git"
          active={activeView === "git"}
          onClick={() => setActiveView("git")}
        />
        <SidebarItem
          icon={Icons.chat}
          label="Chat"
          active={activeView === "chat"}
          onClick={() => setActiveView("chat")}
        />
        <SidebarDivider />
        <SidebarItem
          icon={Icons.templates}
          label="Templates"
          active={activeView === "templates"}
          onClick={() => setActiveView("templates")}
        />
        <SidebarItem
          icon={Icons.deploy}
          label="Deploy"
          active={activeView === "deploy"}
          onClick={() => setActiveView("deploy")}
        />
        <div className="flex-1" />
        <SidebarDivider />
        <SidebarItem
          icon={Icons.settings}
          label="Settings"
          active={activeView === "settings"}
          onClick={() => setActiveView("settings")}
        />
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <ModernHeader />
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Context based on active view */}
          <div className="w-64 border-r border-border/40 bg-sidebar overflow-y-auto">
            <div className="p-3">
              {activeView === "files" && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                    Project Files
                  </h3>
                  <FileTree />
                </div>
              )}
              {activeView === "git" && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                    Source Control
                  </h3>
                  <GitPanel />
                </div>
              )}
              {activeView === "templates" && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                    Templates
                  </h3>
                  <TemplatesGallery />
                </div>
              )}
              {activeView === "deploy" && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                    Deployment
                  </h3>
                  <DeployPanel />
                </div>
              )}
              {activeView === "settings" && (
                <div>
                  <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">
                    Providers
                  </h3>
                  <ProviderManager />
                  <Separator className="my-4" />
                  <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">
                    Relay Config
                  </h3>
                  <RelayConfigPanel />
                </div>
              )}
              {activeView === "chat" && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">
                    Snapshots
                  </h3>
                  <SnapshotList />
                </div>
              )}
            </div>
          </div>

          {/* Main Workbench */}
          <div className="flex-1 min-w-0">
            <SplitPane
              dir="vertical"
              sizes={[50, 50]}
              storageKey="bf_split_main"
            >
              <div className="h-full">
                <SplitPane
                  dir="horizontal"
                  sizes={[50, 50]}
                  storageKey="bf_split_editor"
                >
                  <EditorPanel />
                  <DiffPanel />
                </SplitPane>
              </div>
              <div className="h-full">
                <SplitPane
                  dir="horizontal"
                  sizes={[50, 50]}
                  storageKey="bf_split_bottom"
                >
                  <ChatPanel />
                  <PreviewPanel />
                </SplitPane>
              </div>
            </SplitPane>
          </div>
        </div>
      </div>

      <CommandPalette open={open} onClose={() => setOpen(false)} />
      <Dialog open={showcaseOpen} onOpenChange={setShowcaseOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>UI Component Showcase</DialogTitle>
          </DialogHeader>
          <ComponentShowcase />
        </DialogContent>
      </Dialog>
    </div>
  );
}
