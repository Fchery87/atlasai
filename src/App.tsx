import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Separator } from "./components/ui/separator";
import { Button } from "./components/ui/button";
import { ProviderManager } from "./features/providers/ProviderManager";
import Editor, { DiffEditor } from "@monaco-editor/react";

function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white/80 bg-blur border-b">
      <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center gap-3">
        <Button size="icon" aria-label="Toggle sidebar">☰</Button>
        <nav aria-label="Breadcrumbs" className="text-sm text-muted-foreground">
          BoltForge / Project
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
  const [code, setCode] = React.useState<string>("// Start coding...\n");
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Editor (Monaco)</CardTitle>
      </CardHeader>
      <CardContent className="p-0 grow min-h-[200px]">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{ fontSize: 13, minimap: { enabled: false } }}
        />
      </CardContent>
    </Card>
  );
}

function DiffPanel() {
  const [before] = React.useState<string>("const a = 1;\n");
  const [after] = React.useState<string>("const a = 2;\n");
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Diff (Stub)</CardTitle>
      </CardHeader>
      <CardContent className="p-0 grow min-h-[200px]">
        <DiffEditor
          height="100%"
          original={before}
          modified={after}
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
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Preview (Sandbox)</CardTitle>
      </CardHeader>
      <CardContent className="grow p-0">
        <iframe
          title="Preview"
          className="w-full h-full"
          sandbox="allow-scripts allow-downloads"
          referrerPolicy="no-referrer"
        />
      </CardContent>
    </Card>
  );
}

function TerminalPanel() {
  const [lines, setLines] = React.useState<string[]>(["$ Ready"]);
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="justify-between">
        <CardTitle>Terminal</CardTitle>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => setLines(["$ Cleared"])} aria-label="Clear terminal">Clear</Button>
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

export default function App() {
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
            <CardHeader><CardTitle>New Project</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Templates coming soon.</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Deploy</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">GitHub Pages / Netlify / Vercel presets.</CardContent>
          </Card>
        </section>
        <section aria-label="Workbench" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <EditorPanel />
            <DiffPanel />
          </div>
          <div className="space-y-4">
            <ChatPanel />
            <PreviewPanel />
            <TerminalPanel />
          </div>
        </section>
      </main>
    </div>
  );
}