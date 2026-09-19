import { NextRequest, NextResponse } from "next/server";
import { parseAndValidateGitHubUrl, validateFullCommitSha } from "@/lib/repo-url";
import { validateRepositoryPath } from "@/lib/path-validator";
import { getRuntimeVerificationResult } from "@/lib/runtime-results";
import { generateInstallReadyBadge } from "@/lib/badge";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await context.params;

  // 基础格式校验，防止异常字符串
  const parsed = parseAndValidateGitHubUrl(`${owner}/${repo}`);
  if (!parsed.valid || !parsed.owner || !parsed.repo) {
    const svg = generateInstallReadyBadge({ type: "not_checked" });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const commit = searchParams.get("commit");
  const script = searchParams.get("script");

  // 严格原则：徽章接口绝不主动触发实时 GitHub 遍历与内容抓取
  if (!commit || !script || !validateFullCommitSha(commit) || !validateRepositoryPath(script).valid) {
    const svg = generateInstallReadyBadge({ type: "not_checked" });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  // 仅查询持久化/内置的 OpsScript Gate 运行报告
  const runtimeResult = await getRuntimeVerificationResult(parsed.owner, parsed.repo, commit, script);
  if (runtimeResult) {
    const svg = generateInstallReadyBadge({
      type: "runtime_verified",
      passed: runtimeResult.summary.passed,
      total: runtimeResult.summary.total,
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }

  // 存在明确 script 与 commit，但未运行真实容器验证：返回静态检查徽章（非绿）
  const svg = generateInstallReadyBadge({ type: "static_checked" });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
