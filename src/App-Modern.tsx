import * as React from "react";
import { Button } from "./components/ui/button";
import { LazyEditor as Editor } from "./components/editor/LazyMonaco";

// Modern 2-panel layout: Chat + Editor (like Claude/Cursor)
export default function App() {
  const [messages, setMessages] = React.useState<
    Array<{ role: string; content: string; type?: string }>
  >([
    {
      role: "user",
      content: "Read and analyze CLAUDE.md file",
      type: "task",
    },
    {
      role: "assistant",
      content:
        "Proxy is handy for components/hooks that don't want to handle Authorization headers.",
    },
    {
      role: "assistant",
      content: `**Operational notes**

• Guarded metrics: Prometheus will need a JWT to scrape /api/metrics. If you prefer it open, I can revert the guarded /metrics endpoint to a dedicated service route.
• Health remains unguarded to support k8s/docker health checks.
• If you'd like, we can add a short README section describing the proxy pattern and examples for client usage.`,
    },
    {
      role: "assistant",
      content: `**Would you like me to:**

• Refactor existing frontend API calls to point to /api/proxy for consistency?
• Keep metrics unguarded or add a separate /metrics/public without JWT for Prometheus?`,
    },
    {
      role: "user",
      content: "yes to both",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [activeFile, setActiveFile] = React.useState("page.tsx");
  const [code, setCode] = React.useState(`const PROXY = "/api/proxy";

test.describe("Audit page ally extended", () => {
  test("axe, keyboard focus, table semantics, contrast", async ({ page }) => {
    // Discover a report id via API through proxy
    const res = await page.request.get(\`\${PROXY}/reports\`);
    if (!res.ok()) test.skip(true, "API not reachable; skipping audit ally extended");
    const reports = await res.json();
    if (!Array.isArray(reports) || !reports.length) test.skip(true, "No reports available");

    const reportId = reports[0].id as string;

    await page.goto(\`/audit/\${reportId}\`);
  });
});`);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I can help you with that. What would you like me to do?",
        },
      ]);
    }, 500);
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top Header */}
      <header className="h-14 border-b border-border flex items-center px-4 bg-background">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
            A
          </div>
          <span className="font-semibold text-base">AtlasAI</span>
          <span className="text-muted-foreground/50 mx-1">/</span>
          <span className="text-sm text-muted-foreground">Project</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs">
            Help
          </Button>
          <Button variant="ghost" size="sm" className="text-xs">
            Settings
          </Button>
        </div>
      </header>

      {/* Main 2-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Chat */}
        <div className="w-[420px] border-r border-border flex flex-col bg-background">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h2 className="font-medium text-sm mb-2 text-foreground">
              Read and analyze CLAUDE.md file
            </h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
                Running
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 -ml-1"
              >
                Create PR
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "ml-8" : ""}>
                <div className="flex items-start gap-3">
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0">
                      A
                    </div>
                  )}
                  <div
                    className={`flex-1 ${msg.role === "user" ? "text-right" : ""}`}
                  >
                    <div
                      className={`text-sm leading-relaxed ${msg.role === "user" ? "bg-muted/30 rounded-lg px-3 py-2 inline-block" : ""}`}
                    >
                      {msg.content.split("\n").map((line, idx) => {
                        // Handle bold text
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return (
                            <div key={idx} className="font-semibold mb-1 mt-2">
                              {line.replace(/\*\*/g, "")}
                            </div>
                          );
                        }
                        // Handle bullet points
                        if (line.startsWith("•")) {
                          return (
                            <div key={idx} className="ml-2 text-foreground/90">
                              {line}
                            </div>
                          );
                        }
                        // Regular text
                        if (line.trim()) {
                          return (
                            <div key={idx} className="text-foreground/90">
                              {line}
                            </div>
                          );
                        }
                        return <div key={idx} className="h-1"></div>;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-border bg-muted/10">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask anything or type / for commands..."
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <Button size="sm" onClick={sendMessage} className="px-4">
                Send
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
              >
                Quick
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
              >
                Think
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
                More...
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Editor */}
        <div className="flex-1 flex flex-col bg-background">
          {/* File Tabs */}
          <div className="h-11 border-b border-border flex items-center px-2 gap-1 bg-muted/10">
            <button
              className={`px-4 h-9 rounded-md text-sm font-medium transition-colors ${
                activeFile === "page.tsx"
                  ? "bg-background border border-border shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              onClick={() => setActiveFile("page.tsx")}
            >
              page.tsx
            </button>
            <button
              className={`px-4 h-9 rounded-md text-sm font-medium transition-colors ${
                activeFile === "a11y.spec.ts"
                  ? "bg-background border border-border shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
              onClick={() => setActiveFile("a11y.spec.ts")}
            >
              a11y-audit-extended.spec.ts
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              language="typescript"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                renderLineHighlight: "all",
                theme: "vs-light",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
