import { z } from "zod";
import { validateFullCommitSha } from "./repo-url";
import { validateRepositoryPath } from "./path-validator";

export const ALLOWED_DISTROS = [
  "debian:12-slim",
  "debian:12",
  "ubuntu:22.04",
  "ubuntu:24.04",
  "alpine:3.20",
] as const;

export const RUNTIME_STATUS_ENUM = ["PASS", "FAIL", "TIMED_OUT", "ERROR"] as const;
export type RuntimeStatus = (typeof RUNTIME_STATUS_ENUM)[number];

export const ALLOWED_ENGINE_VERSIONS = ["0.4.1"] as const;

export const DistroResultSchema = z.object({
  distro: z.enum(ALLOWED_DISTROS),
  status: z.enum(RUNTIME_STATUS_ENUM),
  exit_code: z.number().int().min(0).max(255),
  duration_seconds: z.number().min(0).max(600),
  command_failed: z.string().max(200).optional(),
  line_number: z.number().int().positive().max(100000).optional(),
  diagnostic: z.string().max(2000).optional(),
  remediation_hint: z.string().max(2000).optional(),
  output_snippet: z.string().max(5000).optional(),
});

export type DistroResult = z.infer<typeof DistroResultSchema>;

export const OpsScriptGateResultSchema = z
  .object({
    schema_version: z.literal(1),
    repository: z.string().max(150),
    commit_sha: z.string().refine(validateFullCommitSha, {
      message: "commit_sha must be a full 40-character hex string",
    }),
    script_path: z.string().max(255).refine((p) => validateRepositoryPath(p).valid, {
      message: "script_path must be a safe repository-relative path",
    }),
    verified_at: z.string().datetime(),
    engine: z.object({
      name: z.literal("OpsScript Gate"),
      version: z.enum(ALLOWED_ENGINE_VERSIONS),
    }),
    summary: z.object({
      passed: z.number().int().min(0),
      total: z.number().int().min(1),
      status: z.enum(RUNTIME_STATUS_ENUM),
      duration_seconds: z.number().min(0).max(3600).optional(),
    }),
    results: z.array(DistroResultSchema).min(1).max(20),
  })
  .refine(
    (data) => {
      const distros = data.results.map((r) => r.distro);
      return new Set(distros).size === distros.length;
    },
    { message: "Duplicate distro entries found in results" }
  )
  .refine((data) => data.summary.total === data.results.length, {
    message: "summary.total must equal the number of entries in results",
  })
  .refine(
    (data) => {
      const actualPassed = data.results.filter((r) => r.status === "PASS").length;
      return data.summary.passed === actualPassed;
    },
    { message: "summary.passed must equal the exact count of results with status 'PASS'" }
  )
  .refine((data) => data.summary.passed <= data.summary.total, {
    message: "summary.passed cannot exceed summary.total",
  })
  .refine(
    (data) => {
      const hasFailures = data.results.some((r) => r.status !== "PASS");
      if (!hasFailures && data.summary.status !== "PASS") return false;
      if (hasFailures && data.summary.status === "PASS") return false;
      return true;
    },
    { message: "summary.status is inconsistent with results status" }
  );

export type OpsScriptGateResult = z.infer<typeof OpsScriptGateResultSchema>;

export interface UntrustedArtifactValidationOptions {
  expectedOwner: string;
  expectedRepo: string;
  expectedCommitSha: string;
  expectedScriptPath: string;
  maxJsonSizeBytes?: number; // 默认 512KB
}

/**
 * 校验来自外部构件的未受信 JSON。
 * 杜绝伪造 owner/repo/sha/path，校验 Schema、字段长度及体积。
 */
export function validateUntrustedArtifactJson(
  rawJsonString: string,
  options: UntrustedArtifactValidationOptions
): { valid: boolean; data?: OpsScriptGateResult; error?: string } {
  const maxBytes = options.maxJsonSizeBytes ?? 512 * 1024;
  if (Buffer.byteLength(rawJsonString, "utf8") > maxBytes) {
    return { valid: false, error: `Artifact JSON exceeds maximum size limit of ${maxBytes} bytes.` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonString);
  } catch {
    return { valid: false, error: "Malformed JSON content in artifact." };
  }

  const parseResult = OpsScriptGateResultSchema.safeParse(parsed);
  if (!parseResult.success) {
    return {
      valid: false,
      error: `Artifact schema validation failed: ${parseResult.error.issues.map((i) => i.message).join("; ")}`,
    };
  }

  const data = parseResult.data;
  const expectedRepoFull = `${options.expectedOwner}/${options.expectedRepo}`.toLowerCase();
  if (data.repository.toLowerCase() !== expectedRepoFull) {
    return {
      valid: false,
      error: `Artifact repository '${data.repository}' does not match expected '${expectedRepoFull}'.`,
    };
  }

  if (data.commit_sha.toLowerCase() !== options.expectedCommitSha.toLowerCase()) {
    return {
      valid: false,
      error: `Artifact commit_sha '${data.commit_sha}' does not match expected '${options.expectedCommitSha}'.`,
    };
  }

  const normalizedExpectedScript = validateRepositoryPath(options.expectedScriptPath).normalizedPath;
  const normalizedDataScript = validateRepositoryPath(data.script_path).normalizedPath;
  if (normalizedDataScript !== normalizedExpectedScript) {
    return {
      valid: false,
      error: `Artifact script_path '${data.script_path}' does not match expected '${options.expectedScriptPath}'.`,
    };
  }

  return { valid: true, data };
}
