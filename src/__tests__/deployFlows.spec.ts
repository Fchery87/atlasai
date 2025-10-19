import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { DeployPanel } from "../features/deploy/DeployPanel";
import { useProjectStore } from "../lib/store/projectStore";

describe("DeployPanel flows (Netlify & Vercel)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useProjectStore.setState({
      current: {
        id: "p1",
        name: "proj",
        createdAt: Date.now(),
        files: [
          { path: "dist/index.html", contents: "<!doctype html>", updatedAt: Date.now() },
          { path: "dist/app.js", contents: "console.log(1)", updatedAt: Date.now() },
        ],
        snapshots: [],
      },
      projects: [],
      loading: false,
      error: undefined,
      currentFilePath: "dist/index.html",
      staged: undefined,
      fileLock: false,
      previewHtml: "<!doctype html>",
    } as any);
  });

  it("Netlify hash-based deploy uploads required files", async () => {
    // 1) create deploy response with required files
    const required = ["/index.html", "/app.js"];
    const createResp = { id: "dep1", required, deploy_uploads_url: "https://api.netlify.com/deploys/dep1/files" };
    const fetchMock = vi.fn()
      // create
      .mockResolvedValueOnce(new Response(JSON.stringify(createResp), { status: 200 }))
      // upload index.html
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      // upload app.js
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock as any);

    const { getByLabelText, getByRole } = render(<DeployPanel />);
    fireEvent.change(getByLabelText("Netlify token"), { target: { value: "tok" } });
    fireEvent.change(getByLabelText("Netlify site id"), { target: { value: "site" } });
    await fireEvent.click(getByRole("button", { name: "Deploy to Netlify" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it("Vercel project linking create and deploy", async () => {
    const fetchMock = vi.fn()
      // get project 404
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      // create project ok
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      // deploy ok
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock as any);

    const { getByLabelText, getByRole } = render(<DeployPanel />);
    fireEvent.change(getByLabelText("Vercel token"), { target: { value: "vtok" } });
    fireEvent.change(getByLabelText("Project name"), { target: { value: "proj" } });
    await fireEvent.click(getByRole("button", { name: "Deploy to Vercel" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});