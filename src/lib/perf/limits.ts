/**
 * Performance limits and optimizations for large projects
 */

export const PERF_LIMITS = {
  /** Maximum file size to load into editor (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,

  /** Maximum number of files to show in file tree before warning */
  MAX_FILES_WARNING: 500,

  /** Maximum number of files before forcing optimizations */
  MAX_FILES_HARD: 1000,

  /** Maximum lines to syntax highlight in editor */
  MAX_HIGHLIGHT_LINES: 10_000,

  /** Debounce delay for file saves (ms) */
  FILE_SAVE_DEBOUNCE: 500,

  /** Debounce delay for preview updates (ms) */
  PREVIEW_UPDATE_DEBOUNCE: 300,

  /** Maximum context characters for chat */
  MAX_CHAT_CONTEXT: 50_000,
} as const;

/**
 * Check if a file is too large to safely edit
 */
export function isFileTooLarge(size: number): boolean {
  return size > PERF_LIMITS.MAX_FILE_SIZE;
}

/**
 * Check if a project has too many files
 */
export function hasTooManyFiles(fileCount: number): {
  warning: boolean;
  hard: boolean;
} {
  return {
    warning: fileCount > PERF_LIMITS.MAX_FILES_WARNING,
    hard: fileCount > PERF_LIMITS.MAX_FILES_HARD,
  };
}

/**
 * Get recommended file tree options based on project size
 */
export function getFileTreeOptions(fileCount: number): {
  virtualized: boolean;
  lazyLoad: boolean;
  maxDepth?: number;
} {
  const limits = hasTooManyFiles(fileCount);

  return {
    virtualized: limits.warning,
    lazyLoad: limits.hard,
    maxDepth: limits.hard ? 3 : undefined,
  };
}

/**
 * Check if file should be syntax highlighted based on size
 */
export function shouldHighlight(content: string): boolean {
  const lines = content.split("\n").length;
  return lines <= PERF_LIMITS.MAX_HIGHLIGHT_LINES;
}

/**
 * Get truncation info for large files
 */
export function getTruncationInfo(size: number): {
  shouldTruncate: boolean;
  message: string;
} {
  if (size > PERF_LIMITS.MAX_FILE_SIZE) {
    return {
      shouldTruncate: true,
      message: `File is ${(size / 1024 / 1024).toFixed(1)}MB (max ${(PERF_LIMITS.MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB). Opening in read-only mode with limited features.`,
    };
  }
  return {
    shouldTruncate: false,
    message: "",
  };
}
