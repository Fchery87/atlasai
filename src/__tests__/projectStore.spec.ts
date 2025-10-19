import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "../lib/store/projectStore";

describe("projectStore diffs and snapshots", () => {
  beforeEach(() => {
    // Reset store
    const s = useProjectStore.getState();
    useProjectStore.setState({
      current: undefined,
      projects: [],
      loading: false,
      error: undefined,
      currentFilePath: undefined,
      staged: undefined,
      fileLock: false,
      previewHtml: undefined,
    });
  });

  it("stages add/modify/delete ops and approve applies correctly", async () => {
    // create project
    await useProjectStore.getState().createProject("test");
    // add a file
    await useProjectStore.getState().createFile("index.html");
    await useProjectStore.getState().upsertFile("index.html", "<p>a</p>");

    // modify diff
    useProjectStore.getState().stageDiff("index.html", "<p>b</p>");
    expect(useProjectStore.getState().staged?.op).toBe("modify");
    await useProjectStore.getState().approveDiff();
    const cur = useProjectStore.getState().current!;
    expect(cur.files.find((f) => f.path === "index.html")?.contents).toBe("<p>b</p>");

    // add diff
    useProjectStore.getState().stageDiff("new.js", "console.log(1)");
    expect(useProjectStore.getState().staged?.op).toBe("add");
    await useProjectStore.getState().approveDiff();
    expect(useProjectStore.getState().current!.files.find((f) => f.path === "new.js")?.contents).toBe("console.log(1)");

    // delete diff
    useProjectStore.getState().stageDiff("new.js"); // undefined after -> delete
    expect(useProjectStore.getState().staged?.op).toBe("delete");
    await useProjectStore.getState().approveDiff();
    expect(useProjectStore.getState().current!.files.find((f) => f.path === "new.js")).toBeUndefined();
  });

  it("snapshot restore replaces files; selective apply via stageDiff", async () => {
    await useProjectStore.getState().createProject("snap");
    await useProjectStore.getState().upsertFile("a.txt", "1");
    await useProjectStore.getState().upsertFile("b.txt", "2");
    const snap = await useProjectStore.getState().snapshot("baseline");

    // change current
    await useProjectStore.getState().upsertFile("a.txt", "1-mod");
    await useProjectStore.getState().upsertFile("c.txt", "3");

    // selective apply from snapshot: stage diff for b.txt from snapshot
    const fromSnap = snap.files.find((f) => f.path === "b.txt")!;
    useProjectStore.getState().stageDiff("b.txt", fromSnap.contents);
    await useProjectStore.getState().approveDiff();
    const cur = useProjectStore.getState().current!;
    expect(cur.files.find((f) => f.path === "b.txt")?.contents).toBe("2");
  });
});