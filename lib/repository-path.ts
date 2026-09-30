export interface PathValidationResult {
  valid: boolean;
  normalizedPath?: string;
  error?: string;
}

export function validateRepositoryPath(inputPath: string): PathValidationResult {
  if (typeof inputPath !== "string") return { valid: false, error: "Path must be a string." };
  const trimmed = inputPath.trim();
  if (!trimmed) return { valid: false, error: "Path cannot be empty." };
  if (trimmed.length > 255) return { valid: false, error: "Path exceeds maximum allowed length of 255 characters." };
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return { valid: false, error: "Path contains illegal control characters." };
  if (trimmed.includes("\\")) return { valid: false, error: "Backslashes are not permitted in repository-relative paths." };
  if (trimmed.startsWith("/") || /^[a-zA-Z]:/.test(trimmed)) return { valid: false, error: "Absolute paths are not permitted." };
  if (/^[a-zA-Z][a-zA-Z0-9+-.]*:/.test(trimmed)) return { valid: false, error: "URL schemes are not permitted." };
  const segments = trimmed.split("/");
  const normalizedSegments: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") return { valid: false, error: "Directory traversal (..) is not permitted." };
    if (!/^[a-zA-Z0-9._\-+]+$/.test(segment)) return { valid: false, error: `Invalid character in path segment '${segment}'.` };
    normalizedSegments.push(segment);
  }
  if (!normalizedSegments.length) return { valid: false, error: "Normalized path is empty." };
  return { valid: true, normalizedPath: normalizedSegments.join("/") };
}
