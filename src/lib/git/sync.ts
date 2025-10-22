export function computeDeletes(
  remotePaths: string[],
  localPaths: string[],
): string[] {
  const local = new Set(localPaths);
  return remotePaths.filter((p) => !local.has(p) && !p.startsWith(".git"));
}
