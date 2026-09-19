import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background py-10 text-xs text-muted-foreground">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">InstallReady</span>
              <span>— Zero-friction Linux installer compatibility</span>
            </div>
            <p className="max-w-md text-zinc-500 dark:text-zinc-400">
              InstallReady is the user-facing discovery and static analysis layer. Runtime verification is powered by{" "}
              <a
                href="https://github.com/Mresyzz/opsscript-gate"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-zinc-500 underline-offset-2 hover:text-blue-500 transition-colors"
              >
                OpsScript Gate
              </a>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono">
            <Link href="/explore" className="hover:text-foreground transition-colors">
              Explore
            </Link>
            <Link href="/explore/ai-coding" className="hover:text-foreground transition-colors">
              AI Coding Matrix
            </Link>
            <a
              href="https://github.com/Mresyzz/InstallReady"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub Repository
            </a>
            <a
              href="https://github.com/Mresyzz/opsscript-gate"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              OpsScript Gate
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>Strict Zero-Execution web security model. No arbitrary script runs on web hosts.</span>
          </div>
          <span className="font-mono text-zinc-500">MIT Licensed</span>
        </div>
      </div>
    </footer>
  );
}
