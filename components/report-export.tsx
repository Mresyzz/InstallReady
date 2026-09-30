"use client";

import { useState } from "react";
import { Copy, Download, Check } from "lucide-react";

export function ReportExport({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError(true); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "installready-report.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="rounded-xl border border-border bg-card p-5 space-y-3">
    <h2 className="text-sm font-semibold">Keep or share this report</h2>
    <p className="text-xs text-muted-foreground">Attach the Markdown report to a GitHub issue or pull request. It includes the analysis scope and does not claim an untested script passed.</p>
    <div className="flex flex-wrap gap-3">
      <button onClick={copy} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy Markdown"}
      </button>
      <button onClick={download} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"><Download className="h-4 w-4" /> Download report</button>
    </div>
    {error && <div role="alert"><p className="text-xs text-amber-500">Clipboard access is unavailable. Download the report or copy the text below.</p><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">{markdown}</pre></div>}
  </div>;
}
