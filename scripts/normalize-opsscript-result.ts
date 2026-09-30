import fs from "fs";
import { OpsScriptGateResultSchema, OpsScriptGateResult, RuntimeStatus, ALLOWED_DISTROS } from "../lib/schema";

export interface TrustedNormalizationMetadata {
  expectedOwner: string;
  expectedRepo: string;
  expectedCommitSha: string;
  expectedScriptPath: string;
  verifiedAt?: string;
}

export interface NativeOpsScriptDiagnostic {
  kind?: string;
  message?: string;
  command?: string;
  line?: number;
  distro?: string;
  hint?: string;
}

export interface NativeOpsScriptDistroResult {
  distro: string;
  status: "PASS" | "FAIL" | "TIMED_OUT" | "ERROR";
  exit_code: number;
  duration?: number;
  output_snippet?: string;
  error_message?: string;
  diagnostic?: NativeOpsScriptDiagnostic | null;
}

export interface NativeOpsScriptPayload {
  results?: NativeOpsScriptDistroResult[];
  total_duration?: number;
  all_passed?: boolean;
}

/**
 * 将 OpsScript Gate v0.4.1 原生 JSON 转换为 InstallReady 标准信封格式
 */
export function normalizeOpsScriptGateJson(
  nativeData: unknown,
  meta: TrustedNormalizationMetadata
): OpsScriptGateResult {
  if (!nativeData || typeof nativeData !== "object") {
    throw new Error("Invalid native OpsScript Gate payload: must be an object.");
  }

  const payload = nativeData as NativeOpsScriptPayload;
  if (!Array.isArray(payload.results) || payload.results.length === 0) {
    throw new Error("Invalid native OpsScript Gate payload: missing or empty 'results' array.");
  }

  const normalizedResults = payload.results.map((raw) => {
    // 验证 distro
    const distroName = raw.distro as (typeof ALLOWED_DISTROS)[number];
    if (!ALLOWED_DISTROS.includes(distroName)) {
      throw new Error(`Unsupported distro in native result: '${raw.distro}'`);
    }

    const duration = typeof raw.duration === "number" ? raw.duration : 0;
    const exitCode = typeof raw.exit_code === "number" ? raw.exit_code : 1;

    let status: RuntimeStatus = "ERROR";
    if (raw.status === "PASS") status = "PASS";
    else if (raw.status === "FAIL") status = "FAIL";
    else if (raw.status === "TIMED_OUT") status = "TIMED_OUT";
    else if (raw.status === "ERROR") status = "ERROR";

    const item: OpsScriptGateResult["results"][number] = {
      distro: distroName,
      status,
      exit_code: exitCode,
      duration_seconds: Number(duration.toFixed(3)),
    };

    if (raw.diagnostic?.command) {
      item.command_failed = String(raw.diagnostic.command).slice(0, 200);
    }
    if (typeof raw.diagnostic?.line === "number" && raw.diagnostic.line > 0) {
      item.line_number = raw.diagnostic.line;
    }
    const diagMsg = raw.diagnostic?.message || raw.error_message;
    if (diagMsg) {
      item.diagnostic = String(diagMsg).slice(0, 2000);
    }
    if (raw.diagnostic?.hint) {
      item.remediation_hint = String(raw.diagnostic.hint).slice(0, 2000);
    }
    if (raw.output_snippet) {
      item.output_snippet = String(raw.output_snippet).slice(0, 5000);
    }

    return item;
  });

  const total = normalizedResults.length;
  const passed = normalizedResults.filter((r) => r.status === "PASS").length;

  let summaryStatus: RuntimeStatus = "FAIL";
  if (passed === total && total > 0) {
    summaryStatus = "PASS";
  } else if (normalizedResults.some((r) => r.status === "TIMED_OUT")) {
    summaryStatus = "TIMED_OUT";
  } else if (normalizedResults.some((r) => r.status === "ERROR")) {
    summaryStatus = "ERROR";
  } else {
    summaryStatus = "FAIL";
  }

  const envelope = {
    schema_version: 1 as const,
    repository: `${meta.expectedOwner}/${meta.expectedRepo}`,
    commit_sha: meta.expectedCommitSha,
    script_path: meta.expectedScriptPath,
    verified_at: meta.verifiedAt || new Date().toISOString(),
    engine: {
      name: "OpsScript Gate" as const,
      version: "0.4.1" as const,
    },
    summary: {
      passed,
      total,
      status: summaryStatus,
      duration_seconds:
        typeof payload.total_duration === "number" ? Number(payload.total_duration.toFixed(3)) : 0,
    },
    results: normalizedResults,
  };

  // 通过严格的 Zod Schema 校验以确保产物完全合规
  return OpsScriptGateResultSchema.parse(envelope);
}

// 脚本 CLI 模式
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("normalize-opsscript-result.ts")) {
  const rawPath = process.env.RAW_JSON_PATH;
  const expectedOwner = process.env.EXPECTED_OWNER;
  const expectedRepo = process.env.EXPECTED_REPO;
  const expectedCommit = process.env.EXPECTED_COMMIT;
  const expectedScript = process.env.EXPECTED_SCRIPT;
  const outputPath = process.env.OUTPUT_PATH;

  if (!rawPath || !expectedOwner || !expectedRepo || !expectedCommit || !expectedScript || !outputPath) {
    console.error("Missing required environment variables for normalization.");
    process.exit(1);
  }

  try {
    const rawContent = fs.readFileSync(rawPath, "utf-8");
    const rawJson = JSON.parse(rawContent);

    const normalized = normalizeOpsScriptGateJson(rawJson, {
      expectedOwner,
      expectedRepo,
      expectedCommitSha: expectedCommit,
      expectedScriptPath: expectedScript,
    });

    fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), "utf-8");
    console.log(`Successfully normalized OpsScript Gate result to: ${outputPath}`);
  } catch (err) {
    console.error("Failed to normalize OpsScript Gate result:", err);
    process.exit(1);
  }
}
