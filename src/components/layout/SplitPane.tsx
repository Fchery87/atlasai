import * as React from "react";

type Dir = "vertical" | "horizontal";

type Props = {
  dir?: Dir; // vertical => left/right, horizontal => top/bottom
  sizes: number[]; // percentages that sum to ~100
  onSizesChange?: (sizes: number[]) => void;
  storageKey?: string;
  children: React.ReactNode[];
  minSizePct?: number; // minimal percentage for any pane
};

export function SplitPane({
  dir = "vertical",
  sizes,
  onSizesChange,
  storageKey,
  children,
  minSizePct = 10,
}: Props) {
  const [localSizes, setLocalSizes] = React.useState<number[]>(() => {
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === sizes.length) return parsed;
        }
      } catch {}
    }
    return sizes;
  });

  React.useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(localSizes));
    }
    onSizesChange?.(localSizes);
  }, [localSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for external reset events
  React.useEffect(() => {
    const onReset = (e: Event) => {
      const ce = e as CustomEvent<{ key: string; sizes: number[] }>;
      if (storageKey && ce.detail?.key === storageKey && Array.isArray(ce.detail.sizes)) {
        setLocalSizes(ce.detail.sizes);
      }
    };
    window.addEventListener("bf:split-reset", onReset as EventListener);
    return () => window.removeEventListener("bf:split-reset", onReset as EventListener);
  }, [storageKey]);

  const isVertical = dir === "vertical";

  const startPosRef = React.useRef<number>(0);
  const startSizesRef = React.useRef<number[]>([]);
  const dragIndexRef = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const beginDrag = (idx: number, clientXY: number) => {
    dragIndexRef.current = idx;
    startPosRef.current = clientXY;
    startSizesRef.current = [...localSizes];
  };

  const onMouseDown = (idx: number, e: React.MouseEvent) => {
    beginDrag(idx, isVertical ? e.clientX : e.clientY);
    window.addEventListener("mousemove", onMouseMove as any);
    window.addEventListener("mouseup", onMouseUp as any);
    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (dragIndexRef.current === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentPos = isVertical ? e.clientX : e.clientY;
    const totalPx = isVertical ? rect.width : rect.height;
    const deltaPx = currentPos - startPosRef.current;
    applyDelta(deltaPx, totalPx);
  };

  const applyDelta = (deltaPx: number, totalPx: number) => {
    if (dragIndexRef.current === null) return;
    const deltaPct = (deltaPx / totalPx) * 100;
    const i = dragIndexRef.current;
    const next = [...startSizesRef.current];
    let a = Math.max(minSizePct, next[i] + deltaPct);
    let b = Math.max(minSizePct, next[i + 1] - deltaPct);
    const rest = next.reduce((sum, v, idx) => (idx === i || idx === i + 1 ? sum : sum + v), 0);
    const remaining = Math.max(0, 100 - rest);
    const scale = (a + b) > 0 ? remaining / (a + b) : 1;
    a = a * scale;
    b = b * scale;
    next[i] = a;
    next[i + 1] = b;
    setLocalSizes(next);
  };

  const onMouseUp = () => {
    dragIndexRef.current = null;
    window.removeEventListener("mousemove", onMouseMove as any);
    window.removeEventListener("mouseup", onMouseUp as any);
  };

  const onKeyDownHandle = (idx: number, e: React.KeyboardEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const totalPx = isVertical ? rect.width : rect.height;
    const stepPct = 2; // 2% per keypress
    const stepPx = (stepPct / 100) * totalPx;
    if (isVertical) {
      if (e.key === "ArrowLeft") {
        beginDrag(idx, 0);
        applyDelta(-stepPx, totalPx);
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        beginDrag(idx, 0);
        applyDelta(stepPx, totalPx);
        e.preventDefault();
      }
    } else {
      if (e.key === "ArrowUp") {
        beginDrag(idx, 0);
        applyDelta(-stepPx, totalPx);
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        beginDrag(idx, 0);
        applyDelta(stepPx, totalPx);
        e.preventDefault();
      }
    }
  };

  const styleFor = (pct: number) =>
    isVertical ? { width: `${pct}%` } : { height: `${pct}%` };

  const containerStyle = isVertical ? "flex flex-row w-full h-full" : "flex flex-col w-full h-full";
  const handleStyle = isVertical
    ? "w-1 cursor-col-resize bg-border hover:bg-primary/30"
    : "h-1 cursor-row-resize bg-border hover:bg-primary/30";

  const kids = React.Children.toArray(children);

  return (
    <div ref={containerRef} className={containerStyle} aria-label="Split pane container">
      {kids.map((child, idx) => (
        <React.Fragment key={idx}>
          <div style={styleFor(localSizes[idx])} className="overflow-hidden">{child}</div>
          {idx < kids.length - 1 && (
            <div
              role="separator"
              aria-orientation={isVertical ? "vertical" : "horizontal"}
              tabIndex={0}
              onMouseDown={(e) => onMouseDown(idx, e)}
              onKeyDown={(e) => onKeyDownHandle(idx, e)}
              className={handleStyle}
              title="Drag to resize (Arrow keys to resize)"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}