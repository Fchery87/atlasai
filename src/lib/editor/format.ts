async function tryPrettier(lang: string | undefined, text: string): Promise<string | null> {
  try {
    let parser: string | null = null;
    switch (lang) {
      case "javascript":
        parser = "babel";
        break;
      case "typescript":
        parser = "typescript";
        break;
      case "html":
        parser = "html";
        break;
      case "css":
        parser = "css";
        break;
      default:
        parser = null;
    }
    if (!parser) return null;

    const prettier = await import("prettier/standalone");
    const plugins: any[] = [];
    if (parser === "babel") {
      const p = await import("prettier/plugins/babel");
      plugins.push(p.default || p);
    } else if (parser === "typescript") {
      const p = await import("prettier/plugins/typescript");
      plugins.push(p.default || p);
    } else if (parser === "html") {
      const p = await import("prettier/plugins/html");
      plugins.push(p.default || p);
    } else if (parser === "css") {
      const p = await import("prettier/plugins/postcss");
      plugins.push(p.default || p);
    }
    const formatted = await prettier.format(text, { parser: parser as any, plugins });
    return formatted;
  } catch {
    return null;
  }
}

export async function formatContentAsync(lang: string | undefined, text: string): Promise<string> {
  // Prefer Prettier when applicable
  const pretty = await tryPrettier(lang, text);
  if (pretty != null) return pretty;

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