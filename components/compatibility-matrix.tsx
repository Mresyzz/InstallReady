import { Shield, CheckCircle2, XCircle, AlertTriangle, HelpCircle, Terminal } from "lucide-react";
import { DistroCompatibilityStatus, TARGET_DISTROS } from "@/lib/findings";
import { OpsScriptGateResult } from "@/lib/schema";

interface CompatibilityMatrixProps {
  staticStatuses: DistroCompatibilityStatus[];
  runtimeResult: OpsScriptGateResult | null;
}

export function CompatibilityMatrix({
  staticStatuses,
  runtimeResult,
}: CompatibilityMatrixProps) {
  const isRuntimeVerified = Boolean(runtimeResult);

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Linux Install Compatibility
          </h2>
          {isRuntimeVerified ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Runtime Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Shield className="h-3 w-3" />
              Static Analysis
            </span>
          )}
        </div>

        {isRuntimeVerified && runtimeResult ? (
          <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
            <span>
              {runtimeResult.summary.passed} / {runtimeResult.summary.total} Verified Passing
            </span>
            <span className="text-zinc-500">|</span>
            <span>Powered by OpsScript Gate {runtimeResult.engine.version}</span>
          </div>
        ) : (
          <div className="text-xs font-mono text-muted-foreground">
            Heuristic static checks across package managers & shell dependencies
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TARGET_DISTROS.map((target) => {
          // 查找运行时结果
          const runtimeItem = runtimeResult?.results.find((r) => r.distro === target.id);
          // 查找静态状态
          const staticItem = staticStatuses.find((s) => s.distro === target.id);

          if (isRuntimeVerified && runtimeItem) {
            const isPass = runtimeItem.status === "PASS";
            const isFail = runtimeItem.status === "FAIL";
            const isTimedOut = runtimeItem.status === "TIMED_OUT";

            return (
              <div
                key={target.id}
                className={`relative p-4 rounded-xl border transition-all ${
                  isPass
                    ? "bg-emerald-500/[0.03] border-emerald-500/30 dark:border-emerald-500/20"
                    : isTimedOut
                    ? "bg-amber-500/[0.04] border-amber-500/40 dark:border-amber-500/30"
                    : isFail
                    ? "bg-rose-500/[0.04] border-rose-500/40 dark:border-rose-500/30"
                    : "bg-purple-500/[0.04] border-purple-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">{target.id}</span>
                  {isPass && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {isTimedOut && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  {isFail && <XCircle className="h-4 w-4 text-rose-500" />}
                  {!isPass && !isFail && !isTimedOut && <AlertTriangle className="h-4 w-4 text-purple-500" />}
                </div>

                <div className="text-sm font-semibold text-foreground mb-1">{target.displayName}</div>

                <div className="flex items-baseline justify-between pt-2 border-t border-border/50 text-xs font-mono">
                  <span
                    className={`font-bold ${
                      isPass
                        ? "text-emerald-500"
                        : isTimedOut
                        ? "text-amber-500"
                        : isFail
                        ? "text-rose-500"
                        : "text-purple-500"
                    }`}
                  >
                    {runtimeItem.status}
                  </span>
                  <span className="text-muted-foreground">
                    exit {runtimeItem.exit_code} ({runtimeItem.duration_seconds.toFixed(2)}s)
                  </span>
                </div>
              </div>
            );
          }

          // 静态分析状态
          const isIssue = staticItem?.status === "Potential issue";
          return (
            <div
              key={target.id}
              className={`relative p-4 rounded-xl border transition-all ${
                isIssue
                  ? "bg-amber-500/[0.04] border-amber-500/30 dark:border-amber-500/20"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground">{target.id}</span>
                {isIssue ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                ) : (
                  <HelpCircle className="h-4 w-4 text-blue-400" />
                )}
              </div>

              <div className="text-sm font-semibold text-foreground mb-1">{target.displayName}</div>

              <div className="flex items-baseline justify-between pt-2 border-t border-border/50 text-xs font-mono">
                <span className={isIssue ? "text-amber-500 font-medium" : "text-blue-500"}>
                  {staticItem?.status || "Unknown"}
                </span>
                {isIssue && (
                  <span className="text-amber-500/80 text-[11px]">
                    {staticItem?.issueCount} warning{staticItem?.issueCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isRuntimeVerified && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground">
          <Terminal className="h-4 w-4 text-zinc-400 shrink-0" />
          <span>
            <strong>Note:</strong> Static analysis infers potential package-manager and syntax assumptions. True Linux
            compatibility requires executing in isolated containers with OpsScript Gate.
          </span>
        </div>
      )}
    </div>
  );
}
