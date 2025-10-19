export function formatContent(lang: string | undefined, text: string): string {
  try {
    switch (lang) {
      case "json":
        return JSON.stringify(JSON.parse(text), null, 2) + "\n";
      case "markdown":
      case "html":
      case "css":
      case "javascript":
      case "typescript":
      case "shell":
      case "python":
      default:
        // Minimal normalization: trim trailing spaces on each line, ensure trailing newline
        return text
          .split(/\r?\n/)
          .map((l) => l.replace(/[ \t]+$/g, ""))
          .join("\n")
          .replace(/\s*$/, "\n");
    }
  } catch {
    return text;
  }
}