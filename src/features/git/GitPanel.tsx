import * as React from "react";
import { Button } from "../../components/ui/button";

export function GitPanel() {
  const [repoUrl, setRepoUrl] = React.useState("");
  const [branch, setBranch] = React.useState("main");
  const [status, setStatus] = React.useState("Idle");

  const importRepo = async () => {
    if (!repoUrl.trim()) return;
    setStatus("Fetching repository (scaffold)...");
    // Phase 2 scaffold: implement git clone via server/worker or isomorphic-git
    setTimeout(() => setStatus(`Imported (simulated): ${repoUrl}`), 600);
  };

  const pushRepo = async () => {
    setStatus("Pushing changes (scaffold)...");
    // Phase 2 scaffold: implement push via GitHub API with OAuth token
    setTimeout(() => setStatus(`Pushed to ${branch} (simulated)`), 600);
  };

  return (
    <div className="space-y-2 text-sm">
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
          onChange={(e) => setBranch(e.currentTarget.value)}
        />
        <Button variant="secondary" onClick={pushRepo} aria-label="Push changes">Push</Button>
      </div>
      <div className="rounded-md border p-2">
        <div className="font-medium">Status</div>
        <div aria-live="polite">{status}</div>
      </div>
    </div>
  );
}