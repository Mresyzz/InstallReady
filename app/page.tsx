import Link from "next/link";
import { RepoInput } from "@/components/repo-input";
import {
  Shield,
  CheckCircle2,
  XCircle,
  FileCode2,
  Terminal,
  Cpu,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero 区域 */}
      <section className="w-full py-16 sm:py-24 px-4 sm:px-6 text-center max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/60 text-xs font-mono text-muted-foreground">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Zero-friction Linux compatibility scanner</span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Does this repo actually install cleanly on Linux?
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Check installer scripts across Debian, Ubuntu, and Alpine before users find the breakage for you.
          </p>
        </div>

        {/* 核心输入框 */}
        <div className="pt-2">
          <RepoInput />
        </div>

        {/* 快速演示卡片：Alpine 踩坑对比 */}
        <div className="pt-10 max-w-3xl mx-auto text-left">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/60 shadow-xl backdrop-blur p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-mono text-xs font-bold">
                  ir
                </div>
                <div>
                  <div className="font-mono text-xs font-semibold text-foreground">demo/installer-fixture</div>
                  <div className="font-mono text-[11px] text-zinc-500">install.sh (commit 22222222)</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-medium">
                  <XCircle className="h-3 w-3" />
                  3 / 4 Runtime Verified
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] flex items-center justify-between">
                <span>Debian 12</span>
                <span className="text-emerald-500 font-bold">PASS</span>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] flex items-center justify-between">
                <span>Ubuntu 22.04</span>
                <span className="text-emerald-500 font-bold">PASS</span>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] flex items-center justify-between">
                <span>Ubuntu 24.04</span>
                <span className="text-emerald-500 font-bold">PASS</span>
              </div>
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.05] flex items-center justify-between">
                <span>Alpine 3.20</span>
                <span className="text-rose-500 font-bold">FAIL</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.02] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-rose-400">Alpine 3.20 Failure: Line 43</span>
                <span className="text-zinc-500">apt-get: command not found</span>
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs">
                <code>apt-get install -y curl</code>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-amber-400">Suggested fix:</strong> Alpine normally uses <code>apk add curl</code> instead of <code>apt-get</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 工作原理 Section */}
      <section id="how-it-works" className="w-full py-16 px-4 sm:px-6 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              How It Works
            </h2>
            <p className="text-sm text-muted-foreground">
              Three-stage progressive pipeline from static repo discovery to isolated container verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <FileCode2 className="h-5 w-5" />
              </div>
              <div className="font-mono text-xs font-semibold text-blue-500">01. Discovery</div>
              <h3 className="text-base font-semibold text-foreground">Find installer scripts</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatically scans the repository tree for <code>install.sh</code>, <code>setup.sh</code>, and <code>bootstrap.sh</code>, filtering vendor and build artifacts.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="font-mono text-xs font-semibold text-amber-500">02. Static Review</div>
              <h3 className="text-base font-semibold text-foreground">Analyze distro assumptions</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inspects package manager calls (<code>apt</code>, <code>apk</code>, <code>dnf</code>), bashisms, and systemd assumptions with deterministic guard detection.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3 relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Shield className="h-5 w-5" />
              </div>
              <div className="font-mono text-xs font-semibold text-emerald-500">03. Runtime Verify</div>
              <h3 className="text-base font-semibold text-foreground">Powered by OpsScript Gate</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Executes scripts inside isolated Debian, Ubuntu, and Alpine containers in your own GitHub Actions workflow with zero risk to web servers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 为什么静态分析不够 Section */}
      <section className="w-full py-16 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Why static analysis isn&apos;t enough
            </h2>
            <p className="text-sm text-muted-foreground">
              Syntactically valid POSIX shell code can still completely crash on different Linux distributions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-foreground">ShellCheck / Linters</span>
                <span className="text-emerald-500 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  syntax valid
                </span>
              </div>
              <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-300 font-mono text-xs">
                <code>{`#!/bin/sh
set -e
echo "Updating packages..."
apt-get update
apt-get install -y curl`}</code>
              </pre>
              <p className="text-xs text-zinc-500">
                ShellCheck reports 0 warnings because the POSIX syntax itself is 100% correct.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-500/[0.03] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-foreground">OpsScript Gate Runtime</span>
                <span className="text-rose-500 flex items-center gap-1 font-bold">
                  <XCircle className="h-3.5 w-3.5" />
                  Alpine 3.20 FAIL
                </span>
              </div>
              <pre className="p-3 rounded-lg bg-zinc-950 text-rose-300 font-mono text-xs">
                <code>{`[alpine:3.20] line 4:
apt-get: not found

Exit code: 127
Alpine uses apk instead of apt-get.`}</code>
              </pre>
              <p className="text-xs text-zinc-500">
                OpsScript Gate catches missing binaries, path assumptions, and shell discrepancies at runtime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Powered by OpsScript Gate Callout */}
      <section className="w-full py-12 px-4 sm:px-6 border-t border-border bg-muted/40 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-mono font-medium border border-blue-500/20">
            <Shield className="h-3.5 w-3.5" />
            <span>Under the Hood</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Powered by OpsScript Gate
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            InstallReady is the discovery and user-facing analysis layer. The actual isolated container execution engine is powered by{" "}
            <a
              href="https://github.com/Mresyzz/opsscript-gate"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline decoration-zinc-500 underline-offset-2 hover:text-blue-500 font-mono"
            >
              Mresyzz/opsscript-gate@v0.4.1
            </a>
            .
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <span>Explore showcase repositories</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/explore/ai-coding"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-muted transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <span>AI Coding compatibility matrix</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
