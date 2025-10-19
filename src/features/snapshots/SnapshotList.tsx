import * as React from "react";
import { Button } from "../../components/ui/button";
import { useProjectStore } from "../../lib/store/projectStore";

export function SnapshotList() {
  const { current, restoreSnapshot } = useProjectStore();
  const snaps = current?.snapshots ?? [];

  const onRestore = async (id: string) => {
    if (confirm("Restore this snapshot? Current files will be replaced.")) {
      await restoreSnapshot(id);
    }
  };

  return (
    <div className="text-sm">
      {snaps.length === 0 ? (
        <div className="text-muted-foreground">No snapshots yet</div>
      ) : (
        <ul className="space-y-2">
          {snaps
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <Button size="sm" onClick={() => onRestore(s.id)} aria-label={`Restore ${s.label}`}>
                  Restore
                </Button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}