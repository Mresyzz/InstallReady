import type { Metadata } from "next";
import Link from "next/link";
import { ScriptWorkbench } from "@/components/script-workbench";

export const metadata: Metadata = {
  title: "Review a shell installer — InstallReady",
  description: "Paste a shell script for a private, in-browser review of package managers, Bash dependencies and minimal Linux container assumptions. No account or API key needed.",
};

export default function TryPage() {
  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
    <div className="max-w-2xl space-y-3">
      <p className="font-mono text-xs text-blue-500">LOCAL STATIC REVIEW</p>
      <h1 className="text-3xl font-bold tracking-tight">Find installer assumptions before running it.</h1>
      <p className="text-sm leading-6 text-muted-foreground">Paste your script or open an example. Review line-level warnings, export a report, then generate a workflow for real checks in Debian, Ubuntu and Alpine.</p>
      <Link href="/" className="inline-block text-sm text-blue-500 hover:underline">Prefer scanning a public GitHub repository?</Link>
    </div>
    <ScriptWorkbench />
  </div>;
}
