import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GitPanel } from "../features/git/GitPanel";
import { useProjectStore } from "../lib/store/projectStore";

// Mock encrypted load to return a default branch and saved branch
vi.mock("../lib/oauth/github", async (orig) => {
  const mod = await orig();
  return {
    ...mod,
    loadDecrypted: vi.fn(async (key: string) => {
      if (key.endsWith("sec_git_branch:proj1")) return "feature-x";
      if (key.endsWith("sec_default_branch:proj1")) return "dev";
      return undefined;
    }),
    saveEncrypted: vi.fn(async () => {}),
    loadGitHubClientConfig: vi.fn(async () => ({})),
    getGitHubToken: vi.fn(async () => null),
  };
});

describe("GitPanel branch defaults", () => {
  beforeEach(() => {
    useProjectStore.setState({
      current: {
        id: "proj1",
        name: "P1",
        createdAt: Date.now(),
        files: [],
        snapshots: [],
      },
      projects: [],
      loading: false,
      error: undefined,
      currentFilePath: undefined,
      staged: undefined,
      fileLock: false,
      previewHtml: "",
    } as any);
  });

  it("prefills branch from saved per-project branch; falls back to default branch", async () => {
    render(React.createElement(GitPanel));
    const input = await screen.findByLabelText("Branch");
    expect((input as HTMLInputElement).value).toBe("feature-x");
    // Changing branch saves via saveEncrypted (mocked)
    fireEvent.change(input, { target: { value: "hotfix" } });
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe("hotfix");
    });
  });
});
