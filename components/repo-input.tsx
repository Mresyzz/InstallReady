"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseAndValidateGitHubUrl } from "@/lib/repo-url";
import { ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";

const EXAMPLE_REPOS = [
  { label: "OpsScript Gate", value: "https://github.com/Mresyzz/opsscript-gate", badge: "Verified" },
  { label: "Fixture (Alpine Fail)", value: "demo/installer-fixture", badge: "Demo" },
  { label: "NVM", value: "https://github.com/nvm-sh/nvm", badge: "Popular" },
];

export function RepoInput({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [inputUrl, setInputUrl] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = parseAndValidateGitHubUrl(inputUrl);
    if (!validation.valid || !validation.owner || !validation.repo) {
      setError(validation.error || "Please enter a valid GitHub repository URL.");
      return;
    }

    setIsLoading(true);
    router.push(`/r/${validation.owner}/${validation.repo}`);
  };

  const selectExample = (val: string) => {
    setInputUrl(val);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 shadow-lg shadow-black/5 dark:shadow-none focus-within:border-blue-500 transition-colors">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste a GitHub repository URL (e.g. https://github.com/owner/project)"
            disabled={isLoading}
            className="flex-1 px-3.5 py-3 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-mono"
            aria-label="GitHub repository URL"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <span>Check compatibility</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-rose-500 dark:text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* 快速示例标签 */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Examples:
        </span>
        {EXAMPLE_REPOS.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => selectExample(ex.value)}
            className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors"
          >
            <span className="font-mono">{ex.label}</span>
            <span className="text-[9px] font-mono rounded bg-zinc-200 dark:bg-zinc-800 px-1 py-0.2 text-muted-foreground group-hover:text-foreground">
              {ex.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
