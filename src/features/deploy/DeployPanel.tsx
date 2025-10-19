import * as React from "react";
import { Button } from "../../components/ui/button";

type DeployTarget = "github-pages" | "netlify" | "vercel";

export function DeployPanel() {
  const [target, setTarget] = React.useState<DeployTarget | null>(null);
  const [status, setStatus] = React.useState<string>("Idle");

  const deploy = async (t: DeployTarget) => {
    setTarget(t);
    setStatus("Preparing build artifacts...");
    // Phase 2 scaffold: this would bundle assets and push to provider-specific API
    setTimeout(() => setStatus(`Queued deploy to ${t}`), 500);
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => deploy("github-pages")} aria-label="Deploy to GitHub Pages">
          GitHub Pages
        </Button>
        <Button variant="secondary" onClick={() => deploy("netlify")} aria-label="Deploy to Netlify">
          Netlify
        </Button>
        <Button variant="secondary" onClick={() => deploy("vercel")} aria-label="Deploy to Vercel">
          Vercel
        </Button>
      </div>
      <div className="rounded-md border p-2">
        <div className="font-medium">Status</div>
        <div aria-live="polite">{status}</div>
        {target && <div className="text-xs text-muted-foreground mt-1">Target: {target}</div>}
      </div>
    </div>
  );
}