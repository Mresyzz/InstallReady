export interface ParsedRepoResult {
  valid: boolean;
  owner?: string;
  repo?: string;
  error?: string;
}

const GITHUB_OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const GITHUB_REPO_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;
const FULL_COMMIT_SHA_REGEX = /^[0-9a-f]{40}$/;

/**
 * 校验并提取 GitHub 仓库 owner/repo。
 * 杜绝 SSRF，仅允许 github.com 官方仓库。
 */
export function parseAndValidateGitHubUrl(input: string): ParsedRepoResult {
  if (typeof input !== "string") {
    return { valid: false, error: "Repository URL must be a string." };
  }

  const raw = input.trim();
  if (!raw) {
    return { valid: false, error: "Repository input cannot be empty." };
  }

  if (raw.length > 200) {
    return { valid: false, error: "Repository input is excessively long (maximum 200 characters)." };
  }

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(raw)) {
    return { valid: false, error: "Repository input contains invalid control characters." };
  }

  let normalized = raw;

  // 如果包含协议
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      const hostname = parsed.hostname.toLowerCase();
      if (hostname !== "github.com" && hostname !== "www.github.com") {
        return { valid: false, error: "Only public GitHub repositories (github.com) are supported." };
      }
      normalized = parsed.pathname;
    } catch {
      return { valid: false, error: "Malformed URL syntax." };
    }
  } else if (/^github\.com\//i.test(normalized)) {
    normalized = normalized.replace(/^github\.com\//i, "/");
  }

  // 去除前后斜杠与 .git 后缀
  normalized = normalized.replace(/^\/+/, "").replace(/\/+$/, "");
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length !== 2) {
    return {
      valid: false,
      error: "Invalid repository format. Please provide 'owner/repo' or 'https://github.com/owner/repo'.",
    };
  }

  const [owner, repo] = parts;

  if (!GITHUB_OWNER_REGEX.test(owner)) {
    return { valid: false, error: `Invalid GitHub owner name: '${owner}'.` };
  }

  if (!GITHUB_REPO_REGEX.test(repo) || repo === "." || repo === "..") {
    return { valid: false, error: `Invalid GitHub repository name: '${repo}'.` };
  }

  return {
    valid: true,
    owner,
    repo,
  };
}

/**
 * 严格校验完整的 40 位不可变 Commit SHA。
 * 坚决拒绝 7-39 位短哈希、分支名 (main/master)、HEAD、tag 或 refs/*。
 */
export function validateFullCommitSha(sha: string): boolean {
  if (typeof sha !== "string") {
    return false;
  }
  const trimmed = sha.trim().toLowerCase();
  return FULL_COMMIT_SHA_REGEX.test(trimmed);
}
