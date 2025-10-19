import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";
import { loadDecrypted, saveEncrypted } from "../../lib/oauth/github";

type DiffSummary = {
  added: string[];
  removed: string[];
  modified: string[];
};

function summarizeDiff(current: { path: string; contents: string }[], snap: { path: string; contents: string }[]): DiffSummary {
  const curMap = new Map(current.map((f) => [f.path, f.contents]));
  const snapMap = new Map(snap.map((f) => [f.path, f.contents]));
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  for (const [p] of snapMap) {
    if (!curMap.has(p)) added.push(p);
    else if (curMap.get(p) !== snapMap.get(p)) modified.push(p);
  }
  for (const [p] of curMap) {
    if (!snapMap.has(p)) removed.push(p);
  }
  return { added, removed, modified };
}

export function SnapshotList() {
  const { current, restoreSnapshot, stageDiff } = useProjectStore();
  const snaps = current?.snapshots ?? [];
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const v = await loadDecrypted(current?.id ? `sec_help_snapshots:${current.id}` : "sec_help_snapshots");
      setShowHelp(v === "1");
    })();
  }, [current?.id]);

  React.useEffect(() => {
    saveEncrypted(current?.id ? `sec_help_snapshots:${current.id}` : "sec_help_snapshots", showHelp ? "1" : "0");
  }, [showHelp, current?.id]);

  const onRestore = async (id: string) => {
    if (confirm("Restore this snapshot? Current files will be replaced.")) {
      await restoreSnapshot(id);
      setPreviewId(null);
    }
  };

  const selected = snaps.find((s) => s.id === previewId);
  const summary: DiffSummary | null =
    selected && current
      ? summarizeDiff(current.files, selected.files)
      : null;

  const openFileDiff = (path: string) => {
    if (!current || !selected) return;
    const before = current.files.find((f) => f.path === path)?.contents ?? "";
    const after = selected.files.find((f) => f.path === path)?.contents ?? "";
    // Only stage diffs for files that exist in snapshot (added or modified)
    if (after !== undefined) {
      stageDiff(path, after);
    }
  };

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Snapshots</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(v => !v)} aria-label="Snapshots help">?</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem(current?.id ? `sec_help_snapshots:${current.id}` : "sec_help_snapshots");
              setShowHelp(false);
            }}
            aria-label="Reset Snapshots UI tips"
            title="Reset Snapshots UI tips"
          >
            Reset UI Tips
          </Button>
        </div>
      </div>
      {showHelp && (
        <div className="text-xs text-muted-foreground border rounded-md p-2 mb-2">
          - Snapshots capture file states. Select a snapshot to preview differences.<br />
          - Click entries under Added/Modified to stage a diff; Removed can stage a delete.<br />
          - Restore replaces current files with the snapshot’s files.
        </div>
      )}
      {snaps.length === 0 ? (
        <div className="text-muted-foreground">No snapshots yet</div>
      ) : (
        <>
          <ul className="space-y-2">
            {snaps
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <button
                    className={`text-left flex-1 rounded px-2 py-1 hover:bg-muted ${previewId === s.id ? "bg-muted" : ""}`}
                    onClick={() => setPreviewId((p) => (p === s.id ? null : s.id))}
                    aria-label={`Preview ${s.label}`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</div>
                  </button>
                  <Button size="sm" onClick={() => onRestore(s.id)} aria-label={`Restore ${s.label}`}>
                    Restore
                  </Button>
                </li>
              ))}
          </ul>
          {summary && selected && current && (
            <div className="mt-3 rounded-md border p-2">
              <div className="font-medium mb-1">Changes</div>
              <div className="text-xs">
                <div>Added ({summary.added.length})</div>
                <ul className="mb-2">
                  {summary.added.map((p) => (
                    <li key={"a-" + p}>
                      <button className="underline hover:no-underline" onClick={() => openFileDiff(p)} aria-label={`Diff ${p}`}>
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
                <div>Removed ({summary.removed.length})</div>
                <ul className="mb-2">
                  {summary.removed.map((p) => (
                    <li key={"r-" + p}>
                      <button
                        className="underline hover:no-underline text-red-600"
                        onClick={() => stageDiff(p)}
                        aria-label={`Stage delete ${p}`}
                        title="Stage delete (Approve to remove file)"
                      >
                        {p} — stage delete
                      </button>
                    </li>
                  ))}
                </ul>
                <div>Modified ({summary.modified.length})</div>
                <ul className="mb-2">
                  {summary.modified.map((p) => (
                    <li key={"m-" + p}>
                      <button className="underline hover:no-underline" onClick={() => openFileDiff(p)} aria-label={`Diff ${p}`}>
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}