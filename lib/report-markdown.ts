import type { StaticAnalysisReport } from "./analyzer";
import type { OpsScriptGateResult } from "./schema";

function cell(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

function prose(text: string): string {
  return text.replace(/[\\`*_<>{}\[\]#]/g, "\\$&").replace(/[\r\n]+/g, " ");
}

export function generateReportMarkdown(report: StaticAnalysisReport, options: {
  repository?: string;
  commitSha?: string;
  sourceUrl?: string;
  runtimeResult?: OpsScriptGateResult | null;
} = {}): string {
  const runtime = options.runtimeResult;
  const lines = ["# InstallReady compatibility report", "",
    `Script: ${prose(report.scriptPath)}`,
    ...(options.repository ? [`Repository: ${prose(options.repository)}`] : []),
    ...(options.commitSha ? [`Commit: ${prose(options.commitSha)}`] : []),
    `Analysis date: ${report.analyzedAt}`, "",
    runtime ? `Runtime checks: ${runtime.summary.passed}/${runtime.summary.total} passed (OpsScript Gate ${runtime.engine.version}).`
      : "Static analysis only. The script has not been executed; this is not proof of a successful installation.",
    "", "| Distribution | Static review | Evidence | Runtime |", "| --- | --- | --- | --- |",
    ...report.distroCompatibility.map((item) => {
      const result = runtime?.results.find((r) => r.distro === item.distro);
      const evidence = item.evidence.map((entry) => {
        const source = entry.line ? `line ${entry.line}: ` : "";
        return `${source}${entry.reason}`;
      }).join(" ");
      return `| ${cell(item.displayName)} | ${cell(item.status)} | ${cell(evidence)} | ${result ? `${result.status} (exit ${result.exit_code})` : "Not run"} |`;
    }), "", "## Findings", "",
    ...(report.findings.length ? report.findings.flatMap((f) => [
      `- Line ${f.line}: ${prose(f.message)}`,
      `  - Recommendation: ${prose(f.hint)}`,
    ]) : ["No supported static rules matched. Dependencies and execution behavior still need runtime tests."]),
    ...(runtime ? ["", "## Runtime results", "", ...runtime.results.map((r) =>
      `- ${prose(r.distro)}: ${r.status}, exit ${r.exit_code}${r.diagnostic ? ` — ${prose(r.diagnostic)}` : ""}`)] : []),
    "", "Static rules are heuristic and may miss shell control flow, sourced files, or project dependencies.",
  ];
  if (options.sourceUrl && /^https:\/\/github\.com\//.test(options.sourceUrl)) {
    lines.push("", `Source: ${options.sourceUrl}`);
  }
  return lines.join("\n") + "\n";
}
