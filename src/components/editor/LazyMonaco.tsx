import * as React from "react";

// Lazy load Monaco components
const Editor = React.lazy(() =>
  import("@monaco-editor/react").then((module) => ({
    default: module.default,
  })),
);

const DiffEditor = React.lazy(() =>
  import("@monaco-editor/react").then((module) => ({
    default: module.DiffEditor,
  })),
);

// Loading fallback component
function EditorSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/10">
      <div className="text-center space-y-2">
        <div className="animate-pulse text-muted-foreground">
          Loading editor...
        </div>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary animate-pulse"
            style={{ width: "60%" }}
          />
        </div>
      </div>
    </div>
  );
}

// Wrapper components with Suspense
export function LazyEditor(props: React.ComponentProps<typeof Editor>) {
  return (
    <React.Suspense fallback={<EditorSkeleton />}>
      <Editor {...props} />
    </React.Suspense>
  );
}

export function LazyDiffEditor(props: React.ComponentProps<typeof DiffEditor>) {
  return (
    <React.Suspense fallback={<EditorSkeleton />}>
      <DiffEditor {...props} />
    </React.Suspense>
  );
}
