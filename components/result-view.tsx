"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitCommit,
  Star,
  Share2,
  ExternalLink,
  AlertTriangle,
  FileCode,
  Shield,
  Check,
} from "lucide-react";
import { DiscoveredScript } from "@/lib/discovery";
import { StaticAnalysisReport } from "@/lib/analyzer";
import { OpsScriptGateResult } from "@/lib/schema";
import { RepoMetadata } from "@/lib/github";
import { CompatibilityMatrix } from "./compatibility-matrix";
import { ScriptPicker } from "./script-picker";
import { FindingCard } from "./finding-card";
import { WorkflowGenerator } from "./workflow-generator";
import { BadgeGenerator } from "./badge-generator";

interface ResultViewProps {
  metadata: RepoMetadata;
  commitSha: string;
  selectedScript: string;
  candidates: DiscoveredScript[];
  staticReport: StaticAnalysisReport;
  runtimeResult: OpsScriptGateResult | null;
  isPartialScan: boolean;
  warning?: string;
  badgeUrl: string;
  canonicalUrl: string;
}

export function ResultView({
  metadata,
  commitSha,
  selectedScript,
  candidates,
  staticReport,
  runtimeResult,
  isPartialScan,
  warning,
  badgeUrl,
  canonicalUrl,
}: ResultViewProps) {
  const router = useRouter();
  const [copiedShare, setCopiedShare] = useState(false);

  const handleSelectScript = (newScript: string) => {
    router.push(`/r/${metadata.owner}/${metadata.repo}/${commitSha}?script=${encodeURIComponent(newScript)}`);
  };

  const copyShareLink = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "https://installready.dev";
      await navigator.clipboard.writeText(`${origin}${canonicalUrl}`);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // Fallback
    }
  };

  const shortCommit = commitSha.slice(0, 7);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* 头部元数据栏 */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`https://github.com/${metadata.owner}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                {metadata.owner}
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
                {metadata.repo}
              </h1>
              <a
                href={`https://github.com/${metadata.owner}/${metadata.repo}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="View on GitHub"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {metadata.description && (
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {metadata.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copyShareLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-all active:scale-95 shadow-sm"
            >
              {copiedShare ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share Result</span>
                </>
              )}
            </button>

            <a
              href={`https://github.com/${metadata.owner}/${metadata.repo}/commit/${commitSha}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-mono text-muted-foreground transition-colors"
              title="View full immutable commit on GitHub"
            >
              <GitCommit className="h-3.5 w-3.5 text-blue-500" />
              <span>{shortCommit}</span>
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500 pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <GitCommit className="h-3.5 w-3.5" />
            <span className="truncate max-w-[280px]" title={commitSha}>
              commit: {commitSha}
            </span>
          </div>
          {metadata.stars > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
              <span>{metadata.stars.toLocaleString()} stars</span>
            </div>
          )}
          {metadata.primaryLanguage && (
            <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {metadata.primaryLanguage}
            </span>
          )}
          <div className="ml-auto text-[11px] text-zinc-400">
            Scanned: {new Date(staticReport.analyzedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* 截断警告 */}
      {isPartialScan && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-500 uppercase font-mono tracking-wide">
              Partial Tree Scan (Truncated)
            </div>
            <p className="text-xs text-muted-foreground">
              {warning || "Large repository: only high-confidence installer locations were inspected."}
            </p>
          </div>
        </div>
      )}

      {/* 候选脚本切换器 */}
      <ScriptPicker
        candidates={candidates}
        selectedScript={selectedScript}
        onSelectScript={handleSelectScript}
        shebang={staticReport.shebang}
        totalLines={staticReport.totalLines}
      />

      {/* 当前目标脚本信息卡 */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-blue-500" />
          <span className="font-mono text-xs font-semibold text-foreground">{selectedScript}</span>
          <span className="text-xs text-muted-foreground font-mono">
            ({staticReport.totalLines} lines
            {staticReport.shebang ? `, ${staticReport.shebang}` : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://github.com/${metadata.owner}/${metadata.repo}/blob/${commitSha}/${selectedScript}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground"
          >
            <span>View source on GitHub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 核心兼容性评分矩阵 */}
      <CompatibilityMatrix
        staticStatuses={staticReport.distroCompatibility}
        runtimeResult={runtimeResult}
      />

      {/* 行级诊断与修复建议卡片 */}
      <FindingCard
        scriptPath={selectedScript}
        staticFindings={staticReport.findings}
        runtimeResults={runtimeResult?.results}
      />

      {/* 一键集成工作流生成器 */}
      <WorkflowGenerator scriptPath={selectedScript} />

      {/* 徽章生成器 */}
      <BadgeGenerator
        owner={metadata.owner}
        repo={metadata.repo}
        commitSha={commitSha}
        scriptPath={selectedScript}
        badgeUrl={badgeUrl}
        canonicalUrl={canonicalUrl}
      />

      {/* 引擎背书 */}
      <div className="p-4 rounded-xl border border-border bg-card/50 text-center space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-mono">
          <Shield className="h-3.5 w-3.5 text-blue-500" />
          <span>Runtime verification engine powered by</span>
          <a
            href="https://github.com/Mresyzz/opsscript-gate"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-zinc-500 underline-offset-2 hover:text-blue-500 font-bold"
          >
            OpsScript Gate v0.4.1
          </a>
        </div>
        <p className="text-[11px] text-zinc-500">
          Drop OpsScript Gate into your repository to verify installers on Debian, Ubuntu, and Alpine in every pull request.
        </p>
      </div>
    </div>
  );
}
