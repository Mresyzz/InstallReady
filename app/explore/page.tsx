import Link from "next/link";
import showcaseData from "@/data/showcase.json";
import { Shield, ArrowRight, Sparkles, CheckCircle2, Terminal } from "lucide-react";

export default function ExplorePage() {
  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 space-y-10">
      {/* 头部导航 */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-500 uppercase tracking-wider font-semibold">
          <Terminal className="h-3.5 w-3.5" />
          <span>Showcase Repositories</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Explore Linux Install Compatibility
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Browse popular open-source repositories and inspect their installer scripts across Linux distributions.
        </p>
      </div>

      {/* AI Coding 垂类专属横幅 */}
      <div className="p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/[0.06] to-purple-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h2 className="text-base font-semibold text-foreground">
              AI Coding Tools Vertical Matrix
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Comparing installer and setup mechanisms for Claude Code, Codex CLI, Gemini CLI, OpenCode, Qwen Code, and GitHub Copilot.
          </p>
        </div>
        <Link
          href="/explore/ai-coding"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0 shadow-sm"
        >
          <span>View Matrix</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 分类展示 */}
      <div className="space-y-8">
        {showcaseData.categories.map((cat) => {
          const repos = showcaseData.repositories.filter((r) => r.category === cat.id);
          if (repos.length === 0 && cat.id !== "ai-coding") return null;

          return (
            <div key={cat.id} className="space-y-4">
              <div className="border-b border-border pb-2">
                <h3 className="text-base font-semibold text-foreground">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>

              {cat.id === "ai-coding" ? (
                <div className="p-4 rounded-xl border border-border bg-card/60 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    6 AI terminal agents tracked. Verified status documented honestly without fabricated results.
                  </div>
                  <Link
                    href="/explore/ai-coding"
                    className="text-xs font-mono text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <span>Inspect vertical matrix</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {repos.map((repo) => {
                    const isRuntimeVerified = repo.verificationType === "runtime_verified";
                    return (
                      <Link
                        key={`${repo.owner}/${repo.repo}`}
                        href={`/r/${repo.owner}/${repo.repo}`}
                        className="p-4 rounded-xl border border-border bg-card hover:border-zinc-400 dark:hover:border-zinc-700 hover:bg-muted/40 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                              {repo.owner}/{repo.repo}
                            </span>
                            {isRuntimeVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                Runtime Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                                Static only
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {repo.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] font-mono text-zinc-500">
                          <span>Target: {repo.defaultScript}</span>
                          <span className="flex items-center gap-1 text-blue-500 group-hover:translate-x-0.5 transition-transform">
                            <span>Check</span>
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 提交新展示项目 */}
      <div className="p-6 rounded-xl border border-border bg-card text-center space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Want to add your repository to the showcase?</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Submit a pull request adding your repository to <code className="font-mono text-foreground">data/showcase.json</code>.
          Showcase runtime execution is strictly governed by allowlisted workflows.
        </p>
      </div>
    </div>
  );
}
