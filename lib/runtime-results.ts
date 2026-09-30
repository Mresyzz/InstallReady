import fs from "fs";
import path from "path";
import { generateScriptResultFilename } from "./path-validator";
import { OpsScriptGateResult, validateUntrustedArtifactJson } from "./schema";

const RESULTS_BRANCH = "runtime-results";
const RESULTS_HOST_REPO = "Mresyzz/InstallReady";

/**
 * 获取指定仓库、Commit 与脚本的真实 OpsScript Gate 运行时结果。
 * 1. 优先从本地只读内置目录 data/runtime-results/... 检索
 * 2. 其次通过严格构造的官方 GitHub Raw 端点安全读取（绝不走用户传入的 URL）
 */
export async function getRuntimeVerificationResult(
  owner: string,
  repo: string,
  commitSha: string,
  scriptPath: string
): Promise<OpsScriptGateResult | null> {
  const filename = generateScriptResultFilename(scriptPath);

  // 1. 本地内置数据检查（开发环境与预置精选 showcase）
  try {
    const localDir = path.join(process.cwd(), "data", "runtime-results", owner.toLowerCase(), repo.toLowerCase(), commitSha.toLowerCase());
    const localFile = path.join(localDir, filename);

    if (fs.existsSync(localFile)) {
      const content = fs.readFileSync(localFile, "utf-8");
      const validation = validateUntrustedArtifactJson(content, {
        expectedOwner: owner,
        expectedRepo: repo,
        expectedCommitSha: commitSha,
        expectedScriptPath: scriptPath,
      });
      if (validation.valid && validation.data) {
        return validation.data;
      }
    }
  } catch {
    // 忽略本地文件系统错误，进入远端拉取
  }

  // 2. 构造官方 GitHub Raw 只读端点（仅限定于 Mresyzz/InstallReady 的 runtime-results 分支）
  const safeOwner = encodeURIComponent(owner.toLowerCase());
  const safeRepo = encodeURIComponent(repo.toLowerCase());
  const safeCommit = encodeURIComponent(commitSha.toLowerCase());
  const safeFilename = encodeURIComponent(filename);

  const rawUrl = `https://raw.githubusercontent.com/${RESULTS_HOST_REPO}/${RESULTS_BRANCH}/${safeOwner}/${safeRepo}/${safeCommit}/${safeFilename}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000); // 5s 超时
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "InstallReady-Result-Fetcher/0.1.0",
      },
      next: { revalidate: 3600 }, // 1小时缓存
    });
    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const text = await res.text();
    const validation = validateUntrustedArtifactJson(text, {
      expectedOwner: owner,
      expectedRepo: repo,
      expectedCommitSha: commitSha,
      expectedScriptPath: scriptPath,
    });

    if (validation.valid && validation.data) {
      return validation.data;
    }
  } catch {
    // 远端尚未发布或网络异常，安全返回 null
  }

  return null;
}
