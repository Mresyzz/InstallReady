import { validateFullCommitSha } from "./repo-url";
import { validateRepositoryPath } from "./path-validator";
import { GitTreeItem } from "./discovery";

export interface RepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  headCommitSha: string;
  primaryLanguage: string | null;
  stars: number;
  isPrivate: boolean;
  isArchived: boolean;
}

export class GitHubApiError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "RATE_LIMITED"
      | "PRIVATE_REPO"
      | "TIMEOUT"
      | "FILE_TOO_LARGE"
      | "API_ERROR"
      | "INVALID_INPUT",
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "InstallReady-Scanner/0.1.0 (+https://github.com/Mresyzz/InstallReady)",
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

const REQUEST_TIMEOUT_MS = 10000; // 10秒严格超时
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MiB 上限

async function fetchWithTimeout(url: string, headers: HeadersInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new GitHubApiError("TIMEOUT", `GitHub request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
    }
    throw new GitHubApiError("API_ERROR", `Network failure when contacting GitHub: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 获取公开仓库基础元数据及默认分支 HEAD Commit SHA
 */
export async function fetchRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
  const safeOwner = encodeURIComponent(owner);
  const safeRepo = encodeURIComponent(repo);
  const apiUrl = `https://api.github.com/repos/${safeOwner}/${safeRepo}`;

  const res = await fetchWithTimeout(apiUrl, getAuthHeaders());

  if (res.status === 404) {
    throw new GitHubApiError("NOT_FOUND", `Repository '${owner}/${repo}' was not found or is private.`, 404);
  }

  if (res.status === 403) {
    const rateRemaining = res.headers.get("x-ratelimit-remaining");
    if (rateRemaining === "0") {
      throw new GitHubApiError("RATE_LIMITED", "GitHub API rate limit exceeded. Please configure GITHUB_TOKEN or try again later.", 403);
    }
    throw new GitHubApiError("PRIVATE_REPO", "Access denied. Private repositories are not supported in v0.1.", 403);
  }

  if (!res.ok) {
    throw new GitHubApiError("API_ERROR", `GitHub API returned unexpected HTTP ${res.status}.`, res.status);
  }

  const data = await res.json();
  const defaultBranch = data.default_branch || "main";

  // 获取默认分支的真实最新 Commit SHA
  const commitUrl = `https://api.github.com/repos/${safeOwner}/${safeRepo}/commits/${encodeURIComponent(defaultBranch)}`;
  const commitRes = await fetchWithTimeout(commitUrl, getAuthHeaders());

  let headCommitSha = "";
  if (commitRes.ok) {
    const commitData = await commitRes.json();
    headCommitSha = commitData.sha || "";
  }

  return {
    owner: data.owner.login,
    repo: data.name,
    fullName: data.full_name,
    description: data.description,
    defaultBranch,
    headCommitSha,
    primaryLanguage: data.language,
    stars: data.stargazers_count || 0,
    isPrivate: Boolean(data.private),
    isArchived: Boolean(data.archived),
  };
}

/**
 * 获取特定 Commit 的文件树（支持检测截断）
 */
export async function fetchCommitTree(
  owner: string,
  repo: string,
  commitSha: string
): Promise<{ items: GitTreeItem[]; truncated: boolean }> {
  if (!validateFullCommitSha(commitSha)) {
    throw new GitHubApiError("INVALID_INPUT", `Invalid commit SHA '${commitSha}'. Must be a 40-character hex string.`);
  }

  const safeOwner = encodeURIComponent(owner);
  const safeRepo = encodeURIComponent(repo);
  const safeCommit = encodeURIComponent(commitSha);
  const url = `https://api.github.com/repos/${safeOwner}/${safeRepo}/git/trees/${safeCommit}?recursive=1`;

  const res = await fetchWithTimeout(url, getAuthHeaders());
  if (res.status === 404) {
    throw new GitHubApiError("NOT_FOUND", `Git tree for commit '${commitSha}' not found.`, 404);
  }
  if (!res.ok) {
    throw new GitHubApiError("API_ERROR", `Failed to fetch repository tree: HTTP ${res.status}.`, res.status);
  }

  const data = await res.json();
  const items: GitTreeItem[] = Array.isArray(data.tree)
    ? data.tree.map((t: { path: string; type: string; size?: number }) => ({
        path: t.path,
        type: t.type === "blob" ? "blob" : "tree",
        size: t.size,
      }))
    : [];

  return {
    items,
    truncated: Boolean(data.truncated),
  };
}

/**
 * 获取指定脚本的文本内容（限制最大 1MB，防遍历）
 */
export async function fetchScriptContent(
  owner: string,
  repo: string,
  commitSha: string,
  scriptPath: string
): Promise<{ content: string; size: number }> {
  if (!validateFullCommitSha(commitSha)) {
    throw new GitHubApiError("INVALID_INPUT", "Invalid commit SHA format.");
  }

  const pathValidation = validateRepositoryPath(scriptPath);
  if (!pathValidation.valid || !pathValidation.normalizedPath) {
    throw new GitHubApiError("INVALID_INPUT", pathValidation.error || "Invalid script path.");
  }

  const safeOwner = encodeURIComponent(owner);
  const safeRepo = encodeURIComponent(repo);
  const safePath = pathValidation.normalizedPath
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  const url = `https://api.github.com/repos/${safeOwner}/${safeRepo}/contents/${safePath}?ref=${encodeURIComponent(commitSha)}`;
  const res = await fetchWithTimeout(url, getAuthHeaders());

  if (res.status === 404) {
    throw new GitHubApiError("NOT_FOUND", `Script '${scriptPath}' was not found at commit '${commitSha}'.`, 404);
  }

  if (!res.ok) {
    throw new GitHubApiError("API_ERROR", `Failed to fetch file content: HTTP ${res.status}.`, res.status);
  }

  const data = await res.json();
  if (data.type !== "file") {
    throw new GitHubApiError("INVALID_INPUT", `Target path '${scriptPath}' is not a regular file.`);
  }

  if (typeof data.size === "number" && data.size > MAX_FILE_SIZE_BYTES) {
    throw new GitHubApiError("FILE_TOO_LARGE", `File size (${data.size} bytes) exceeds limit of 1 MiB.`);
  }

  let textContent = "";
  if (data.encoding === "base64" && typeof data.content === "string") {
    const cleanBase64 = data.content.replace(/\s/g, "");
    textContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
  } else {
    throw new GitHubApiError("API_ERROR", "Unsupported file encoding from GitHub API.");
  }

  return {
    content: textContent,
    size: data.size,
  };
}
