import { describe, it, expect } from "vitest";
import { generateGitHubActionWorkflow, generateCliSnippet } from "../lib/workflow-templates";

describe("Workflow & CLI Snippet Generator", () => {
  it("references the current OpsScript Gate release", () => {
    const yaml = generateGitHubActionWorkflow("install.sh");
    expect(yaml).toContain("uses: Mresyzz/opsscript-gate@v0.6.1");
    expect(yaml).toContain("script-path: install.sh");
    expect(yaml).toContain("shell: auto");
    expect(yaml).toContain("timeout: 60");
    expect(yaml).toContain("mem-limit: 256m");
    expect(yaml).toContain("pids-limit: 128");
    expect(yaml).toContain("permissions:\n  contents: read");
    expect(yaml).toContain("persist-credentials: false");
    expect(yaml).toContain("network: none");
    expect(yaml).toContain("reports/installready.json");
  });

  it("can generate a PR-only changed-script workflow", () => {
    const yaml = generateGitHubActionWorkflow("install.sh", true);
    expect(yaml).toContain("on:\n  pull_request:");
    expect(yaml).not.toContain("push:\n");
    expect(yaml).toContain("fetch-depth: 0");
    expect(yaml).toContain("changed-since: ${{ github.event.pull_request.base.sha }}");
    expect(yaml).not.toContain("script-path:");
  });

  it("safely adapts to custom script paths", () => {
    const yaml = generateGitHubActionWorkflow("scripts/bootstrap.sh");
    expect(yaml).toContain("script-path: scripts/bootstrap.sh");
  });

  it("generates correct local CLI invocation", () => {
    const cli = generateCliSnippet("scripts/install.sh");
    expect(cli).toContain("pip install opsscript-gate");
    expect(cli).toContain("opsscript-gate run ./scripts/install.sh --shell auto --timeout 60");
  });
});
