import * as React from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useProjectStore } from "../../lib/store/projectStore";

type Template = {
  id: string;
  name: string;
  description: string;
  files: Array<{ path: string; contents: string }>;
};

const vanillaHtml: Template = {
  id: "vanilla-html",
  name: "Vanilla HTML",
  description: "Single index.html with simple styles and script.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Vanilla HTML</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:1rem}
      .btn{padding:.5rem .75rem;border:1px solid #ddd;border-radius:.375rem;cursor:pointer}
    </style>
  </head>
  <body>
    <h1>Hello, BoltForge</h1>
    <p>This is a minimal HTML template.</p>
    <button class="btn" onclick="toggle()">Toggle</button>
    <div id="box" style="margin-top:1rem;">Box is visible</div>
    <script>
      function toggle(){
        const el = document.getElementById("box");
        if (!el) return;
        el.style.display = el.style.display === "none" ? "block" : "none";
      }
    </script>
  </body>
</html>`,
    },
  ],
};

const spaRouter: Template = {
  id: "spa-router",
  name: "SPA Router (Vanilla)",
  description: "A tiny history-based router with two pages.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>SPA Router</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:1rem}
      nav a{margin-right:.5rem}
      .link{color:#2563eb;text-decoration:underline;cursor:pointer}
    </style>
  </head>
  <body>
    <nav>
      <a href="/" data-link>Home</a>
      <a href="/about" data-link>About</a>
    </nav>
    <main id="app"></main>
    <script>
      function render(path){
        const app = document.getElementById("app");
        if (path === "/about") {
          app.innerHTML = "<h1>About</h1><p>About this tiny SPA.</p>";
        } else {
          app.innerHTML = "<h1>Home</h1><p>Welcome to the tiny SPA.</p>";
        }
      }
      function navigate(path){
        history.pushState({}, "", path);
        render(location.pathname);
      }
      document.addEventListener("click", (e) => {
        const a = e.target.closest("[data-link]");
        if (a) {
          e.preventDefault();
          navigate(a.getAttribute("href"));
        }
      });
      window.addEventListener("popstate", () => render(location.pathname));
      render(location.pathname);
    </script>
  </body>
</html>`,
    },
  ],
};

const tailwindCdn: Template = {
  id: "vanilla-tailwind",
  name: "Vanilla + Tailwind (CDN)",
  description: "Zero-build Tailwind via CDN with a simple UI.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tailwind CDN</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="p-6 font-sans">
    <h1 class="text-2xl font-bold mb-2">Tailwind via CDN</h1>
    <p class="text-slate-600 mb-4">Start styling immediately without a build step.</p>
    <button class="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onclick="toggle()">Toggle Panel</button>
    <div id="panel" class="mt-4 p-3 rounded border border-slate-200">This is a panel.</div>
    <script>
      function toggle(){
        const el = document.getElementById("panel");
        el.classList.toggle("hidden");
      }
    </script>
  </body>
</html>`,
    },
  ],
};

const mdStatic: Template = {
  id: "markdown-static",
  name: "Markdown → HTML (static)",
  description: "Simple client-side Markdown-to-HTML site.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Markdown Site</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:1rem;max-width:720px;margin:auto}
      pre{background:#f6f8fa;padding:.75rem;border-radius:.375rem;overflow:auto}
      code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
      nav a{margin-right:.5rem}
    </style>
  </head>
  <body>
    <nav>
      <a href="#/README.md">README</a>
      <a href="#/ABOUT.md">About</a>
    </nav>
    <main id="app">Loading...</main>
    <script>
      async function load(path){
        try {
          const res = await fetch(path);
          const text = await res.text();
          document.getElementById("app").innerHTML = mdToHtml(text);
        } catch(e) {
          document.getElementById("app").textContent = "Failed to load " + path;
        }
      }
      function mdToHtml(md){
        // extremely small markdown renderer (headings, paragraphs, code fences)
        const fence = /```([a-zA-Z0-9_-]+)?\\n([\\s\\S]*?)```/g;
        md = md.replace(fence, (_, lang, code) => '<pre><code>' + escapeHtml(code) + '</code></pre>');
        md = md.replace(/^###\\s+(.*)$/gm, '<h3>$1</h3>');
        md = md.replace(/^##\\s+(.*)$/gm, '<h2>$1</h2>');
        md = md.replace(/^#\\s+(.*)$/gm, '<h1>$1</h1>');
        md = md.replace(/^\\s*\\n/gm, '<br/>');
        md = md.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
        md = md.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
        // paragraphs: wrap lines not already HTML blocks
        md = md.split(/\\n\\n+/).map(block => /<h\\d|<pre|<ul|<ol|<br/.test(block) ? block : '<p>' + block + '</p>').join('\\n');
        return md;
      }
      function escapeHtml(s){return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
      function route(){
        const hash = location.hash.slice(2) || "README.md";
        load(hash);
      }
      window.addEventListener("hashchange", route);
      route();
    </script>
  </body>
</html>`,
    },
    { path: "README.md", contents: "# Welcome\\n\\nThis is a simple Markdown site.\\n\\n```js\\nconsole.log('hello');\\n```" },
    { path: "ABOUT.md", contents: "## About\\n\\nThis page is rendered from Markdown on the client." },
  ],
};

const templates: Template[] = [vanillaHtml, spaRouter, tailwindCdn, mdStatic];

export function TemplatesGallery() {
  const { createProject, upsertFile } = useProjectStore();
  const [busy, setBusy] = React.useState<string | null>(null);

  const createFrom = async (tpl: Template) => {
    setBusy(tpl.id);
    const name = prompt("Project name", tpl.name) || tpl.name;
    await createProject(name);
    for (const f of tpl.files) {
      await upsertFile(f.path, f.contents);
    }
    setBusy(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {templates.map((t) => (
        <Card key={t.id}>
          <CardHeader>
            <CardTitle>{t.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
            <Button onClick={() => createFrom(t)} disabled={busy === t.id} aria-busy={busy === t.id}>
              {busy === t.id ? "Creating..." : "Create from template"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}