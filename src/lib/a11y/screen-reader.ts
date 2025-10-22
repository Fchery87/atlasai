import * as React from "react";

/**
 * Screen Reader Announcements System
 * Provides live region announcements for dynamic content changes
 */

export type AnnouncementPriority = "polite" | "assertive";

export type Announcement = {
  message: string;
  priority?: AnnouncementPriority;
  /** Optional timeout to clear message (ms) */
  timeout?: number;
};

let announcer: HTMLDivElement | null = null;

/**
 * Initialize the screen reader announcer
 * Creates a live region for screen reader announcements
 */
export function initializeAnnouncer() {
  if (announcer) return;

  announcer = document.createElement("div");
  announcer.setAttribute("role", "status");
  announcer.setAttribute("aria-live", "polite");
  announcer.setAttribute("aria-atomic", "true");
  announcer.className = "sr-only";
  announcer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  `;
  document.body.appendChild(announcer);
}

/**
 * Announce a message to screen readers
 */
export function announce(
  message: string,
  priority: AnnouncementPriority = "polite",
  timeout?: number,
) {
  if (!announcer) {
    initializeAnnouncer();
  }

  if (!announcer) return;

  // Update aria-live based on priority
  announcer.setAttribute("aria-live", priority);

  // Clear previous message
  announcer.textContent = "";

  // Announce new message (setTimeout ensures screen reader picks up change)
  setTimeout(() => {
    if (announcer) {
      announcer.textContent = message;
    }

    // Optional auto-clear
    if (timeout) {
      setTimeout(() => {
        if (announcer) {
          announcer.textContent = "";
        }
      }, timeout);
    }
  }, 100);
}

/**
 * Announce multiple messages with delay between them
 */
export function announceSequence(
  messages: string[],
  priority: AnnouncementPriority = "polite",
  delayMs: number = 1000,
) {
  messages.forEach((message, index) => {
    setTimeout(() => {
      announce(message, priority);
    }, index * delayMs);
  });
}

/**
 * Clear current announcement
 */
export function clearAnnouncement() {
  if (announcer) {
    announcer.textContent = "";
  }
}

/**
 * Cleanup announcer (useful for tests)
 */
export function cleanupAnnouncer() {
  if (announcer && announcer.parentNode) {
    announcer.parentNode.removeChild(announcer);
    announcer = null;
  }
}

/**
 * React hook for announcements
 */
export function useAnnouncer() {
  React.useEffect(() => {
    initializeAnnouncer();
    return () => {
      // Don't cleanup on unmount as announcer is global
    };
  }, []);

  return {
    announce,
    announceSequence,
    clearAnnouncement,
  };
}

/**
 * Predefined announcement messages for common actions
 */
export const announcements = {
  // File operations
  fileCreated: (path: string) => `File ${path} created`,
  fileDeleted: (path: string) => `File ${path} deleted`,
  fileRenamed: (from: string, to: string) =>
    `File renamed from ${from} to ${to}`,
  fileSaved: (path: string) => `File ${path} saved`,

  // Editor operations
  diffStaged: () => "Changes staged for review",
  diffApproved: () => "Changes approved and applied",
  diffRejected: () => "Changes rejected",
  undoApplied: () => "Last change undone",
  redoApplied: () => "Change redone",

  // Project operations
  projectCreated: (name: string) => `Project ${name} created`,
  projectLoaded: (name: string) => `Project ${name} loaded`,
  snapshotCreated: (label: string) => `Snapshot ${label} created`,

  // Provider operations
  providerConnected: (name: string) => `Connected to ${name}`,
  providerDisconnected: (name: string) => `Disconnected from ${name}`,

  // AI operations
  streamingStarted: () => "AI response started",
  streamingComplete: () => "AI response complete",
  streamingError: (error: string) => `Error: ${error}`,

  // Search operations
  searchResults: (count: number) =>
    `${count} result${count === 1 ? "" : "s"} found`,
  noSearchResults: () => "No results found",

  // Navigation
  panelOpened: (name: string) => `${name} panel opened`,
  panelClosed: (name: string) => `${name} panel closed`,
  dialogOpened: (name: string) => `${name} dialog opened`,
  dialogClosed: (name: string) => `${name} dialog closed`,

  // Errors
  error: (message: string) => `Error: ${message}`,
  warning: (message: string) => `Warning: ${message}`,
  success: (message: string) => `Success: ${message}`,

  // Loading states
  loading: (what: string) => `Loading ${what}...`,
  loadingComplete: (what: string) => `${what} loaded`,
};
