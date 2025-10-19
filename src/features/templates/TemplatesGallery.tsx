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

const templates: Template[] = [vanillaHtml, spaRouter];

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