import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";
import JSZip from "jszip";
import { getGitHubToken } from "../../lib/oauth/github";

type DeployTarget = "github-pages" | "netlify" | "vercel";

export function DeployPanel() {
  const { current } = useProjectStore();
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
    const token = getGitHubToken();
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
    setStatus("Netlify deploy completed");
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
    const depTxt = await depResp.text();
    log(`Vercel deploy: ${depResp.status} ${depTxt.slice(0, 200)}`);
    setStatus(depResp.ok ? "Vercel deployment request sent" : "Vercel deploy failed");
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-3">
        <label className="text-xs flex items-center gap-1">
          <input type="checkbox" checked={useDist} onChange={(e) => setUseDist(e.currentTarget.checked)} aria-label="Use dist/ folder if present" />
          Use dist/ if present
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="space-y-2">
          <div className="font-medium">GitHub Pages</div>
          <input
            className="w-full h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="owner/repo"
            aria-label="GitHub owner/repo"
            value={ghRepo}
            onChange={(e) => setGhRepo(e.currentTarget.value)}
          />
          <Button variant="secondary" onClick={deployGitHubPages} aria-label="Deploy to GitHub Pages">
            Deploy
          </Button>
        </div>
        <div className="space-y-2">
          <div className="font-medium">Netlify</div>
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
          <Button variant="secondary" onClick={deployNetlify} aria-label="Deploy to Netlify">
            Deploy
          </Button>
        </div>
        <div className="space-y-2">
          <div className="font-medium">Vercel</div>
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
          <Button variant="secondary" onClick={deployVercel} aria-label="Deploy to Vercel">
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
      </div>
    </div>
  );
}