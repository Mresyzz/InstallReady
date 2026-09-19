import { validateRepositoryPath } from "./path-validator";

export interface DiscoveredScript {
  path: string;
  priority: number;
  isPrimaryCandidate: boolean;
  size?: number;
  lines?: number;
  shebang?: string;
}

export interface DiscoveryResult {
  candidates: DiscoveredScript[];
  isPartialScan: boolean;
  totalTreeFiles: number;
  inspectedCount: number;
  warning?: string;
}

const IGNORED_DIRECTORY_PREFIXES = [
  ".git/",
  "node_modules/",
  "vendor/",
  ".venv/",
  "venv/",
  "target/",
  "dist/",
  "build/",
  ".next/",
  ".cache/",
  "__pycache__/",
  "coverage/",
  ".bundle/",
  ".terraform/",
];

const HIGH_PRIORITY_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /^install\.sh$/i, score: 100 },
  { pattern: /^(setup|bootstrap)\.sh$/i, score: 90 },
  { pattern: /^(?:scripts|install)\/install\.sh$/i, score: 85 },
  { pattern: /^(?:scripts|install)\/(?:setup|bootstrap)\.sh$/i, score: 80 },
  { pattern: /^(deploy|provision|entrypoint|init)\.sh$/i, score: 75 },
  { pattern: /^(?:scripts|install)\/[^/]+\.sh$/i, score: 60 },
  { pattern: /\.sh$/i, score: 40 },
];

export const HIGH_CONFIDENCE_FALLBACK_PATHS = [
  "install.sh",
  "setup.sh",
  "bootstrap.sh",
  "deploy.sh",
  "entrypoint.sh",
  "scripts/install.sh",
  "scripts/setup.sh",
  "scripts/bootstrap.sh",
  "install/install.sh",
  "install/setup.sh",
];

/**
 * 判断路径是否位于忽略黑名单目录中
 */
export function isIgnoredPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return IGNORED_DIRECTORY_PREFIXES.some((prefix) => normalized.startsWith(prefix) || normalized.includes(`/${prefix}`));
}

/**
 * 计算脚本的启发式安装器置信度得分
 */
export function calculateInstallerScore(path: string): number {
  for (const { pattern, score } of HIGH_PRIORITY_PATTERNS) {
    if (pattern.test(path)) {
      return score;
    }
  }
  return 0;
}

export interface GitTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

/**
 * 从 GitHub 树结构中过滤、评分并排序候选安装脚本。
 * 显式感知并处理 truncated 截断。
 */
export function discoverInstallerScripts(
  treeItems: GitTreeItem[],
  isTruncated: boolean = false
): DiscoveryResult {
  const candidates: DiscoveredScript[] = [];
  let inspectedCount = 0;

  for (const item of treeItems) {
    if (item.type !== "blob") continue;
    if (isIgnoredPath(item.path)) continue;

    const pathValidation = validateRepositoryPath(item.path);
    if (!pathValidation.valid || !pathValidation.normalizedPath) continue;

    const safePath = pathValidation.normalizedPath;

    // 仅针对具有 .sh 扩展名或命中高信度安装命名的文件
    const score = calculateInstallerScore(safePath);
    if (score > 0) {
      inspectedCount++;
      candidates.push({
        path: safePath,
        priority: score,
        isPrimaryCandidate: score >= 80,
        size: item.size,
      });
    }

    if (inspectedCount >= 100) {
      break;
    }
  }

  // 降序排序，优先级高的在前
  candidates.sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path));

  let warning: string | undefined;
  if (isTruncated) {
    warning = "Large repository: only high-confidence installer locations were inspected.";
  }

  return {
    candidates,
    isPartialScan: isTruncated,
    totalTreeFiles: treeItems.length,
    inspectedCount,
    warning,
  };
}
