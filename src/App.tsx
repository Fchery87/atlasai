import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Separator } from "./components/ui/separator";
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
import {
  estimateUsage,
  formatTokens,
  formatCost,
} from "./lib/tokens/estimator";
import { getTruncationInfo } from "./lib/perf/limits";

function Header() {
  const { current } = useProjectStore();
  return (
    <header className="sticky top-0 z-10 bg-white/80 bg-blur border-b">
      <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center gap-3">
        <Button size="icon" aria-label="Toggle sidebar">
          ☰
        </Button>
        <nav aria-label="Breadcrumbs" className="text-sm text-muted-foreground">
          BoltForge {current ? `/ ${current.name}` : ""}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            title="Reset workbench pane sizes to default"
            aria-label="Reset workbench layout"
            onClick={() => {
              const sizes = [26, 38, 36];
              localStorage.setItem("bf_split_workbench", JSON.stringify(sizes));
              window.dispatchEvent(
                new CustomEvent("bf:split-reset", {
                  detail: { key: "bf_split_workbench", sizes },
                }),
              );
            }}
          >
            Reset Layout
          </Button>
          <Button
            variant="ghost"
            title="Reset all UI tips across the app"
            aria-label="Reset all UI tips"
            onClick={() => {
              const toRemove: string[] = [];
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i) || "";
                if (
                  k.startsWith("sec_help_") ||
                  k.startsWith("sec_hide_dist_banner")
                ) {
                  toRemove.push(k);
                }
              }
              toRemove.forEach((k) => localStorage.removeItem(k));
              // Notify panels to refresh their local UI tip states immediately
              window.dispatchEvent(new CustomEvent("bf:reset-ui-tips"));
            }}
          >
            Reset All UI Tips
          </Button>
          <Button variant="secondary">Save</Button>
          <Button>Run</Button>
        </div>
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

  // Performance check for large files
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

  // Keyboard shortcuts: Cmd/Ctrl+S save, Cmd/Ctrl+Enter stage, Shift+Cmd/Ctrl+Enter approve, Escape reject
  // Undo/Redo: Cmd/Ctrl+Z (undo), Shift+Cmd/Ctrl+Z (redo)
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
          // redo
          redoLastApply();
        } else {
          // undo
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
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>
          Editor (Monaco){currentFilePath ? ` — ${currentFilePath}` : ""}
        </CardTitle>
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
              const [{ formatContentAsync }, { languageFromPath: langFrom }] =
                await Promise.all([
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
          <Button
            onClick={onSave}
            disabled={!currentFilePath}
            title="Save (Ctrl/Cmd+S)"
          >
            Save
          </Button>
          <Button
            variant="secondary"
            onClick={onStage}
            disabled={!canStage}
            title="Propose Change (Ctrl/Cmd+Enter)"
          >
            Propose Change
          </Button>
          {staged && (
            <>
              <Button
                onClick={approveDiff}
                disabled={fileLock}
                title="Approve (Shift+Ctrl/Cmd+Enter)"
              >
                Approve
              </Button>
              <Button variant="ghost" onClick={rejectDiff} title="Reject (Esc)">
                Reject
              </Button>
            </>
          )}
          {!staged && (undoStack.length > 0 || redoStack.length > 0) && (
            <div className="flex items-center gap-2">
              {undoStack.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={undoLastApply}
                  title="Undo last apply"
                >
                  Undo
                </Button>
              )}
              {redoStack.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={redoLastApply}
                  title="Redo last apply (Ctrl+Shift+Z)"
                >
                  Redo
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 grow min-h-[200px]">
        {perfWarning && (
          <div className="px-3 py-2 text-xs bg-amber-50 text-amber-900 border-b border-amber-200">
            ⚠️ {perfWarning}
          </div>
        )}
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
  const titleOp =
    staged.op === "delete" ? "Delete" : staged.op === "add" ? "Add" : "Modify";
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>
          Diff — {staged.path} ({titleOp})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 grow min-h-[200px]">
        {staged.op === "delete" && (
          <div className="px-3 py-2 text-xs bg-amber-50 text-amber-900 border-b border-amber-200">
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
          }}
        />
      </CardContent>
    </Card>
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
  const [useContextFile, setUseContextFile] = React.useState<boolean>(true);
  const [useTargetCurrentFile, setUseTargetCurrentFile] =
    React.useState<boolean>(true);
  const [maxContextChars, setMaxContextChars] = React.useState<number>(4000);
  const [contextExpanded, setContextExpanded] = React.useState<boolean>(false);
  const [attachments, setAttachments] = React.useState<
    Array<{
      name: string;
      type: string;
      size: number;
      text?: string;
      note?: string;
    }>
  >([]);
  const [maxAttachmentChars, setMaxAttachmentChars] =
    React.useState<number>(8000);
  const [includeImagesAsDataUrl, setIncludeImagesAsDataUrl] =
    React.useState<boolean>(false);

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

  const providerCaps = React.useMemo(() => {
    const bundle = registry?.[providerId];
    return bundle
      ? bundle.adapter.capabilities(bundle.def)
      : { vision: false, tools: false };
  }, [registry, providerId]);

  // Auto-enable images toggle when switching to a vision-capable provider, and auto-disable otherwise
  const [imageHint, setImageHint] = React.useState<string>("");
  React.useEffect(() => {
    if (providerCaps.vision) {
      setIncludeImagesAsDataUrl(true);
      setImageHint("Images enabled for this provider.");
      const t = setTimeout(() => setImageHint(""), 2500);
      return () => clearTimeout(t);
    } else {
      setIncludeImagesAsDataUrl(false);
      setImageHint("");
    }
  }, [providerCaps.vision]);

  const modelsForProvider = React.useMemo(() => {
    const bundle = registry?.[providerId];
    return bundle?.def.models?.map((m) => m.id) ?? [];
  }, [registry, providerId]);

  React.useEffect(() => {
    if (!modelsForProvider.includes(model)) {
      setModel(modelsForProvider[0] || "");
    }
  }, [modelsForProvider]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (attachments.length) {
      const parts: string[] = [];
      for (const a of attachments) {
        if (a.text) {
          parts.push(
            `Attachment ${a.name} (${a.type}, ${a.size} bytes):\n\`\`\`text\n${a.text}\n\`\`\``,
          );
        } else {
          parts.push(
            `Attachment ${a.name} (${a.type}, ${a.size} bytes) included (binary or image omitted). ${a.note ?? ""}`.trim(),
          );
        }
      }
      sys += (sys ? "\n\n" : "") + parts.join("\n\n");
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
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setStatus("Stopped");
      } else {
        setStatus(e?.message ?? "Stream failed");
      }
    } finally {
      setStreaming(false);
    }
  };

  // Basic Markdown renderer with code block copy support
  function renderMarkdown(md: string) {
    const parts: Array<{
      type: "code" | "text";
      lang?: string;
      content: string;
    }> = [];
    const regex = /```([a-zA-Z0-9_-]+)?\\n([\\s\\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(md)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: md.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", lang: match[1] || "text", content: match[2] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < md.length) {
      parts.push({ type: "text", content: md.slice(lastIndex) });
    }
    return (
      <div className="space-y-2">
        {parts.map((p, i) =>
          p.type === "code" ? (
            <div key={i} className="border rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1 bg-muted text-xs">
                <span>{p.lang}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(p.content)}
                  aria-label="Copy code"
                  title="Copy code"
                >
                  Copy
                </Button>
              </div>
              <pre className="p-2 text-xs overflow-auto">
                <code>{p.content}</code>
              </pre>
            </div>
          ) : (
            <div key={i} className="text-sm whitespace-pre-wrap">
              {p.content}
            </div>
          ),
        )}
      </div>
    );
  }

  // Calculate token/cost estimation for current conversation
  const usageEstimate = React.useMemo(() => {
    const bundle = registry?.[providerId];
    if (!bundle) return null;

    const selectedModel = bundle.def.models?.find((m) => m.id === model);
    if (!selectedModel) return null;

    const messages = buildMessages();
    messages.push({ role: "user", content: prompt });
    if (output) {
      messages.push({ role: "assistant", content: output });
    }

    return estimateUsage(messages, selectedModel);
  }, [
    registry,
    providerId,
    model,
    prompt,
    output,
    currentFileContent,
    attachments,
    useContextFile,
    currentFilePath,
    targetPath,
  ]);  

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <div className="flex items-center justify-between w-full">
          <CardTitle>Chat</CardTitle>
          {usageEstimate && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span title="Estimated tokens">
                {formatTokens(usageEstimate.totalTokens)} tokens
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span
                title="Estimated cost"
                className="font-medium text-foreground"
              >
                {formatCost(usageEstimate.estimatedCost)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="grow flex flex-col gap-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
          <label className="text-xs">
            Provider
            <select
              className="mt-1 w-full h-8 rounded-md border border-input px-2 text-sm"
              aria-label="Provider"
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
          <label className="text-xs md:col-span-2">
            Model
            <select
              className="mt-1 w-full h-8 rounded-md border border-input px-2 text-sm"
              aria-label="Model"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
          <div className="flex items-center gap-3">
            <label className="text-xs flex items-center gap-2">
              <input
                type="checkbox"
                checked={useContextFile}
                onChange={(e) => setUseContextFile(e.currentTarget.checked)}
                aria-label="Use selected file as context"
              />
              Use selected file as context
            </label>
            <label
              className="text-xs flex items-center gap-1"
              title="Maximum characters from the context file to include"
            >
              <span>Max ctx</span>
              <input
                className="h-7 w-20 rounded-md border border-input px-2 text-xs"
                type="number"
                min={500}
                step={500}
                value={maxContextChars}
                onChange={(e) =>
                  setMaxContextChars(
                    Math.max(0, Number(e.currentTarget.value || 0)),
                  )
                }
                aria-label="Max context characters"
              />
            </label>
            {useContextFile &&
              currentFileContent.length > maxContextChars &&
              !contextExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setContextExpanded(true)}
                  aria-label="Show full context"
                >
                  Show full
                </Button>
              )}
            {useContextFile &&
              contextExpanded &&
              currentFileContent.length > maxContextChars && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setContextExpanded(false)}
                  aria-label="Show less context"
                >
                  Show less
                </Button>
              )}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs flex items-center gap-2">
              <input
                type="checkbox"
                checked={useTargetCurrentFile}
                onChange={(e) =>
                  setUseTargetCurrentFile(e.currentTarget.checked)
                }
                aria-label="Use current file as target"
              />
              Use current file as target
            </label>
          </div>
          <div
            className="text-xs text-muted-foreground md:text-right"
            aria-live="polite"
          >
            {imageHint ? <span className="mr-2">{imageHint}</span> : null}
            {status}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              aria-label="Prompt"
              className="flex-1 h-10 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Ask to edit code..."
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
            />
            {!streaming ? (
              <Button
                onClick={send}
                disabled={!prompt.trim()}
                aria-label="Send"
              >
                Send
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => {
                  stopRef.current = true;
                }}
                aria-label="Stop"
                title="Stop streaming"
              >
                Stop
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label="Attach files"
              type="file"
              multiple
              accept=""
              onChange={async (e) => {
                const files = Array.from(e.currentTarget.files || []);
                const newItems: Array<{
                  name: string;
                  type: string;
                  size: number;
                  text?: string;
                  note?: string;
                }> = [];
                for (const f of files) {
                  const isImage = f.type.startsWith("image/");
                  const isText =
                    f.type.startsWith("text/") ||
                    [
                      ".js",
                      ".ts",
                      ".tsx",
                      ".jsx",
                      ".json",
                      ".css",
                      ".html",
                      ".md",
                      ".yml",
                      ".yaml",
                      ".py",
                      ".sh",
                      ".bash",
                    ].some((ext) => f.name.endsWith(ext));
                  if (isText) {
                    const txt = await f.text();
                    const sliced = txt.slice(0, maxAttachmentChars);
                    const note =
                      txt.length > maxAttachmentChars
                        ? `truncated to ${sliced.length} of ${txt.length} chars`
                        : undefined;
                    newItems.push({
                      name: f.name,
                      type: f.type || "text/plain",
                      size: f.size,
                      text: sliced,
                      note,
                    });
                  } else if (
                    isImage &&
                    includeImagesAsDataUrl &&
                    providerCaps.vision
                  ) {
                    const buf = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(f);
                    });
                    newItems.push({
                      name: f.name,
                      type: f.type || "image/*",
                      size: f.size,
                      text: buf,
                      note: "included as data URL",
                    });
                  } else {
                    newItems.push({
                      name: f.name,
                      type: f.type || "application/octet-stream",
                      size: f.size,
                      note: "binary/image omitted",
                    });
                  }
                }
                setAttachments((prev) => [...prev, ...newItems]);
                // reset
                (e.target as HTMLInputElement).value = "";
              }}
            />
            <label
              className="text-xs flex items-center gap-1"
              title="Max characters read from each text attachment"
            >
              <span>Max attach</span>
              <input
                className="h-7 w-20 rounded-md border border-input px-2 text-xs"
                type="number"
                min={1000}
                step={1000}
                value={maxAttachmentChars}
                onChange={(e) =>
                  setMaxAttachmentChars(
                    Math.max(0, Number(e.currentTarget.value || 0)),
                  )
                }
                aria-label="Max attachment characters"
              />
            </label>
            <label
              className="text-xs flex items-center gap-2"
              title={
                providerCaps.vision
                  ? "Include images as data URLs"
                  : "Provider does not support vision"
              }
            >
              <input
                type="checkbox"
                checked={includeImagesAsDataUrl}
                onChange={(e) =>
                  setIncludeImagesAsDataUrl(e.currentTarget.checked)
                }
                disabled={!providerCaps.vision}
                aria-label="Include images as data URLs"
              />
              Include images
            </label>
            {attachments.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Clear attachments"
                onClick={() => setAttachments([])}
              >
                Clear attachments
              </Button>
            )}
          </div>
          {attachments.length > 0 && (
            <div className="text-xs border rounded-md p-2 max-h-28 overflow-auto">
              <div className="font-medium mb-1">Attachments</div>
              <ul className="space-y-1">
                {attachments.map((a, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      {a.name}{" "}
                      <span className="text-muted-foreground">
                        ({a.type || "unknown"}, {a.size} bytes
                        {a.note ? `, ${a.note}` : ""})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${a.name}`}
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Separator className="my-1" />
        <div className="text-xs font-medium">Assistant output (editable)</div>
        <textarea
          aria-label="Assistant output"
          className="w-full min-h-[120px] rounded-md border border-input p-2 text-sm font-mono"
          value={output}
          onChange={(e) => setOutput(e.currentTarget.value)}
          placeholder="Model output will appear here..."
        />
        <div className="text-xs font-medium mt-1">Rendered preview</div>
        <div className="border rounded-md p-2 max-h-56 overflow-auto">
          {output ? (
            renderMarkdown(output)
          ) : (
            <div className="text-xs text-muted-foreground">No output yet</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="h-9 rounded-md border border-input px-3 text-sm"
            aria-label="Target file path"
            placeholder="Target file path"
            value={targetPath}
            onChange={(e) => setTargetPath(e.currentTarget.value)}
            disabled={useTargetCurrentFile}
            title={
              useTargetCurrentFile
                ? "Using current file as target"
                : "Set a custom target file"
            }
          />
          <Button
            variant="secondary"
            onClick={() => targetPath && stageDiff(targetPath, output)}
            disabled={!targetPath || !output}
            title="Stage AI output as a change to the target file"
          >
            Stage to file
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOutput("")}
            disabled={!output}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewPanel() {
  const { previewHtml } = useProjectStore();
  const { append } = useTerminalStore();
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Debounce preview updates to avoid excessive reloads during rapid file changes
  const debouncedPreviewHtml = useDebounced(previewHtml, 300);

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
  }, [debouncedPreviewHtml]);

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
          srcDoc={debouncedPreviewHtml}
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
          <Button
            variant="secondary"
            onClick={clear}
            aria-label="Clear terminal"
            title="Clear"
          >
            Clear
          </Button>
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
  const {
    createProject,
    exportZip,
    importZip,
    current,
    loadProjects,
    projects,
    openProject,
  } = useProjectStore();
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
        <Button onClick={doCreate} disabled={!name.trim()}>
          Create
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={fileInput}
          aria-label="Import ZIP"
          type="file"
          accept=".zip"
          onChange={onImport}
        />
        <Button onClick={doExport} disabled={!current}>
          Export ZIP
        </Button>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">Projects</div>
        <div className="flex flex-wrap gap-2">
          {projects.map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              onClick={() => openProject(p.id)}
              aria-label={`Open ${p.name}`}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { FileTree } from "./features/files/FileTree";
import { useTerminalStore } from "./lib/store/terminalStore";
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

export default function App() {
  const { open, setOpen } = useCommandPalette();
  const [showcaseOpen, setShowcaseOpen] = React.useState(false);

  // Listen for showcase command
  React.useEffect(() => {
    const handler = () => setShowcaseOpen(true);
    window.addEventListener("bf:open-showcase", handler);
    return () => window.removeEventListener("bf:open-showcase", handler);
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main id="main" className="max-w-screen-2xl mx-auto p-4">
        <section
          aria-label="Quick Actions"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderManager />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActions />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatesGallery />
            </CardContent>
          </Card>
        </section>
        <section
          aria-label="Integrations"
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>Git</CardTitle>
            </CardHeader>
            <CardContent>
              <GitPanel />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Deploy</CardTitle>
            </CardHeader>
            <CardContent>
              <DeployPanel />
            </CardContent>
          </Card>
        </section>
        <section
          aria-label="Advanced Settings"
          className="grid grid-cols-1 gap-4 mb-4"
        >
          <RelayConfigPanel />
        </section>
        <section aria-label="Workbench" className="h-[70vh]">
          <SplitPane
            dir="vertical"
            sizes={[26, 38, 36]}
            storageKey="bf_split_workbench"
          >
            <div className="pr-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <FileTree />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Snapshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <SnapshotList />
                </CardContent>
              </Card>
              <TerminalPanel />
            </div>
            <div className="px-2 space-y-4">
              <EditorPanel />
              <DiffPanel />
            </div>
            <div className="pl-2 space-y-4">
              <ChatPanel />
              <PreviewPanel />
            </div>
          </SplitPane>
        </section>
      </main>
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
