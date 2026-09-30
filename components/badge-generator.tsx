"use client";

import { useState } from "react";
import { Check, Copy, Tag } from "lucide-react";

interface BadgeGeneratorProps {
  owner: string;
  repo: string;
  commitSha: string;
  scriptPath: string;
  badgeUrl: string;
  canonicalUrl: string;
}

export function BadgeGenerator({
  owner,
  repo,
  commitSha,
  scriptPath,
  badgeUrl,
  canonicalUrl,
}: BadgeGeneratorProps) {
  const [copied, setCopied] = useState(false);

  // 构造绝对路径
  const origin = typeof window !== "undefined" ? window.location.origin : "https://installready.dev";
  const absoluteBadgeUrl = `${origin}${badgeUrl}`;
  const absoluteResultUrl = `${origin}${canonicalUrl}`;

  const markdownSnippet = `[![InstallReady](${absoluteBadgeUrl})](${absoluteResultUrl})`;

  const copyBadge = async () => {
    try {
      await navigator.clipboard.writeText(markdownSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-foreground">README Badge</h3>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">Live Status SVG</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeUrl}
          alt={`InstallReady Status for ${owner}/${repo}`}
          className="h-5"
        />

        <button
          type="button"
          onClick={copyBadge}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-all shadow-sm active:scale-95"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Copied Markdown!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Badge Markdown</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-2.5 rounded bg-zinc-950 text-zinc-400 font-mono text-[11px] overflow-x-auto border border-zinc-800">
        <code>{markdownSnippet}</code>
      </pre>
    </div>
  );
}
