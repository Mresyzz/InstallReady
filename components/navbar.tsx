"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Terminal, Shield, Moon, Sun, ExternalLink } from "lucide-react";

export function Navbar() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // 默认开启暗色模式以呈现严肃的 DevTools 质感
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold transition-transform group-hover:scale-105">
              <Terminal className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-foreground">InstallReady</span>
              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                v0.1
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/explore" className="transition-colors hover:text-foreground">
              Explore
            </Link>
            <Link href="/explore/ai-coding" className="flex items-center gap-1 transition-colors hover:text-foreground">
              <span>AI Coding Tools</span>
              <span className="rounded bg-blue-500/10 px-1 py-0.2 text-[9px] font-mono text-blue-500 font-medium">New</span>
            </Link>
            <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Mresyzz/opsscript-gate"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border px-2 py-1 rounded-md bg-muted/50"
          >
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            <span>OpsScript Gate</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>

          <a
            href="https://github.com/Mresyzz/InstallReady"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            GitHub
          </a>

          <button
            onClick={() => setIsDark(!isDark)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
