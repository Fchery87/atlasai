import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";
import { startGitHubOAuth, completeGitHubOAuth, getGitHubToken, clearGitHubToken, saveGitHubClientConfig, loadGitHubClientConfig } from "../../lib/oauth/github";
import { loadDecrypted, saveEncrypted } from "../../lib/oauth/github";

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url.replace(/\.git$/, ""));
    if (u.hostname !== "github.com") return null;
    const [owner, repo] = u.pathname.replace(/^\/+/, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

export function GitPanel() {
  const { current, importZip } = useProjectStore();
  const [repoUrl, setRepoUrl] = React.useState("");
  const [branch, setBranch] = React.useState("main");
  const [status, setStatus] = React.useState("Idle");
  const pid = useProjectStore().current?.id;
  const [ghClientId, setGhClientId] = React.useState<string>("");
  const [workerUrl, setWorkerUrl] = React.useState<string>("");
  const [token, setToken] = React.useState<string | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    // Load encrypted config, token, and default branch for this project
    (async () => {
      const cfg = await loadGitHubClientConfig();
      if (cfg.clientId) setGhClientId(cfg.clientId);
      if (cfg.workerUrl) setWorkerUrl(cfg.workerUrl);
      const t = await getGitHubToken();
      setToken(t);
      const defBranch = (await loadDecrypted(pid ? `sec_default_branch:${pid}` : "sec_default_branch")) || "main";
      setBranch(defBranch);
      const savedBranch = (await loadDecrypted(pid ? `sec_git_branch:${pid}` : "sec_git_branch")) || undefined;
      if (savedBranch) setBranch(savedBranch);
      const help = await loadDecrypted(pid ? `sec_help_git:${pid}` : "sec_help_git");
      setShowHelp(help === "1");
    })();
  }, [pid]);

  React.useEffect(() => {
    saveEncrypted(pid ? `sec_help_git:${pid}` : "sec_help_git", showHelp ? "1" : "0");
  }, [showHelp, pid]);

  React.useEffect(() => {
    // Persist config encrypted
    if (ghClientId || workerUrl) {
      saveGitHubClientConfig(ghClientId, workerUrl);
    }
  }, [ghClientId, workerUrl]);

  React.useEffect(() => {
    // Handle OAuth callback if code present
    const url = new URL(window.location.href);
    if (url.searchParams.get("code") && url.searchParams.get("state")) {
      completeGitHubOAuth().then((res) => {
        if (res.access_token) {
          setToken(res.access_token);
          setStatus("GitHub signed in");
        } else {
          setStatus(`OAuth error: ${res.error}`);
        }
        // Clean URL
        window.history.replaceState({}, "", url.pathname);
      });
    }
  }, []);

  const signIn = async () => {
    if (!ghClientId || !workerUrl) {
      setStatus("Set GitHub Client ID and Worker URL");
      return;
    }
    await startGitHubOAuth({
      clientId: ghClientId,
      redirectUri: window.location.origin,
      scope: "repo",
      workerCallbackUrl: workerUrl,
    });
  };

  const signOut = () => {
    clearGitHubToken();
    setToken(null);
    setStatus("Signed out");
  };

  const importRepo = async () => {
    if (!repoUrl.trim()) return;
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setStatus("Invalid GitHub URL");
      return;
    }
    const ref = branch || "main";
    const zipUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/zipball/${encodeURIComponent(ref)}`;
    setStatus(`Fetching ${parsed.owner}/${parsed.repo}@${ref}...`);
    const resp = await fetch(zipUrl, token ? { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } } : undefined);
    if (!resp.ok) {
      setStatus(`Fetch failed: ${resp.status}`);
      return;
    }
    const blob = await resp.blob();
    const file = new File([blob], `${parsed.repo}-${ref}.zip`, { type: "application/zip" });
    await importZip(file);
    setStatus(`Imported ${parsed.owner}/${parsed.repo}@${ref}`);
  };

  const pushRepo = async () => {
    if (!current) return;
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setStatus("Invalid GitHub URL");
      return;
    }
    if (!token) {
      setStatus("Sign in to GitHub first");
      return;
    }
    setStatus(`Syncing with ${parsed.owner}/${parsed.repo}@${branch}...`);
    const apiBase = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
    // Fetch repo tree to detect deletes
    const treeResp = await fetch(`${apiBase}/git/trees/${encodeURIComponent(branch)}?recursive=1`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    let remoteFiles: Record<string, string> = {};
    if (treeResp.ok) {
      const tree = await treeResp.json().catch(() => null);
      (tree?.tree || []).forEach((n: any) => {
        if (n.type === "blob") remoteFiles[n.path] = n.sha;
      });
    }

    // Push updates and additions
    const contentsBase = `${apiBase}/contents`;
    const localPaths = new Set(current.files.map((f) => f.path));
    for (const f of current.files) {
      const path = f.path;
      let sha: string | undefined = remoteFiles[path];
      const content = btoa(unescape(encodeURIComponent(f.contents)));
      const body = { message: `Update ${path} via BoltForge`, content, branch, sha };
      const putResp = await fetch(`${contentsBase}/${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!putResp.ok) {
        const err = await putResp.text();
        setStatus(`Failed on ${path}: ${putResp.status} ${err.slice(0, 120)}`);
        return;
      }
    }

    // Ensure .gitignore if present locally
    if (localPaths.has(".gitignore")) {
      const file = current.files.find((f) => f.path === ".gitignore")!;
      const content = btoa(unescape(encodeURIComponent(file.contents)));
      const body = { message: "Update .gitignore via BoltForge", content, branch, sha: remoteFiles[".gitignore"] };
      await fetch(`${contentsBase}/.gitignore`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }

    // Delete remote files not present locally (excluding .git and safeguards)
    const deleteCandidates = Object.keys(remoteFiles).filter((p) => !localPaths.has(p) && !p.startsWith(".git"));
    for (const p of deleteCandidates) {
      const delResp = await fetch(`${contentsBase}/${encodeURIComponent(p)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Delete ${p} via BoltForge`, branch, sha: remoteFiles[p] }),
      });
      if (!delResp.ok) {
        const err = await delResp.text();
        setStatus(`Delete failed on ${p}: ${delResp.status} ${err.slice(0, 120)}`);
        return;
      }
    }

    setStatus(`Pushed ${current.files.length} file(s); deleted ${deleteCandidates.length} file(s) on ${parsed.owner}/${parsed.repo}@${branch}`);
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-medium">Git</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(v => !v)} aria-label="Git help">?</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem(pid ? `sec_help_git:${pid}` : "sec_help_git");
              setShowHelp(false);
            }}
            aria-label="Reset Git UI tips"
            title="Reset Git UI tips"
          >
            Reset UI Tips
          </Button>
        </div>
      </div>
      {showHelp && (
        <div className="text-xs text-muted-foreground border rounded-md p-2">
          - Sign in using your GitHub OAuth Client ID and Worker URL (kept client-side).<br />
          - Import from a Git URL to seed a project; Push syncs local files to the selected branch.<br />
          - Push will create/update files and delete those missing locally (excluding .git paths).
        </div>
      )}
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="GitHub OAuth Client ID"
          aria-label="GitHub Client ID"
          value={ghClientId}
          onChange={(e) => setGhClientId(e.currentTarget.value)}
        />
        <input
          className="flex-1 h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="OAuth Worker URL (e.g., https://your-worker.workers.dev)"
          aria-label="Worker URL"
          value={workerUrl}
          onChange={(e) => setWorkerUrl(e.currentTarget.value)}
        />
        {token ? (
          <Button variant="secondary" onClick={signOut} aria-label="Sign out">Sign out</Button>
        ) : (
          <Button onClick={signIn} aria-label="Sign in with GitHub">Sign in</Button>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="https://github.com/owner/repo.git"
          aria-label="Git repository URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.currentTarget.value)}
        />
        <Button onClick={importRepo} aria-label="Import from Git URL">Import</Button>
      </div>
      <div className="flex gap-2 items-center">
        <input
          className="w-40 h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="branch"
          aria-label="Branch"
          value={branch}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setBranch(v);
            if (v) saveEncrypted(pid ? `sec_git_branch:${pid}` : "sec_git_branch", v);
          }}
          title="Defaulted from project default branch"
        />
        <Button variant="secondary" onClick={pushRepo} aria-label="Push changes">Push</Button>
      </div>
      <div className="rounded-md border p-2">
        <div className="font-medium">Status</div>
        <div aria-live="polite">{status}</div>
        {token && <div className="text-xs text-muted-foreground mt-1">Signed in to GitHub</div>}
      </div>
    </div>
  );
}