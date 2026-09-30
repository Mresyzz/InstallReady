import { validateRepositoryPath, generateScriptResultFilename } from "./path-validator";
import { parseAndValidateGitHubUrl } from "./repo-url";

export interface ShowcaseRepositoryEntry {
  owner: string;
  repo: string;
  runtimeEnabled?: boolean;
  runtimeScripts?: string[];
  defaultScript?: string;
  [key: string]: unknown;
}

export interface ShowcaseConfig {
  repositories: ShowcaseRepositoryEntry[];
  [key: string]: unknown;
}

export interface ValidateRuntimeTargetInput {
  rawRepo: string;
  rawScript: string;
  showcaseConfig: ShowcaseConfig;
}

export interface ValidatedRuntimeTarget {
  owner: string;
  repo: string;
  targetOwnerNormalized: string;
  targetRepoNormalized: string;
  scriptPath: string;
  getDeterministicRelativePath: (commitSha: string) => string;
}

/**
 * 校验并授权运行时执行目标：
 * 1. 语法校验 target_repo 格式；
 * 2. 严格按安全规则校验 script_path（杜绝绝对路径、目录遍历、控制字符等）；
 * 3. 严格核对受信任的 showcaseConfig：
 *    - 仓库必须在白名单中（大小写无关匹配）；
 *    - 仓库必须显式标记 runtimeEnabled === true；
 *    - 脚本路径必须显式包含在 runtimeScripts 白名单数组中；
 * 4. 输出规范化的小写 owner、repo 与确定性相对文件路径。
 */
export function validateRuntimeTarget(input: ValidateRuntimeTargetInput): ValidatedRuntimeTarget {
  const { rawRepo, rawScript, showcaseConfig } = input;

  if (!rawRepo || typeof rawRepo !== "string") {
    throw new Error("Target repository must be a non-empty string.");
  }
  if (!rawScript || typeof rawScript !== "string") {
    throw new Error("Script path must be a non-empty string.");
  }

  // 1. 校验并解析目标仓库
  const parsedRepo = parseAndValidateGitHubUrl(rawRepo.trim());
  if (!parsedRepo.valid || !parsedRepo.owner || !parsedRepo.repo) {
    throw new Error(`Invalid target repository '${rawRepo}': ${parsedRepo.error || "must be in 'owner/repo' format"}`);
  }

  const inputOwner = parsedRepo.owner;
  const inputRepo = parsedRepo.repo;

  // 2. 在执行任何外部代码前，先严格校验脚本路径格式（防遍历、绝对路径等）
  const scriptValidation = validateRepositoryPath(rawScript.trim());
  if (!scriptValidation.valid || !scriptValidation.normalizedPath) {
    throw new Error(`Invalid script path '${rawScript}': ${scriptValidation.error || "Path validation failed"}`);
  }
  const safeScriptPath = scriptValidation.normalizedPath;

  // 3. 校验受信任白名单配置
  if (!showcaseConfig || !Array.isArray(showcaseConfig.repositories)) {
    throw new Error("Invalid showcase configuration: missing repositories allowlist.");
  }

  const match = showcaseConfig.repositories.find(
    (r) =>
      r.owner.toLowerCase() === inputOwner.toLowerCase() &&
      r.repo.toLowerCase() === inputRepo.toLowerCase()
  );

  if (!match) {
    throw new Error(`Repository '${inputOwner}/${inputRepo}' is NOT in the trusted showcase allowlist.`);
  }

  if (match.runtimeEnabled !== true) {
    throw new Error(
      `Repository '${match.owner}/${match.repo}' is not enabled for runtime execution (runtimeEnabled is false).`
    );
  }

  const allowedScripts = Array.isArray(match.runtimeScripts) ? match.runtimeScripts : [];
  if (!allowedScripts.includes(safeScriptPath)) {
    throw new Error(
      `Script '${safeScriptPath}' is not an explicitly authorized runtime script for '${match.owner}/${match.repo}'. Authorized: [${allowedScripts.join(", ")}].`
    );
  }

  const targetOwnerNormalized = match.owner.toLowerCase();
  const targetRepoNormalized = match.repo.toLowerCase();

  return {
    owner: match.owner,
    repo: match.repo,
    targetOwnerNormalized,
    targetRepoNormalized,
    scriptPath: safeScriptPath,
    getDeterministicRelativePath: (commitSha: string) => {
      const safeSha = commitSha.toLowerCase();
      const filename = generateScriptResultFilename(safeScriptPath);
      return `${targetOwnerNormalized}/${targetRepoNormalized}/${safeSha}/${filename}`;
    },
  };
}
