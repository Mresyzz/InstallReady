import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateGitHubUrl, validateFullCommitSha } from "@/lib/repo-url";
import { validateRepositoryPath } from "@/lib/path-validator";
import {
  fetchRepoMetadata,
  fetchCommitTree,
  fetchScriptContent,
  GitHubApiError,
} from "@/lib/github";
import {
  discoverInstallerScripts,
  HIGH_CONFIDENCE_FALLBACK_PATHS,
  mergeFallbackCandidates,
} from "@/lib/discovery";
import { analyzeShellScript } from "@/lib/analyzer";
import { getRuntimeVerificationResult } from "@/lib/runtime-results";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawRepo = body.repo || body.url || body.repository;
    const requestedCommit = body.commitSha || body.commit;
    const requestedScript = body.scriptPath || body.script;

    // 1. 严格校验仓库地址格式
    const parsedRepo = parseAndValidateGitHubUrl(String(rawRepo || ""));
    if (!parsedRepo.valid || !parsedRepo.owner || !parsedRepo.repo) {
      return NextResponse.json(
        { error: parsedRepo.error || "Invalid repository format." },
        { status: 400 }
      );
    }

    const { owner, repo } = parsedRepo;

    // 2. 获取仓库元数据及默认 HEAD Commit
    const metadata = await fetchRepoMetadata(owner, repo);

    // 3. 确定不可变 Commit SHA
    let commitSha = metadata.headCommitSha;
    if (requestedCommit) {
      if (!validateFullCommitSha(requestedCommit)) {
        return NextResponse.json(
          { error: "Invalid commitSha: must be a 40-character hexadecimal string." },
          { status: 400 }
        );
      }
      commitSha = requestedCommit;
    }

    if (!commitSha) {
      return NextResponse.json(
        { error: "Unable to resolve repository commit SHA." },
        { status: 500 }
      );
    }

    // 4. 获取 Git 树与发现安装脚本（感知截断）
    const { items: treeItems, truncated } = await fetchCommitTree(owner, repo, commitSha);
    let discovery = discoverInstallerScripts(treeItems, truncated);

    // 当 Git 树截断时，始终执行高置信保底探测，防止顶级 install.sh 被截断漏掉
    if (truncated) {
      const fallbackFound: Array<{ path: string; size?: number }> = [];
      const existingPaths = new Set(discovery.candidates.map((c) => c.path));

      for (const fallbackPath of HIGH_CONFIDENCE_FALLBACK_PATHS) {
        if (existingPaths.has(fallbackPath)) continue;
        try {
          const checkRes = await fetchScriptContent(owner, repo, commitSha, fallbackPath);
          if (checkRes.content) {
            fallbackFound.push({
              path: fallbackPath,
              size: checkRes.size,
            });
          }
        } catch {
          // 保底路径不存在，继续
        }
      }

      if (fallbackFound.length > 0) {
        discovery = mergeFallbackCandidates(discovery.candidates, fallbackFound, true);
      }
    }

    if (discovery.candidates.length === 0) {
      return NextResponse.json(
        {
          error: "NO_SCRIPTS_FOUND",
          message: "No shell installer or setup scripts (*.sh) were detected in this repository.",
          repository: metadata,
          commitSha,
          isPartialScan: discovery.isPartialScan,
          warning: discovery.warning,
        },
        { status: 404 }
      );
    }

    // 5. 确定目标脚本
    let targetScript = discovery.candidates[0].path;
    if (requestedScript) {
      const scriptVal = validateRepositoryPath(requestedScript);
      if (!scriptVal.valid || !scriptVal.normalizedPath) {
        return NextResponse.json(
          { error: scriptVal.error || "Invalid script path." },
          { status: 400 }
        );
      }
      targetScript = scriptVal.normalizedPath;
    }

    // 6. 抓取目标脚本内容并执行保守静态分析
    const { content: scriptContent } = await fetchScriptContent(owner, repo, commitSha, targetScript);
    const staticReport = analyzeShellScript(targetScript, scriptContent);

    // 7. 查询真实 OpsScript Gate 运行时验证数据
    const runtimeResult = await getRuntimeVerificationResult(owner, repo, commitSha, targetScript);

    const canonicalUrl = `/r/${owner}/${repo}/${commitSha}?script=${encodeURIComponent(targetScript)}`;
    const badgeUrl = `/api/badges/${owner}/${repo}?commit=${commitSha}&script=${encodeURIComponent(targetScript)}`;

    return NextResponse.json({
      repository: metadata,
      commitSha,
      selectedScript: targetScript,
      candidates: discovery.candidates,
      isPartialScan: discovery.isPartialScan,
      warning: discovery.warning,
      staticAnalysis: staticReport,
      runtimeVerification: runtimeResult,
      canonicalUrl,
      badgeUrl,
    });
  } catch (err: unknown) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
