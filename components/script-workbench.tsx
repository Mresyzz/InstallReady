"use client";

import { useState } from "react";
import { analyzeShellScript, type StaticAnalysisReport } from "@/lib/analyzer";
import { generateReportMarkdown } from "@/lib/report-markdown";
import { CompatibilityMatrix } from "./compatibility-matrix";
import { FindingCard } from "./finding-card";
import { WorkflowGenerator } from "./workflow-generator";
import { ReportExport } from "./report-export";

const EXAMPLES = [
  { name: "Alpine package mismatch", source: "#!/bin/sh\nset -e\napt-get install -y curl\n" },
  { name: "Package manager guards", source: "#!/bin/sh\nset -e\nif command -v apt-get >/dev/null 2>&1; then\n  apt-get install -y curl\nelif command -v apk >/dev/null 2>&1; then\n  apk add --no-cache curl\nelse\n  echo 'Unsupported package manager' >&2\n  exit 1\nfi\n" },
  { name: "Service in a container", source: "#!/bin/sh\nset -e\nsystemctl restart my-app\n" },
];

export function ScriptWorkbench() {
  const [source, setSource] = useState(EXAMPLES[0].source);
  const [report, setReport] = useState<StaticAnalysisReport | null>(null);
  const [error, setError] = useState("");

  function review() {
    if (!source.trim()) { setError("Paste a shell script first."); return; }
    if (source.length > 65536) { setError("Use a script of at most 64 KiB for the browser review."); return; }
    setError("");
    setReport(analyzeShellScript("install.sh", source));
  }

  return <div className="space-y-6">
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => <button key={example.name} type="button" onClick={() => {
          setSource(example.source); setReport(analyzeShellScript("install.sh", example.source)); setError("");
        }} className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted">{example.name}</button>)}
      </div>
      <label htmlFor="script-source" className="block text-sm font-medium">Shell script</label>
      <textarea id="script-source" value={source} spellCheck={false} maxLength={65537} onChange={(e) => {
        setSource(e.target.value); setReport(null); setError("");
      }} className="min-h-64 w-full resize-y rounded-lg border border-border bg-background p-4 font-mono text-sm leading-6 focus:outline-blue-500" />
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={review} className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500">Review script</button>
        <p className="text-xs text-muted-foreground">Runs in your browser. The script is not executed, uploaded, or saved.</p>
      </div>
      {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
    </div>
    {report && <div className="space-y-6" aria-live="polite">
      <CompatibilityMatrix staticStatuses={report.distroCompatibility} runtimeResult={null} />
      <FindingCard scriptPath="install.sh" staticFindings={report.findings} />
      <ReportExport markdown={generateReportMarkdown(report)} />
      <WorkflowGenerator scriptPath="install.sh" />
    </div>}
  </div>;
}
