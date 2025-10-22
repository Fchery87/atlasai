import { describe, it, expect } from "vitest";
import {
  generateGhPagesWorkflow,
  generateUserGhPagesWorkflow,
} from "../lib/deploy/workflows";

describe("workflow generators", () => {
  it("generates GH Pages workflow with custom branch", () => {
    const yml = generateGhPagesWorkflow("dev");
    expect(yml).toContain("branches: [ dev ]");
    expect(yml).toContain("actions/deploy-pages@v4");
  });
  it("generates user GH Pages workflow with custom branch", () => {
    const yml = generateUserGhPagesWorkflow("release");
    expect(yml).toContain("branches: [ release ]");
    expect(yml).toContain("peaceiris/actions-gh-pages@v3");
  });
});
