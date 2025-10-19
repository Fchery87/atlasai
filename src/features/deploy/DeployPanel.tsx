import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";
import JSZip from "jszip";
import { getGitHubToken, saveEncrypted, loadDecrypted } from "../../lib/oauth/github";

type DeployTarget = "github-pages" | "netlify" | "vercel";

function nsKey(projectId: string | undefined, key: string) {
  return projectId ? `${key}:${projectId}` : key;
}

export function DeployPanel() {
  const { current, upsertFile } = useProjectStore();
  const pid = current?.id;
  const [target, setTarget] = React.useState<DeployTarget | null>(null);
  const [status, setStatus] = React.useState<string>("Idle");
  const [logs, setLogs] = React.useState<string[]>([]);
  const [ghRepo, setGhRepo] = React.useState<string>(""); // owner/repo
  const [netlifyToken, setNetlifyToken] = React.useState<string>("");
  const [netlifySiteId, setNetlifySiteId] = React.useState<string>("");
  const [vercelToken, setVercelToken] = React.useState<string>("");
  const [vercelProject, setVercelProject] = React.useState<string>("");
  const [vercelFramework, setVercelFramework] = React.useState<string>("vite");
  const [vercelBuildCmd, setVercelBuildCmd] = React.useState<string>("npm run build");
  const [vercelOutDir, setVercelOutDir] = React.useState<string>("dist");

  const log = (line: string) => setLogs((l) => [...l, line]);

  const [useDist, setUseDist] = React.useState<boolean>(true);
  const [ciBranch, setCiBranch] = React.useState<string>("main");
  const [userRepoBranch, setUserRepoBranch] = React.useState<string>("main");
  const [defaultBranch, setDefaultBranch] = React.useState<string>("main");

  // Optional status worker (Cloudflare)
  const [statusWorkerUrl, setStatusWorkerUrl] = React.useState<string>("");

  // Help toggles
  const [ghHelp, setGhHelp] = React.useState(false);
  const [netlifyHelp, setNetlifyHelp] = React.useState(false);
  const [vercelHelp, setVercelHelp] = React.useState(false);
  const [hideDistBanner, setHideDistBanner] = React.useState(false);

  // Load persisted tokens/config per-project with global fallback
  React.useEffect(() => {
    (async () => {
      const keys = [
        [setNetlifyToken, ["sec_netlify_token", nsKey(pid, "sec_netlify_token")]],
        [setNetlifySiteId, ["sec_netlify_site", nsKey(pid, "sec_netlify_site")]],
        [setVercelToken, ["sec_vercel_token", nsKey(pid, "sec_vercel_token")]],
        [setVercelProject, ["sec_vercel_project", nsKey(pid, "sec_vercel_project")]],
        [setVercelFramework, ["sec_vercel_framework", nsKey(pid, "sec_vercel_framework")]],
        [setVercelBuildCmd, ["sec_vercel_build_cmd", nsKey(pid, "sec_vercel_build_cmd")]],
        [setVercelOutDir, ["sec_vercel_out_dir", nsKey(pid, "sec_vercel_out_dir")]],
        [setGhRepo, ["sec_github_pages_repo", nsKey(pid, "sec_github_pages_repo")]],
      ] as const;

      for (const [setter, [globalKey, projKey]] of keys) {
        const v = (await loadDecrypted(projKey)) ?? (await loadDecrypted(globalKey));
        if (v) setter(v);
      }
      const def = (await loadDecrypted(nsKey(pid, "sec_default_branch"))) ?? "main";
      setDefaultBranch(def);
      setCiBranch(def);
      setUserRepoBranch(def);

      // Optional status worker URL
      const sw = await loadDecrypted(nsKey(pid, "sec_status_worker_url"));
      if (sw) setStatusWorkerUrl(sw);

      // Load UI prefs
      const hide = await loadDecrypted(nsKey(pid, "sec_hide_dist_banner"));
      setHideDistBanner(hide === "1");
      const gh = await loadDecrypted(nsKey(pid, "sec_help_gh"));
      const nl = await loadDecrypted(nsKey(pid, "sec_help_netlify"));
      const vc = await loadDecrypted(nsKey(pid, "sec_help_vercel"));
      setGhHelp(gh === "1");
      setNetlifyHelp(nl === "1");
      setVercelHelp(vc === "1");
    })();
  }, [pid]);

  // Listen for global UI tips reset to soft-refresh local UI states
  React.useEffect(() => {
    const onReset = () => {
      setGhHelp(false);
      setNetlifyHelp(false);
      setVercelHelp(false);
      setHideDistBanner(false);
    };
    window.addEventListener("bf:reset-ui-tips", onReset as EventListener);
    return () => window.removeEventListener("bf:reset-ui-tips", onReset as EventListener);
  }, []);

  // Save per-project
  React.useEffect(() => { if (netlifyToken) saveEncrypted(nsKey(pid, "sec_netlify_token"), netlifyToken); }, [netlifyToken, pid]);
  React.useEffect(() => { if (netlifySiteId) saveEncrypted(nsKey(pid, "sec_netlify_site"), netlifySiteId); }, [netlifySiteId, pid]);
  React.useEffect(() => { if (vercelToken) saveEncrypted(nsKey(pid, "sec_vercel_token"), vercelToken); }, [vercelToken, pid]);
  React.useEffect(() => { if (vercelProject) saveEncrypted(nsKey(pid, "sec_vercel_project"), vercelProject); }, [vercelProject, pid]);
  React.useEffect(() => { if (vercelFramework) saveEncrypted(nsKey(pid, "sec_vercel_framework"), vercelFramework); }, [vercelFramework, pid]);
  React.useEffect(() => { if (vercelBuildCmd) saveEncrypted(nsKey(pid, "sec_vercel_build_cmd"), vercelBuildCmd); }, [vercelBuildCmd, pid]);
  React.useEffect(() => { if (vercelOutDir) saveEncrypted(nsKey(pid, "sec_vercel_out_dir"), vercelOutDir); }, [vercelOutDir, pid]);
  React.useEffect(() => { if (ghRepo) saveEncrypted(nsKey(pid, "sec_github_pages_repo"), ghRepo); }, [ghRepo, pid]);
  React.useEffect(() => { if (defaultBranch) saveEncrypted(nsKey(pid, "sec_default_branch"), defaultBranch); }, [defaultBranch, pid]);
  React.useEffect(() => { if (statusWorkerUrl) saveEncrypted(nsKey(pid, "sec_status_worker_url"), statusWorkerUrl); }, [statusWorkerUrl, pid]);
  // Persist UI prefs
  React.useEffect(() => { saveEncrypted(nsKey(pid, "sec_help_gh"), ghHelp ? "1" : "0"); }, [ghHelp, pid]);
  React.useEffect(() => { saveEncrypted(nsKey(pid, "sec_help_netlify"), netlifyHelp ? "1" : "0"); }, [netlifyHelp, pid]);
  React.useEffect(() => { saveEncrypted(nsKey(pid, "sec_help_vercel"), vercelHelp ? "1" : "0"); }, [vercelHelp, pid]);

  const distMissing = React.useMemo(() => {
    if (!current || !useDist || hideDistBanner) return false;
    return !current.files.some((f) => f.path.startsWith("dist/"));
  }, [current, useDist, hideDistBanner]);

  const filesForDeploy = React.useCallback(() => {
    if (!current) return [];
    if (!useDist) return current.files;
    const dist = current.files.filter((f) => f.path.startsWith("dist/"));
    if (dist.length === 0) {
      log("dist/ not found. Falling back to project root files.");
      return current.files;
    }
    // Strip 'dist/' prefix for deployment roots
    return dist.map((f) => ({ ...f, path: f.path.replace(/^dist\//, "") }));
  }, [current, useDist]);

  const deployGitHubPages = async () => {
    const token = await getGitHubToken();
    if (!current || !ghRepo || !token) {
      setStatus("Provide owner/repo and sign in to GitHub");
      return;
    }
    const [owner, repo] = ghRepo.split("/");
    if (!owner || !repo) {
      setStatus("Invalid owner/repo");
      return;
    }
    setTarget("github-pages");
    setStatus("Deploying to GitHub Pages (gh-pages branch)...");
    const branch = "gh-pages";
    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents`;

    const files = filesForDeploy();
    for (const f of files) {
      const path = f.path;
      // Create/update file in gh-pages branch
      let sha: string | undefined;
      const head = await fetch(`${apiBase}/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (head.ok) {
        const j = await head.json().catch(() => null);
        sha = j?.sha;
      }
      const content = btoa(unescape(encodeURIComponent(f.contents)));
      const body = { message: `Deploy ${path} via BoltForge`, content, branch, sha };
      const put = await fetch(`${apiBase}/${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!put.ok) {
        const err = await put.text();
        log(`Failed ${path}: ${put.status} ${err.slice(0, 120)}`);
        setStatus("Deploy failed");
        return;
      } else {
        log(`Uploaded ${path}`);
      }
    }
    // Create .nojekyll to avoid Jekyll processing
    const nj = await fetch(`${apiBase}/.nojekyll`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Disable Jekyll", content: btoa(""), branch }),
    });
    if (nj.ok) log("Created .nojekyll");
    setStatus(`Deployed to GitHub Pages on branch ${branch}`);
  };

  const zipCurrent = async (): Promise<Blob | null> => {
    if (!current) return null;
    const zip = new JSZip();
    const files = filesForDeploy();
    for (const f of files) {
      zip.file(f.path, f.contents);
    }
    return zip.generateAsync({ type: "blob" });
  };

  const deployNetlify = async () => {
    setTarget("netlify");
    setStatus("Deploying to Netlify (hash-based)...");
    if (!netlifyToken || !netlifySiteId) {
      setStatus("Provide Netlify token and site ID");
      return;
    }
    const files = filesForDeploy();
    const pathToSha: Record<string, string> = {};
    for (const f of files) {
      pathToSha[`/${f.path}`] = await (await import("../../lib/deploy/util")).sha1Hex(f.contents);
    }
    // 1) Create deploy with files map
    const createResp = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(netlifySiteId)}/deploys`, {
      method: "POST",
      headers: { Authorization: `Bearer ${netlifyToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files: pathToSha }),
    });
    const create = await createResp.json().catch(() => ({}));
    if (!createResp.ok) {
      log(`Netlify create failed: ${createResp.status} ${JSON.stringify(create).slice(0, 200)}`);
      setStatus("Netlify deploy failed");
      return;
    }
    log(`Netlify deploy id: ${create.id}`);
    // 2) Upload required files
    const required: string[] = Array.isArray(create.required) ? create.required : [];
    for (const req of required) {
      const rel = req.startsWith("/") ? req : `/${req}`;
      const local = files.find((f) => `/${f.path}` === rel);
      if (!local) continue;
      const put = await fetch(create.upload_urls ? create.upload_urls[req] : `${create.deploy_uploads_url}${rel}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${netlifyToken}` },
        body: new Blob([local.contents]),
      });
      if (!put.ok) {
        log(`Netlify upload failed for ${rel}: ${put.status}`);
        setStatus("Netlify deploy failed");
        return;
      } else {
        log(`Uploaded ${rel}`);
      }
    }
    // 3) Poll deploy status
    if (create.id) {
      setStatus("Netlify deploy uploaded, polling status...");
      const pollUrl = statusWorkerUrl ? `${statusWorkerUrl}/status/netlify?id=${encodeURIComponent(create.id)}` : `https://api.netlify.com/api/v1/deploys/${encodeURIComponent(create.id)}`;
      const pollHeaders = statusWorkerUrl ? { Authorization: `Bearer ${netlifyToken}` } : { Authorization: `Bearer ${netlifyToken}` };
      let attempts = 0;
      const maxAttempts = 20;
      const interval = 3000;
      const timer = setInterval(async () => {
        attempts++;
        try {
          const resp = await fetch(pollUrl, { headers: pollHeaders });
          const data = await resp.json().catch(() => ({}));
          const info = statusWorkerUrl ? data?.data : data;
          const state = info?.state || info?.status;
          log(`Netlify status: ${state || resp.status}`);
          if (state === "ready" || state === "published") {
            clearInterval(timer);
            setStatus("Netlify deploy ready");
          }
          if (attempts >= maxAttempts) {
            clearInterval(timer);
            setStatus("Netlify polling timed out");
          }
        } catch {
          // ignore transient
        }
      }, interval);
    } else {
      setStatus("Netlify deploy completed");
    }
  };

  const deployVercel = async () => {
    setTarget("vercel");
    setStatus("Deploying to Vercel (project link)...");
    if (!vercelToken || !vercelProject) {
      setStatus("Provide Vercel token and project name");
      return;
    }

    // Ensure project exists and has proper framework/build settings
    const projResp = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(vercelProject)}`, {
      headers: { Authorization: `Bearer ${vercelToken}` },
    });
    if (projResp.status === 404) {
      const create = await fetch("https://api.vercel.com/v9/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vercelProject,
          framework: vercelFramework,
          buildCommand: vercelBuildCmd,
          outputDirectory: vercelOutDir,
        }),
      });
      const txt = await create.text();
      log(`Vercel project create: ${create.status} ${txt.slice(0, 200)}`);
      if (!create.ok) {
        setStatus("Vercel project create failed");
        return;
      }
    } else if (projResp.ok) {
      // Patch settings
      await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(vercelProject)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          framework: vercelFramework,
          buildCommand: vercelBuildCmd,
          outputDirectory: vercelOutDir,
        }),
      }).catch(() => {});
    } else {
      setStatus(`Vercel error: ${projResp.status}`);
      return;
    }

    // Kick off a deployment linking to the project
    const depResp = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: vercelProject,
        target: "production",
        project: vercelProject,
      }),
    });
    const depJson = await depResp.json().catch(() => ({}));
    const depId = depJson?.id;
    log(`Vercel deploy: ${depResp.status} id=${depId || "unknown"}`);
    if (!depResp.ok) {
      setStatus("Vercel deploy failed");
      return;
    }
    setStatus("Vercel deployment request sent, polling status...");
    if (depId) {
      const pollUrl = statusWorkerUrl ? `${statusWorkerUrl}/status/vercel?id=${encodeURIComponent(depId)}` : `https://api.vercel.com/v13/deployments/${encodeURIComponent(depId)}`;
      const pollHeaders = statusWorkerUrl ? { Authorization: `Bearer ${vercelToken}` } : { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" };
      let attempts = 0;
      const maxAttempts = 20;
      const interval = 3000;
      const timer = setInterval(async () => {
        attempts++;
        try {
          const resp = await fetch(pollUrl, { headers: pollHeaders });
          const data = await resp.json().catch(() => ({}));
          const info = statusWorkerUrl ? data?.data : data;
          const state = info?.readyState || info?.state;
          log(`Vercel status: ${state || resp.status}`);
          if (state === "READY" || state === "ready") {
            clearInterval(timer);
            setStatus("Vercel deploy ready");
          }
          if (attempts >= maxAttempts) {
            clearInterval(timer);
            setStatus("Vercel polling timed out");
          }
        } catch {
          // ignore
        }
      }, interval);
    }
  };

  return (
    <div className="space-y-2 text-sm">
      
      <div className="flex items-center gap-3">
        <label className="text-xs flex items-center gap-1">
          <input type="checkbox" checked={useDist} onChange={(e) => setUseDist(e.currentTarget.checked)} aria-label="Use dist/ folder if present" />
          Use dist/ if present
        </label>
        <label className="text-xs flex items-center gap-1" title="Default branch used for generated workflows">
          <span>Default branch</span>
          <input
            className="h-7 rounded-md border border-input px-2 text-xs"
            value={defaultBranch}
            onChange={(e) => {
              const v = e.currentTarget.value || "main";
              setDefaultBranch(v);
              setCiBranch(v);
              setUserRepoBranch(v);
            }}
            aria-label="Default branch"
          />
        </label>
        <label className="text-xs flex items-center gap-1" title="Optional: Cloudflare Worker URL for status polling">
          <span>Status Worker</span>
          <input
            className="h-7 rounded-md border border-input px-2 text-xs"
            placeholder="https://your-deploy-status.workers.dev"
            value={statusWorkerUrl}
            onChange={(e) => setStatusWorkerUrl(e.currentTarget.value)}
            aria-label="Status worker URL"
          />
        </label>
      </div>
      {distMissing && (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-xs" role="status" aria-live="polite">
          <div className="flex items-start justify-between gap-2">
            <div>
              No dist/ files detected. You can:
              <ul className="list-disc list-inside">
                <li>Uncheck “Use dist/ if present” to deploy current project files, or</li>
                <li>Generate a CI workflow below to build and publish dist/ automatically.</li>
              </ul>
            </div>
            <button
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-amber-100"
              onClick={() => {
                setHideDistBanner(true);
                saveEncrypted(nsKey(pid, "sec_hide_dist_banner"), "1");
              }}
              aria-label="Dismiss and don't show again for this project"
              title="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">GitHub Pages</div>
            <Button variant="ghost" size="sm" onClick={() => setGhHelp((v) => !v)} aria-label="GitHub Pages help">?</Button>
          </div>
          {ghHelp && (
            <div className="text-xs text-muted-foreground">
              <ol className="list-decimal list-inside space-y-1">
                <li>Enter owner/repo where you have write access.</li>
                <li>Sign in via Git (top of Git panel) if you haven't.</li>
                <li>Click Deploy to upload files to gh-pages branch.</li>
                <li>Enable Pages in repo settings for gh-pages branch.</li>
                <li>Optional: Download a CI workflow to build dist/ and publish automatically.</li>
              </ol>
            </div>
          )}
          <input
            className="w-full h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="owner/repo"
            aria-label="GitHub owner/repo"
            value={ghRepo}
            onChange={(e) => setGhRepo(e.currentTarget.value)}
          />
          <div className="flex gap-2 items-center">
            <Button variant="secondary" onClick={deployGitHubPages} aria-label="Deploy to GitHub Pages" title="Uploads current files (or dist/) to gh-pages branch">
              Deploy
            </Button>
            <input
              className="h-9 rounded-md border border-input px-3 text-sm"
              placeholder="CI branch (e.g., main)"
              aria-label="GH Pages CI branch"
              value={ciBranch}
              onChange={(e) => setCiBranch(e.currentTarget.value)}
              title="Workflow will run on pushes to this branch"
            />
            <Button
              variant="ghost"
              onClick={() => {
                import("../../lib/deploy/workflows").then(({ generateGhPagesWorkflow }) => {
                  const content = generateGhPagesWorkflow(ciBranch);
                  const blob = new Blob([content], { type: "text/yaml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "gh-pages.yml";
                  a.click();
                  URL.revokeObjectURL(url);
                });
              }}
              aria-label="Download GitHub Pages workflow"
              title="Download GitHub Pages workflow (add to .github/workflows)"
            >
              Download GH Pages Workflow
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">Netlify</div>
            <Button variant="ghost" size="sm" onClick={() => setNetlifyHelp((v) => !v)} aria-label="Netlify help">?</Button>
          </div>
          {netlifyHelp && (
            <div className="text-xs text-muted-foreground">
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a Netlify Personal Access Token and Site ID.</li>
                <li>Enter token and site ID here. Token requires deploy rights.</li>
                <li>Click Deploy to create a hash-based deploy and upload required files only.</li>
                <li>Use dist/ for faster deploys, or disable it to deploy current files.</li>
              </ol>
            </div>
          )}
          <input
            className="w-full h-9 rounded-md border border-input px-3 text-sm"
            placeholder="Netlify token"
            aria-label="Netlify token"
            value={netlifyToken}
            onChange={(e) => setNetlifyToken(e.currentTarget.value)}
          />
          <input
            className="w-full h-9 rounded-md border border-input px-3 text-sm"
            placeholder="Site ID"
            aria-label="Netlify site id"
            value={netlifySiteId}
            onChange={(e) => setNetlifySiteId(e.currentTarget.value)}
          />
          <Button variant="secondary" onClick={deployNetlify} aria-label="Deploy to Netlify" title="Creates a hash-based deploy and uploads only required files">
            Deploy
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">Vercel</div>
            <Button variant="ghost" size="sm" onClick={() => setVercelHelp((v) => !v)} aria-label="Vercel help">?</Button>
          </div>
          {vercelHelp && (
            <div className="text-xs text-muted-foreground">
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a Vercel token and a project name.</li>
                <li>Optionally set framework, build command, and output directory.</li>
                <li>Click Deploy to create/patch the project and trigger a deployment.</li>
                <li>Use CI to build dist/ if you don’t commit built assets.</li>
              </ol>
            </div>
          )}
          <input
            className="w-full h-9 rounded-md border border-input px-3 text-sm"
            placeholder="Vercel token"
            aria-label="Vercel token"
            value={vercelToken}
            onChange={(e) => setVercelToken(e.currentTarget.value)}
          />
          <input
            className="w-full h-9 rounded-md border border-input px-3 text-sm"
            placeholder="Project name"
            aria-label="Vercel project"
            value={vercelProject}
            onChange={(e) => setVercelProject(e.currentTarget.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              className="w-full h-9 rounded-md border border-input px-3 text-sm"
              placeholder="framework (e.g., vite)"
              aria-label="Vercel framework"
              value={vercelFramework}
              onChange={(e) => setVercelFramework(e.currentTarget.value)}
            />
            <input
              className="w-full h-9 rounded-md border border-input px-3 text-sm"
              placeholder="build command"
              aria-label="Vercel build command"
              value={vercelBuildCmd}
              onChange={(e) => setVercelBuildCmd(e.currentTarget.value)}
            />
            <input
              className="w-full h-9 rounded-md border border-input px-3 text-sm"
              placeholder="output dir"
              aria-label="Vercel output dir"
              value={vercelOutDir}
              onChange={(e) => setVercelOutDir(e.currentTarget.value)}
            />
          </div>
          <Button variant="secondary" onClick={deployVercel} aria-label="Deploy to Vercel" title="Links project/config then requests a deployment">
            Deploy
          </Button>
        </div>
      </div>
      <div className="rounded-md border p-2">
        <div className="font-medium">Status</div>
        <div aria-live="polite">{status}</div>
        {target && <div className="text-xs text-muted-foreground mt-1">Target: {target}</div>}
        <div className="mt-2 text-xs max-h-40 overflow-auto">
          {logs.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <div className="font-medium">SPA Routing Helpers</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button
              variant="ghost"
              title="Add 404.html forwarding to index.html for GitHub Pages SPA"
              onClick={async () => {
                const html = `<!doctype html><html><head><meta charset="utf-8"><title>404</title></head><body>
<script>
  // GitHub Pages SPA fallback: redirect all 404s to index.html preserving path in hash
  var l = window.location;
  var p = l.pathname.replace(/^(\\/)/, "");
  // you can handle this in your app to route accordingly
  l.replace(l.origin + "/index.html#/" + p);
</script>
</body></html>`;
                await upsertFile("404.html", html);
                setStatus("Added 404.html SPA fallback for GitHub Pages");
              }}
            >
              Add GH Pages SPA 404.html
            </Button>
            <Button
              variant="ghost"
              title="Add Netlify _redirects file to rewrite to index.html"
              onClick={async () => {
                await upsertFile("_redirects", "/* /index.html 200\n");
                setStatus("Added Netlify _redirects for SPA");
              }}
            >
              Add Netlify _redirects
            </Button>
            <Button
              variant="ghost"
              title="Add vercel.json rewrites to index.html"
              onClick={async () => {
                const vercelJson = JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/" }] }, null, 2);
                await upsertFile("vercel.json", vercelJson);
                setStatus("Added vercel.json SPA rewrites");
              }}
            >
              Add Vercel rewrites
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            These helpers ensure client-side routers work in production by serving index.html for all routes.
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="font-medium">User Repo CI Workflow</div>
          <div className="flex items-center gap-2">
            <input
              className="h-9 rounded-md border border-input px-3 text-sm"
              placeholder="User repo branch (e.g., main)"
              aria-label="User repo branch"
              value={userRepoBranch}
              onChange={(e) => setUserRepoBranch(e.currentTarget.value)}
              title="Workflow will run on pushes to this branch"
            />
            <Button
              variant="ghost"
              onClick={() => {
                import("../../lib/deploy/workflows").then(({ generateUserGhPagesWorkflow }) => {
                  const content = generateUserGhPagesWorkflow(userRepoBranch);
                  const blob = new Blob([content], { type: "text/yaml" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "user-gh-pages.yml";
                  a.click();
                  URL.revokeObjectURL(url);
                });
              }}
              aria-label="Download user GH Pages workflow"
              title="Download user GH Pages workflow (add to .github/workflows)"
            >
              Download User GH Pages Workflow
            </Button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="font-medium">Stored Credentials (encrypted)</div>
          <ul className="text-xs space-y-1">
            <li title="Saved for this project only">Netlify token: {netlifyToken ? "stored" : "not set"}</li>
            <li title="Saved for this project only">Netlify site id: {netlifySiteId ? "stored" : "not set"}</li>
            <li title="Saved for this project only">Vercel token: {vercelToken ? "stored" : "not set"}</li>
            <li title="Saved for this project only">Vercel project: {vercelProject ? "stored" : "not set"}</li>
            <li title="Saved for this project only">GH Pages repo: {ghRepo ? "stored" : "not set"}</li>
            <li title="Saved for this project only">Default branch: {defaultBranch || "main"}</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                const keys = [
                  nsKey(pid, "sec_netlify_token"),
                  nsKey(pid, "sec_netlify_site"),
                  nsKey(pid, "sec_vercel_token"),
                  nsKey(pid, "sec_vercel_project"),
                  nsKey(pid, "sec_vercel_framework"),
                  nsKey(pid, "sec_vercel_build_cmd"),
                  nsKey(pid, "sec_vercel_out_dir"),
                  nsKey(pid, "sec_github_pages_repo"),
                  nsKey(pid, "sec_default_branch"),
                ];
                keys.forEach((k) => localStorage.removeItem(k));
                setNetlifyToken("");
                setNetlifySiteId("");
                setVercelToken("");
                setVercelProject("");
                setVercelFramework("vite");
                setVercelBuildCmd("npm run build");
                setVercelOutDir("dist");
                setGhRepo("");
                setDefaultBranch("main");
                setCiBranch("main");
                setUserRepoBranch("main");
                setStatus("Cleared stored credentials for this project");
              }}
              aria-label="Clear stored credentials"
              title="Clear stored credentials for this project"
            >
              Clear Stored Credentials (Project)
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                // Clear all deploy-related secrets across all projects
                const toRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i) || "";
                  if (
                    k.startsWith("sec_netlify_") ||
                    k.startsWith("sec_vercel_") ||
                    k.startsWith("sec_github_pages_repo") ||
                    k.startsWith("sec_default_branch")
                  ) {
                    toRemove.push(k);
                  }
                }
                toRemove.forEach((k) => localStorage.removeItem(k));
                setStatus("Cleared all stored deploy credentials");
              }}
              aria-label="Clear all stored deploy credentials"
              title="Clear all stored deploy credentials across all projects"
            >
              Clear All Stored Credentials
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                // Reset UI tips for this project
                const keys = [
                  nsKey(pid, "sec_hide_dist_banner"),
                  nsKey(pid, "sec_help_gh"),
                  nsKey(pid, "sec_help_netlify"),
                  nsKey(pid, "sec_help_vercel"),
                ];
                keys.forEach((k) => localStorage.removeItem(k));
                setHideDistBanner(false);
                setGhHelp(false);
                setNetlifyHelp(false);
                setVercelHelp(false);
                setStatus("Reset UI tips for this project");
              }}
              aria-label="Reset UI tips for this project"
              title="Reset UI tips for this project"
            >
              Reset UI Tips (Project)
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2" title="How to use the workflows">
            Tip: Add the downloaded YAML file to your repo under .github/workflows/, commit, and push. GitHub will run the workflow on pushes to the specified branch. Ensure your project builds to dist/ (or adjust publish_dir/output). For GitHub Pages, enable Pages in repo settings if needed.
          </div>
        </div>
      </div>
    </div>
  );
