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

const tailwindDark: Template = {
  id: "tailwind-dark-toggle",
  name: "Tailwind Dark Theme Toggle",
  description: "Tailwind CDN with dark mode toggle stored in localStorage.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tailwind Dark Mode</title>
    <script>
      // persist dark mode
      try {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") document.documentElement.classList.add("dark");
      } catch {}
    </script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = { darkMode: 'class' }
    </script>
  </head>
  <body class="p-6 font-sans bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <h1 class="text-2xl font-bold mb-2">Dark Mode</h1>
    <p class="mb-4 text-slate-600 dark:text-slate-300">Toggle theme with the button below.</p>
    <button id="toggle" class="px-3 py-2 rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">Toggle Dark</button>
    <script>
      document.getElementById("toggle").addEventListener("click", () => {
        const el = document.documentElement;
        const isDark = el.classList.toggle("dark");
        try { localStorage.setItem("theme", isDark ? "dark" : "light"); } catch {}
      });
    </script>
  </body>
</html>`,
    },
  ],
};

const blogStatic: Template = {
  id: "markdown-blog",
  name: "Static Blog (Markdown index)",
  description: "Index page lists posts/*.md and renders content client-side.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Static Blog</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:1rem;max-width:820px;margin:auto}
      .post{margin-bottom:1rem}
      .muted{color:#64748b}
      pre{background:#f6f8fa;padding:.75rem;border-radius:.375rem;overflow:auto}
    </style>
  </head>
  <body>
    <h1>My Blog</h1>
    <div id="list"></div>
    <hr/>
    <main id="app"></main>
    <script>
      const posts = ["posts/first.md","posts/second.md"];
      const list = document.getElementById("list");
      list.innerHTML = posts.map(p => '<div class="post"><a href="#/'+p+'">'+p.replace('posts/','')+'</a></div>').join('');
      async function load(path){
        if (!path){ document.getElementById("app").innerHTML = '<p class="muted">Select a post</p>'; return; }
        const res = await fetch(path);
        const text = await res.text();
        document.getElementById("app").innerHTML = mdToHtml(text);
      }
      function mdToHtml(md){
        const fence = /```([a-zA-Z0-9_-]+)?\\n([\\s\\S]*?)```/g;
        md = md.replace(fence, (_, lang, code) => '<pre><code>' + escapeHtml(code) + '</code></pre>');
        md = md.replace(/^###\\s+(.*)$/gm, '<h3>$1</h3>');
        md = md.replace(/^##\\s+(.*)$/gm, '<h2>$1</h2>');
        md = md.replace(/^#\\s+(.*)$/gm, '<h1>$1</h1>');
        md = md.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
        md = md.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
        md = md.split(/\\n\\n+/).map(b => /<h\\d|<pre|<ul|<ol/.test(b) ? b : '<p>'+b+'</p>').join('\\n');
        return md;
      }
      function escapeHtml(s){return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
      function route(){ const hash = location.hash.slice(2); load(hash); }
      window.addEventListener("hashchange", route);
      route();
    </script>
  </body>
</html>`,
    },
    { path: "posts/first.md", contents: "# First Post\\n\\nHello from the first post." },
    { path: "posts/second.md", contents: "# Second Post\\n\\nAnother post content." },
  ],
};

const templates: Template[] = [vanillaHtml, spaRouter, tailwindCdn, mdStatic, tailwindDark, blogStatic];

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