import { describe, it, expect } from "vitest";
import { discoverInstallerScripts, GitTreeItem, isIgnoredPath } from "../lib/discovery";

describe("Script Discovery & Directory Filtering", () => {
  it("filters blacklisted directories", () => {
    expect(isIgnoredPath(".git/hooks/install.sh")).toBe(true);
    expect(isIgnoredPath("node_modules/pkg/install.sh")).toBe(true);
    expect(isIgnoredPath("vendor/bundle/setup.sh")).toBe(true);
    expect(isIgnoredPath(".venv/bin/activate")).toBe(true);
    expect(isIgnoredPath("target/release/install.sh")).toBe(true);
    expect(isIgnoredPath("scripts/install.sh")).toBe(false);
    expect(isIgnoredPath("install.sh")).toBe(false);
  });

  it("prioritizes high-confidence installer entrypoints", () => {
    const items: GitTreeItem[] = [
      { path: "test/helper.sh", type: "blob" },
      { path: "scripts/bootstrap.sh", type: "blob" },
      { path: "install.sh", type: "blob" },
      { path: "deploy.sh", type: "blob" },
    ];

    const res = discoverInstallerScripts(items, false);
    expect(res.candidates.length).toBe(4);
    // 顶级 install.sh 拥有最高优先级 100
    expect(res.candidates[0].path).toBe("install.sh");
    expect(res.candidates[0].isPrimaryCandidate).toBe(true);
  });

  it("handles GitHub API tree truncation gracefully", () => {
    const items: GitTreeItem[] = [
      { path: "install.sh", type: "blob" },
    ];

    const res = discoverInstallerScripts(items, true);
    expect(res.isPartialScan).toBe(true);
    expect(res.warning).toContain("Large repository: only high-confidence installer locations were inspected");
  });

  it("bounds inspection to maximum 100 candidate files", () => {
    const items: GitTreeItem[] = Array.from({ length: 150 }, (_, i) => ({
      path: `scripts/test_${i}.sh`,
      type: "blob" as const,
    }));

    const res = discoverInstallerScripts(items, false);
    expect(res.inspectedCount).toBe(100);
    expect(res.candidates.length).toBe(100);
  });
});
