import * as React from "react";
import { useProjectStore } from "../../lib/store/projectStore";

export function SearchBar() {
  const { current, selectFile } = useProjectStore();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Array<{ path: string; line: number; snippet: string }>>([]);

  React.useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const files = current?.files ?? [];
    const res: Array<{ path: string; line: number; snippet: string }> = [];
    const needle = q.toLowerCase();
    for (const f of files) {
      const lines = f.contents.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(needle)) {
          res.push({ path: f.path, line: idx + 1, snippet: line.trim().slice(0, 120) });
        }
      });
    }
    setResults(res.slice(0, 50));
  }, [q, current]);

  return (
    <div>
      <input
        aria-label="Search in project"
        className="w-full h-9 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        placeholder="Search in project..."
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
      />
      {q && (
        <ul className="mt-2 max-h-40 overflow-auto text-sm">
          {results.map((r, i) => (
            <li key={i}>
              <button
                className="w-full text-left rounded px-2 py-1 hover:bg-muted"
                onClick={() => selectFile(r.path)}
                aria-label={`Open ${r.path}`}
              >
                <span className="font-mono text-xs">{r.path}</span> · <span className="text-xs text-muted-foreground">L{r.line}</span>
                <div className="text-muted-foreground truncate">{r.snippet}</div>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="text-muted-foreground">No results</li>}
        </ul>
      )}
    </div>
  );
}