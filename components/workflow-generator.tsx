"use client";

import { useState } from "react";
import { Check, Copy, Terminal, Shield, ExternalLink } from "lucide-react";
import { generateGitHubActionWorkflow, generateCliSnippet } from "@/lib/workflow-templates";

interface WorkflowGeneratorProps {
  scriptPath: string;
}

export function WorkflowGenerator({ scriptPath }: WorkflowGeneratorProps) {
  const [copiedType, setCopiedType] = useState<"action" | "cli" | null>(null);
  const [activeTab, setActiveTab] = useState<"action" | "cli">("action");

  const actionYaml = generateGitHubActionWorkflow(scriptPath);
  const cliCommand = generateCliSnippet(scriptPath);

  const copyToClipboard = async (text: string, type: "action" | "cli") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Add Runtime Verification to Your Repo
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Catch breakages automatically in PRs using the official OpsScript Gate GitHub Action.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/Mresyzz/opsscript-gate"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            <span>Mresyzz/opsscript-gate@v0.4.1</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("action")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === "action"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            GitHub Actions (.github/workflows/installready.yml)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cli")}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "cli"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="h-3 w-3" />
            Local CLI (Terminal)
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            copyToClipboard(activeTab === "action" ? actionYaml : cliCommand, activeTab)
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-all shadow-sm active:scale-95"
        >
          {copiedType === activeTab ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy {activeTab === "action" ? "Workflow" : "Command"}</span>
            </>
          )}
        </button>
      </div>

      <div className="relative">
        <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed">
          <code>{activeTab === "action" ? actionYaml : cliCommand}</code>
        </pre>
      </div>
    </div>
  );
}
