import Link from "next/link";
import { parseAndValidateGitHubUrl, validateFullCommitSha } from "@/lib/repo-url";
import { validateRepositoryPath } from "@/lib/path-validator";
import {
  fetchRepoMetadata,
  fetchCommitTree,
  fetchScriptContent,
  GitHubApiError,
} from "@/lib/github";
import { discoverInstallerScripts, HIGH_CONFIDENCE_FALLBACK_PATHS } from "@/lib/discovery";
import { analyzeShellScript } from "@/lib/analyzer";
import { getRuntimeVerificationResult } from "@/lib/runtime-results";
import { ResultView } from "@/components/result-view";
import { AlertCircle, ArrowLeft, GitCommit } from "lucide-react";

interface PageProps {
  params: Promise<{ owner: string; repo: string; commitSha: string }>;
  searchParams: Promise<{ script?: string }>;
}

export default async function CommitPinnedResultPage({ params, searchParams }: PageProps) {
  const { owner, repo, commitSha } = await params;
  const { script } = await searchParams;

  // 1. 严格校验 owner / repo
  const urlVal = parseAndValidateGitHubUrl(`${owner}/${repo}`);
  if (!urlVal.valid || !urlVal.owner || !urlVal.repo) {
    return renderErrorCard("Invalid Repository", urlVal.error || "Malformed repository identifier.");
  }

  // 2. 严格校验 40 位不可变 Commit SHA
  if (!validateFullCommitSha(commitSha)) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 mx-auto">
          <GitCommit className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Immutable Commit SHA Required</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Commit-pinned results require a full 40-character hexadecimal commit hash (e.g.{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono">eb41fd07...</code>).
          Branch names, HEAD, tags, and abbreviated 7-character hashes are rejected on this route to ensure deterministic, unalterable analysis.
        </p>
        <div className="pt-3">
          <Link
            href={`/r/${owner}/${repo}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Resolve current default branch HEAD</span>
          </Link>
        </div>
      </div>
    );
  }

  try {
    const metadata = await fetchRepoMetadata(urlVal.owner, urlVal.repo);
    const { items: treeItems, truncated } = await fetchCommitTree(urlVal.owner, urlVal.repo, commitSha);
    const discovery = discoverInstallerScripts(treeItems, truncated);

    // 针对截断仓库尝试保底检查
    if (discovery.candidates.length === 0 && truncated) {
      for (const fallbackPath of HIGH_CONFIDENCE_FALLBACK_PATHS) {
        try {
          const checkRes = await fetchScriptContent(urlVal.owner, urlVal.repo, commitSha, fallbackPath);
          if (checkRes.content) {
            discovery.candidates.push({
              path: fallbackPath,
              priority: 80,
              isPrimaryCandidate: true,
              size: checkRes.size,
            });
          }
        } catch {
          // ignore
        }
      }
    }

    if (discovery.candidates.length === 0) {
      return (
        <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">No Installer Scripts Detected</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            InstallReady inspected {discovery.inspectedCount} candidate files in {owner}/{repo} but could not find any shell installer or bootstrap scripts (*.sh).
          </p>
          {discovery.isPartialScan && (
            <p className="text-xs text-amber-500 font-mono">
              Note: This repository tree was truncated by GitHub API.
            </p>
          )}
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to search</span>
            </Link>
          </div>
        </div>
      );
    }

    // 确定目标脚本
    let targetScript = discovery.candidates[0].path;
    if (script) {
      const scriptVal = validateRepositoryPath(script);
      if (scriptVal.valid && scriptVal.normalizedPath) {
        targetScript = scriptVal.normalizedPath;
      }
    }

    const { content: scriptContent } = await fetchScriptContent(
      urlVal.owner,
      urlVal.repo,
      commitSha,
      targetScript
    );

    const staticReport = analyzeShellScript(targetScript, scriptContent);
    const runtimeResult = await getRuntimeVerificationResult(
      urlVal.owner,
      urlVal.repo,
      commitSha,
      targetScript
    );

    const canonicalUrl = `/r/${urlVal.owner}/${urlVal.repo}/${commitSha}?script=${encodeURIComponent(targetScript)}`;
    const badgeUrl = `/api/badges/${urlVal.owner}/${urlVal.repo}?commit=${commitSha}&script=${encodeURIComponent(targetScript)}`;

    return (
      <ResultView
        metadata={metadata}
        commitSha={commitSha}
        selectedScript={targetScript}
        candidates={discovery.candidates}
        staticReport={staticReport}
        runtimeResult={runtimeResult}
        isPartialScan={discovery.isPartialScan}
        warning={discovery.warning}
        badgeUrl={badgeUrl}
        canonicalUrl={canonicalUrl}
      />
    );
  } catch (err: unknown) {
    let msg = "An error occurred while inspecting repository.";
    if (err instanceof GitHubApiError) {
      msg = err.message;
    } else if (err instanceof Error) {
      msg = err.message;
    }
    return renderErrorCard("Inspection Failed", msg);
  }
}

function renderErrorCard(title: string, message: string) {
  return (
    <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 mx-auto">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Home</span>
        </Link>
      </div>
    </div>
  );
}
