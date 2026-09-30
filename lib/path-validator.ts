import { createHash } from "crypto";

export interface PathValidationResult {
  valid: boolean;
  normalizedPath?: string;
  error?: string;
}

/**
 * 校验用户控制的脚本相对路径，坚决杜绝目录遍历、绝对路径、反斜杠、URL、控制字符与超长攻击。
 */
export function validateRepositoryPath(inputPath: string): PathValidationResult {
  if (typeof inputPath !== "string") {
    return { valid: false, error: "Path must be a string." };
  }

  const trimmed = inputPath.trim();
  if (!trimmed) {
    return { valid: false, error: "Path cannot be empty." };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: "Path exceeds maximum allowed length of 255 characters." };
  }

  // 严格拦截控制字符和 NUL 字节
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return { valid: false, error: "Path contains illegal control characters." };
  }

  // 拦截反斜杠（防止 Windows 路径穿越绕过）
  if (trimmed.includes("\\")) {
    return { valid: false, error: "Backslashes are not permitted in repository-relative paths." };
  }

  // 拦截绝对路径（以 / 开头）或 Windows 盘符（如 C:）
  if (trimmed.startsWith("/") || /^[a-zA-Z]:/.test(trimmed)) {
    return { valid: false, error: "Absolute paths are not permitted." };
  }

  // 拦截 URL 协议头 (http:, https:, file:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+-.]*:/.test(trimmed)) {
    return { valid: false, error: "URL schemes are not permitted." };
  }

  // 分解各路径段，严格检查遍历
  const segments = trimmed.split("/");
  const normalizedSegments: string[] = [];

  for (const seg of segments) {
    if (seg === "" || seg === ".") {
      // 忽略连续斜杠或当前目录段
      continue;
    }
    if (seg === "..") {
      return { valid: false, error: "Directory traversal (..) is not permitted." };
    }
    // 限制单段字符集：字母、数字、点、下划线、短横线、加号
    if (!/^[a-zA-Z0-9._\-+]+$/.test(seg)) {
      return { valid: false, error: `Invalid character in path segment '${seg}'.` };
    }
    normalizedSegments.push(seg);
  }

  if (normalizedSegments.length === 0) {
    return { valid: false, error: "Normalized path is empty." };
  }

  const normalizedPath = normalizedSegments.join("/");
  return {
    valid: true,
    normalizedPath,
  };
}

/**
 * 为脚本路径生成抗冲突的持久化 Slug 文件名：
 * <sanitized-basename>-<sha256(scriptPath)[0:16]>
 */
export function generateScriptSlug(scriptPath: string): string {
  const validation = validateRepositoryPath(scriptPath);
  const safePath = validation.valid && validation.normalizedPath ? validation.normalizedPath : scriptPath;
  
  const rawBase = safePath.split("/").pop() || "script";
  // 清洗文件名，仅保留安全字符
  const sanitizedBase = rawBase.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
  
  const hash = createHash("sha256").update(safePath).digest("hex").slice(0, 16);
  return `${sanitizedBase}-${hash}`;
}

/**
 * 构造运行时结果文件名
 */
export function generateScriptResultFilename(scriptPath: string): string {
  return `${generateScriptSlug(scriptPath)}.json`;
}
