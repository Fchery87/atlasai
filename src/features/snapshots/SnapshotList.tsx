import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";

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
  const { current, restoreSnapshot } = useProjectStore();
  const snaps = current?.snapshots ?? [];
  const [previewId, setPreviewId] = React.useState<string | null>(null);

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

  return (
    <div className="text-sm">
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
          {summary && (
            <div className="mt-3 rounded-md border p-2">
              <div className="font-medium mb-1">Changes</div>
              <div className="text-xs">
                <div>Added ({summary.added.length})</div>
                <ul className="mb-2">{summary.added.map((p) => <li key={"a-"+p}>{p}</li>)}</ul>
                <div>Removed ({summary.removed.length})</div>
                <ul className="mb-2">{summary.removed.map((p) => <li key={"r-"+p}>{p}</li>)}</ul>
                <div>Modified ({summary.modified.length})</div>
                <ul className="mb-2">{summary.modified.map((p) => <li key={"m-"+p}>{p}</li>)}</ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}