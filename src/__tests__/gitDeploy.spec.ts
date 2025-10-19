import { describe, it, expect } from "vitest";
import { packFilesToZip } from "../lib/deploy/util";
import { computeDeletes } from "../lib/git/sync";

describe("Deploy and Git helpers", () => {
  it("packs files into a zip blob", async () => {
    const blob = await packFilesToZip([
      { path: "index.html", contents: "<h1>hi</h1>" },
      { path: "app.js", contents: "console.log(1)" },
    ]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("computes delete list correctly", () => {
    const remote = ["a.txt", "b.txt", ".git/config"];
    const local = ["a.txt", "c.txt"];
    const del = computeDeletes(remote, local);
    expect(del).toEqual(["b.txt"]);
  });
});