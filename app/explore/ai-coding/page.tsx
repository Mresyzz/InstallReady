import Link from "next/link";
import showcaseData from "@/data/showcase.json";
import { ArrowLeft, Sparkles, Terminal, Info, Shield } from "lucide-react";

export default function AiCodingPage() {
  const tools = showcaseData.aiCodingVertical || [];

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 space-y-10">
      <div className="space-y-3">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Explore</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            AI Coding Tools: Linux Installation Matrix
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Tracking installation and bootstrapping compatibility for modern AI terminal coding agents across Linux distributions.
        </p>
      </div>

      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground">Honest Measurement Guarantee: </strong>
          InstallReady never invents compatibility results. Tools without an isolated OpsScript Gate execution are explicitly marked as{" "}
          <span className="font-mono text-foreground font-semibold">Not tested</span>. Real container measurements are added incrementally via controlled workflows.
        </div>
      </div>

      {/* 矩阵表格 */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50 font-mono text-muted-foreground">
                <th className="py-3.5 px-4 font-semibold">AI Tool / Agent</th>
                <th className="py-3.5 px-4 font-semibold">Maintainer</th>
                <th className="py-3.5 px-4 font-semibold">Install Method</th>
                <th className="py-3.5 px-4 font-semibold text-center">Debian 12</th>
                <th className="py-3.5 px-4 font-semibold text-center">Ubuntu 22/24</th>
                <th className="py-3.5 px-4 font-semibold text-center">Alpine 3.20</th>
                <th className="py-3.5 px-4 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tools.map((tool) => {
                const isTested = tool.status !== "not_tested";

                return (
                  <tr key={tool.name} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div className="font-semibold text-sm">{tool.name}</div>
                      <div className="font-mono text-[11px] text-zinc-500">{tool.repo}</div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                      {tool.vendor}
                    </td>
                    <td className="py-3.5 px-4">
                      <code className="px-2 py-1 rounded bg-muted font-mono text-[11px] text-foreground block max-w-xs truncate">
                        {tool.installCommand}
                      </code>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {isTested ? (
                        <span className="text-emerald-500 font-bold">PASS</span>
                      ) : (
                        <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-zinc-500 text-[10px]">
                          Not tested
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {isTested ? (
                        <span className="text-emerald-500 font-bold">PASS</span>
                      ) : (
                        <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-zinc-500 text-[10px]">
                          Not tested
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {isTested ? (
                        <span className="text-emerald-500 font-bold">PASS</span>
                      ) : (
                        <span className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-zinc-500 text-[10px]">
                          Not tested
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/r/${tool.repo}?script=${encodeURIComponent(tool.targetScript)}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-blue-500 hover:underline"
                      >
                        <span>Analyze</span>
                        <Terminal className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-5 rounded-xl border border-border bg-card/60 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Shield className="h-4 w-4 text-emerald-500" />
          <span>About AgentReady</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          AgentReady will graduate into an independent validation suite measuring environment prerequisites (Node versions, Python wheels, glibc vs musl, dynamic linker availability) for terminal AI agents.
          During v0.1, it remains an integral vertical page of InstallReady.
        </p>
      </div>
    </div>
  );
}
