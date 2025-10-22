import * as React from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
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
        const fence = /\`{3}([a-zA-Z0-9_-]+)?\\n([\\s\\S]*?)\`{3}/g;
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
    {
      path: "README.md",
      contents:
        "# Welcome\\n\\nThis is a simple Markdown site.\\n\\n```js\\nconsole.log('hello');\\n```",
    },
    {
      path: "ABOUT.md",
      contents:
        "## About\\n\\nThis page is rendered from Markdown on the client.",
    },
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
        const fence = /\`{3}([a-zA-Z0-9_-]+)?\\n([\\s\\S]*?)\`{3}/g;
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
    {
      path: "posts/first.md",
      contents: "# First Post\\n\\nHello from the first post.",
    },
    {
      path: "posts/second.md",
      contents: "# Second Post\\n\\nAnother post content.",
    },
  ],
};

const todoApp: Template = {
  id: "todo-app",
  name: "Todo App (Vanilla JS)",
  description: "Complete todo application with localStorage persistence.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Todo App</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="p-6 max-w-2xl mx-auto font-sans">
    <h1 class="text-3xl font-bold mb-4">My Todos</h1>
    <div class="flex gap-2 mb-4">
      <input id="input" type="text" placeholder="Add new todo..." class="flex-1 px-3 py-2 border rounded" />
      <button onclick="addTodo()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
    </div>
    <ul id="list" class="space-y-2"></ul>
    <script>
      let todos = JSON.parse(localStorage.getItem('todos') || '[]');
      function save(){ localStorage.setItem('todos', JSON.stringify(todos)); }
      function render(){
        const list = document.getElementById('list');
        list.innerHTML = todos.map((t, i) =>
          '<li class="flex items-center gap-2 p-2 border rounded">' +
          '<input type="checkbox" ' + (t.done ? 'checked' : '') + ' onchange="toggle(' + i + ')" />' +
          '<span class="flex-1 ' + (t.done ? 'line-through text-gray-500' : '') + '">' + escapeHtml(t.text) + '</span>' +
          '<button onclick="del(' + i + ')" class="text-red-600 hover:text-red-800">Delete</button>' +
          '</li>'
        ).join('');
      }
      function addTodo(){
        const input = document.getElementById('input');
        if (!input.value.trim()) return;
        todos.push({ text: input.value, done: false });
        input.value = '';
        save();
        render();
      }
      function toggle(i){ todos[i].done = !todos[i].done; save(); render(); }
      function del(i){ todos.splice(i, 1); save(); render(); }
      function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
      document.getElementById('input').addEventListener('keypress', e => { if (e.key === 'Enter') addTodo(); });
      render();
    </script>
  </body>
</html>`,
    },
  ],
};

const dashboard: Template = {
  id: "admin-dashboard",
  name: "Admin Dashboard",
  description: "Responsive admin dashboard with sidebar and data cards.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Admin Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-gray-100">
    <div class="flex h-screen">
      <aside class="w-64 bg-gray-900 text-white p-4">
        <h2 class="text-xl font-bold mb-4">Dashboard</h2>
        <nav class="space-y-2">
          <a href="#" class="block px-3 py-2 rounded bg-gray-800">Overview</a>
          <a href="#" class="block px-3 py-2 rounded hover:bg-gray-800">Users</a>
          <a href="#" class="block px-3 py-2 rounded hover:bg-gray-800">Analytics</a>
          <a href="#" class="block px-3 py-2 rounded hover:bg-gray-800">Settings</a>
        </nav>
      </aside>
      <main class="flex-1 p-6 overflow-auto">
        <h1 class="text-2xl font-bold mb-6">Overview</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-white p-4 rounded shadow">
            <div class="text-gray-500 text-sm">Total Users</div>
            <div class="text-3xl font-bold">1,234</div>
            <div class="text-green-500 text-sm">+12% from last month</div>
          </div>
          <div class="bg-white p-4 rounded shadow">
            <div class="text-gray-500 text-sm">Revenue</div>
            <div class="text-3xl font-bold">$56,789</div>
            <div class="text-green-500 text-sm">+8% from last month</div>
          </div>
          <div class="bg-white p-4 rounded shadow">
            <div class="text-gray-500 text-sm">Active Sessions</div>
            <div class="text-3xl font-bold">567</div>
            <div class="text-gray-500 text-sm">Current active</div>
          </div>
        </div>
        <div class="bg-white p-4 rounded shadow">
          <h2 class="font-bold mb-4">Recent Activity</h2>
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr><th class="text-left p-2">User</th><th class="text-left p-2">Action</th><th class="text-left p-2">Time</th></tr>
            </thead>
            <tbody>
              <tr><td class="p-2">John Doe</td><td class="p-2">Logged in</td><td class="p-2">2 minutes ago</td></tr>
              <tr><td class="p-2">Jane Smith</td><td class="p-2">Updated profile</td><td class="p-2">15 minutes ago</td></tr>
              <tr><td class="p-2">Bob Johnson</td><td class="p-2">Made purchase</td><td class="p-2">1 hour ago</td></tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  </body>
</html>`,
    },
  ],
};

const landingPage: Template = {
  id: "landing-page",
  name: "Landing Page",
  description: "Modern landing page with hero section and features.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Product Landing</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="font-sans">
    <header class="bg-white shadow-sm sticky top-0">
      <nav class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="text-xl font-bold">ProductName</div>
        <div class="space-x-4">
          <a href="#features" class="hover:text-blue-600">Features</a>
          <a href="#pricing" class="hover:text-blue-600">Pricing</a>
          <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Sign Up</button>
        </div>
      </nav>
    </header>
    <section class="py-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
      <h1 class="text-5xl font-bold mb-4">Build Something Amazing</h1>
      <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">The ultimate tool for modern developers. Fast, powerful, and easy to use.</p>
      <button class="px-8 py-3 bg-blue-600 text-white rounded-lg text-lg hover:bg-blue-700">Get Started Free</button>
    </section>
    <section id="features" class="py-20 px-4 max-w-6xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="text-4xl mb-4">⚡</div>
          <h3 class="font-bold mb-2">Lightning Fast</h3>
          <p class="text-gray-600">Optimized performance for the best experience</p>
        </div>
        <div class="text-center">
          <div class="text-4xl mb-4">🔒</div>
          <h3 class="font-bold mb-2">Secure</h3>
          <p class="text-gray-600">Enterprise-grade security built-in</p>
        </div>
        <div class="text-center">
          <div class="text-4xl mb-4">🎨</div>
          <h3 class="font-bold mb-2">Customizable</h3>
          <p class="text-gray-600">Make it yours with endless options</p>
        </div>
      </div>
    </section>
    <footer class="bg-gray-900 text-white py-12 px-4 text-center">
      <p>&copy; 2024 ProductName. All rights reserved.</p>
    </footer>
  </body>
</html>`,
    },
  ],
};

const portfolio: Template = {
  id: "portfolio",
  name: "Portfolio Site",
  description: "Personal portfolio with projects showcase.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="font-sans bg-gray-50">
    <header class="bg-white shadow-sm">
      <nav class="max-w-4xl mx-auto px-4 py-6">
        <div class="text-2xl font-bold">John Doe</div>
        <p class="text-gray-600">Full Stack Developer</p>
      </nav>
    </header>
    <main class="max-w-4xl mx-auto px-4 py-12">
      <section class="mb-16">
        <h1 class="text-4xl font-bold mb-4">Hi, I'm John 👋</h1>
        <p class="text-xl text-gray-600 mb-4">I build beautiful web applications with modern technologies.</p>
        <div class="space-x-4">
          <a href="https://github.com" class="text-blue-600 hover:underline">GitHub</a>
          <a href="https://linkedin.com" class="text-blue-600 hover:underline">LinkedIn</a>
          <a href="mailto:john@example.com" class="text-blue-600 hover:underline">Email</a>
        </div>
      </section>
      <section class="mb-16">
        <h2 class="text-2xl font-bold mb-6">Projects</h2>
        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="font-bold text-lg mb-2">Project One</h3>
            <p class="text-gray-600 mb-4">A modern web application built with React and TypeScript.</p>
            <div class="flex gap-2">
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">React</span>
              <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">TypeScript</span>
            </div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="font-bold text-lg mb-2">Project Two</h3>
            <p class="text-gray-600 mb-4">E-commerce platform with full payment integration.</p>
            <div class="flex gap-2">
              <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Node.js</span>
              <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">MongoDB</span>
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2 class="text-2xl font-bold mb-6">Skills</h2>
        <div class="flex flex-wrap gap-2">
          <span class="px-3 py-2 bg-white rounded shadow text-sm">JavaScript</span>
          <span class="px-3 py-2 bg-white rounded shadow text-sm">TypeScript</span>
          <span class="px-3 py-2 bg-white rounded shadow text-sm">React</span>
          <span class="px-3 py-2 bg-white rounded shadow text-sm">Node.js</span>
          <span class="px-3 py-2 bg-white rounded shadow text-sm">Python</span>
          <span class="px-3 py-2 bg-white rounded shadow text-sm">SQL</span>
        </div>
      </section>
    </main>
    <footer class="bg-gray-900 text-white py-8 text-center mt-16">
      <p>&copy; 2024 John Doe. Built with passion.</p>
    </footer>
  </body>
</html>`,
    },
  ],
};

const apiTester: Template = {
  id: "api-tester",
  name: "API Tester",
  description: "Simple REST API testing tool in the browser.",
  files: [
    {
      path: "index.html",
      contents: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>API Tester</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">API Tester</h1>
    <div class="space-y-4 mb-6">
      <div class="flex gap-2">
        <select id="method" class="px-3 py-2 border rounded">
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>DELETE</option>
        </select>
        <input id="url" type="text" placeholder="https://api.example.com/endpoint" class="flex-1 px-3 py-2 border rounded" />
        <button onclick="sendRequest()" class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Send</button>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Request Body (JSON)</label>
        <textarea id="body" rows="4" class="w-full px-3 py-2 border rounded font-mono text-sm" placeholder='{"key": "value"}'></textarea>
      </div>
      <div id="loading" class="hidden">Loading...</div>
      <div id="response" class="hidden">
        <h2 class="font-bold mb-2">Response</h2>
        <div class="flex gap-4 mb-2">
          <span>Status: <span id="status"></span></span>
          <span>Time: <span id="time"></span></span>
        </div>
        <pre id="responseBody" class="bg-gray-100 p-3 rounded overflow-auto text-sm"></pre>
      </div>
    </div>
    <script>
      async function sendRequest(){
        const method = document.getElementById('method').value;
        const url = document.getElementById('url').value;
        const body = document.getElementById('body').value;
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('response').classList.add('hidden');
        const start = Date.now();
        try {
          const opts = { method, headers: {'Content-Type':'application/json'} };
          if (body && method !== 'GET') opts.body = body;
          const res = await fetch(url, opts);
          const time = Date.now() - start;
          const text = await res.text();
          let json;
          try { json = JSON.parse(text); } catch { json = text; }
          document.getElementById('status').textContent = res.status + ' ' + res.statusText;
          document.getElementById('time').textContent = time + 'ms';
          document.getElementById('responseBody').textContent = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
          document.getElementById('response').classList.remove('hidden');
        } catch (err) {
          document.getElementById('status').textContent = 'Error';
          document.getElementById('time').textContent = '-';
          document.getElementById('responseBody').textContent = err.message;
          document.getElementById('response').classList.remove('hidden');
        } finally {
          document.getElementById('loading').classList.add('hidden');
        }
      }
    </script>
  </body>
</html>`,
    },
  ],
};

const templates: Template[] = [
  vanillaHtml,
  spaRouter,
  tailwindCdn,
  mdStatic,
  tailwindDark,
  blogStatic,
  todoApp,
  dashboard,
  landingPage,
  portfolio,
  apiTester,
];

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
            <p className="text-sm text-muted-foreground mb-2">
              {t.description}
            </p>
            <Button
              onClick={() => createFrom(t)}
              disabled={busy === t.id}
              aria-busy={busy === t.id}
            >
              {busy === t.id ? "Creating..." : "Create from template"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
