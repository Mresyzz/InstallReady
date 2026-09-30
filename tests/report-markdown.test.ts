import { describe, expect, it } from "vitest";
import { analyzeShellScript } from "../lib/analyzer";
import { generateReportMarkdown } from "../lib/report-markdown";

describe("Markdown report export", () => {
  it("states when a report is static-only and includes findings", () => {
    const report = analyzeShellScript("install.sh", "#!/bin/sh\napt-get install curl\n");
    const markdown = generateReportMarkdown(report, { repository: "owner/repo" });
    expect(markdown).toContain("Static analysis only");
    expect(markdown).toContain("owner/repo");
    expect(markdown).toContain("apt-get");
    expect(markdown).not.toContain("Runtime checks:");
  });
});
