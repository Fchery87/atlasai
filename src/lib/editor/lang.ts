export function languageFromPath(path?: string): string | undefined {
  if (!path) return undefined;
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
    case "markdown":
      return "markdown";
    case "yml":
    case "yaml":
      return "yaml";
    case "sh":
    case "bash":
      return "shell";
    case "py":
      return "python";
    default:
      return "plaintext";
  }
}
