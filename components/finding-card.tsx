import { AlertCircle, AlertTriangle, CheckCircle, Info, Lightbulb } from "lucide-react";
import { Finding } from "@/lib/findings";
import { DistroResult } from "@/lib/schema";

interface FindingCardProps {
  scriptPath: string;
  staticFindings: Finding[];
  runtimeResults?: DistroResult[];
}

export function FindingCard({
  scriptPath,
  staticFindings,
  runtimeResults,
}: FindingCardProps) {
  const runtimeFailures = (runtimeResults || []).filter((r) => r.status === "FAIL" || r.status === "ERROR");

  if (runtimeFailures.length === 0 && staticFindings.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">No obvious portable installer issues detected</div>
          <p className="text-xs text-muted-foreground">
            The analyzer did not detect unguarded distro package-manager assumptions or common minimal-container pitfalls.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Detailed Findings & Diagnostics
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {runtimeFailures.length > 0
            ? `${runtimeFailures.length} Runtime Breakage${runtimeFailures.length === 1 ? "" : "s"}`
            : `${staticFindings.length} Static Heuristic Warning${staticFindings.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* 优先展示真实的运行时失败 */}
      {runtimeFailures.map((failure, idx) => (
        <div
          key={`runtime-${failure.distro}-${idx}`}
          className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/[0.04] space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30">
                <AlertCircle className="h-3.5 w-3.5" />
                FAIL
              </span>
              <span className="text-sm font-bold text-foreground">{failure.distro}</span>
            </div>
            {failure.line_number && (
              <span className="text-xs font-mono text-muted-foreground">
                {scriptPath}:{failure.line_number}
              </span>
            )}
          </div>

          {failure.command_failed && (
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs overflow-x-auto">
              <code>{failure.command_failed}</code>
            </div>
          )}

          {failure.diagnostic && (
            <p className="text-xs text-rose-400/90 font-medium">
              {failure.diagnostic}
            </p>
          )}

          {failure.output_snippet && (
            <pre className="p-2.5 rounded bg-black/40 border border-border text-[11px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap">
              {failure.output_snippet}
            </pre>
          )}

          {failure.remediation_hint && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/50 text-xs text-zinc-300">
              <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300">Suggested fix: </strong>
                <span>{failure.remediation_hint}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 静态推断警告 */}
      {staticFindings.map((finding) => (
        <div
          key={finding.id}
          className={`p-4 rounded-xl border space-y-3 ${
            finding.severity === "warning"
              ? "border-amber-500/30 bg-amber-500/[0.03]"
              : "border-blue-500/30 bg-blue-500/[0.03]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded ${
                  finding.severity === "warning"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                }`}
              >
                {finding.severity === "warning" ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Info className="h-3 w-3" />
                )}
                {finding.severity.toUpperCase()}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Affected: {finding.affected_distros.join(", ")}
              </span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {scriptPath}:{finding.line}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs overflow-x-auto">
            <code>{finding.command}</code>
          </div>

          <p className="text-xs text-foreground/90">{finding.message}</p>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Suggested fix: </strong>
              <span>{finding.hint}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
