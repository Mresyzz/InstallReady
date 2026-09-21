import { describe, it, expect } from "vitest";
import { normalizeOpsScriptGateJson, NativeOpsScriptPayload } from "../scripts/normalize-opsscript-result";

describe("OpsScript Gate Native JSON Normalizer", () => {
  const meta = {
    expectedOwner: "Mresyzz",
    expectedRepo: "opsscript-gate",
    expectedCommitSha: "0123456789abcdef0123456789abcdef01234567",
    expectedScriptPath: "install.sh",
  };

  it("normalizes fully passing native OpsScript Gate payload", () => {
    const native: NativeOpsScriptPayload = {
      total_duration: 3.456,
      all_passed: true,
      results: [
        {
          distro: "debian:12-slim",
          status: "PASS",
          exit_code: 0,
          duration: 0.812,
          output_snippet: "Installation successful",
        },
        {
          distro: "ubuntu:22.04",
          status: "PASS",
          exit_code: 0,
          duration: 0.945,
        },
        {
          distro: "ubuntu:24.04",
          status: "PASS",
          exit_code: 0,
          duration: 0.887,
        },
        {
          distro: "alpine:3.20",
          status: "PASS",
          exit_code: 0,
          duration: 0.812,
        },
      ],
    };

    const normalized = normalizeOpsScriptGateJson(native, meta);
    expect(normalized.schema_version).toBe(1);
    expect(normalized.repository).toBe("Mresyzz/opsscript-gate");
    expect(normalized.commit_sha).toBe(meta.expectedCommitSha);
    expect(normalized.script_path).toBe("install.sh");
    expect(normalized.engine.name).toBe("OpsScript Gate");
    expect(normalized.engine.version).toBe("0.4.1");
    expect(normalized.summary.passed).toBe(4);
    expect(normalized.summary.total).toBe(4);
    expect(normalized.summary.status).toBe("PASS");
    expect(normalized.summary.duration_seconds).toBe(3.456);
    expect(normalized.results.length).toBe(4);
  });

  it("normalizes failing native payload with diagnostics", () => {
    const native: NativeOpsScriptPayload = {
      total_duration: 2.1,
      results: [
        {
          distro: "debian:12-slim",
          status: "PASS",
          exit_code: 0,
          duration: 0.5,
        },
        {
          distro: "alpine:3.20",
          status: "FAIL",
          exit_code: 127,
          duration: 0.4,
          output_snippet: "install.sh: line 12: apt-get: not found",
          diagnostic: {
            kind: "package_manager_assumption",
            command: "apt-get update",
            line: 12,
            distro: "alpine:3.20",
            message: "apt-get is not installed on alpine:3.20",
            hint: "Use apk add instead of apt-get on Alpine Linux",
          },
        },
      ],
    };

    const normalized = normalizeOpsScriptGateJson(native, meta);
    expect(normalized.summary.passed).toBe(1);
    expect(normalized.summary.total).toBe(2);
    expect(normalized.summary.status).toBe("FAIL");

    const alpine = normalized.results.find((r) => r.distro === "alpine:3.20");
    expect(alpine).toBeDefined();
    expect(alpine?.status).toBe("FAIL");
    expect(alpine?.exit_code).toBe(127);
    expect(alpine?.command_failed).toBe("apt-get update");
    expect(alpine?.line_number).toBe(12);
    expect(alpine?.diagnostic).toBe("apt-get is not installed on alpine:3.20");
    expect(alpine?.remediation_hint).toContain("apk add");
    expect(alpine?.output_snippet).toContain("apt-get: not found");
  });

  it("handles TIMED_OUT status correctly", () => {
    const native: NativeOpsScriptPayload = {
      total_duration: 60.1,
      results: [
        {
          distro: "debian:12-slim",
          status: "PASS",
          exit_code: 0,
          duration: 1.2,
        },
        {
          distro: "ubuntu:22.04",
          status: "TIMED_OUT",
          exit_code: 124,
          duration: 60.0,
          error_message: "Execution exceeded 60s timeout",
        },
      ],
    };

    const normalized = normalizeOpsScriptGateJson(native, meta);
    expect(normalized.summary.status).toBe("TIMED_OUT");
    expect(normalized.summary.passed).toBe(1);
    expect(normalized.summary.total).toBe(2);

    const timedOutDistro = normalized.results.find((r) => r.distro === "ubuntu:22.04");
    expect(timedOutDistro?.status).toBe("TIMED_OUT");
    expect(timedOutDistro?.diagnostic).toContain("Execution exceeded 60s timeout");
  });

  it("handles ERROR status correctly", () => {
    const native: NativeOpsScriptPayload = {
      total_duration: 0.1,
      results: [
        {
          distro: "alpine:3.20",
          status: "ERROR",
          exit_code: 1,
          duration: 0.05,
          error_message: "Failed to pull container image",
        },
      ],
    };

    const normalized = normalizeOpsScriptGateJson(native, meta);
    expect(normalized.summary.status).toBe("ERROR");
    expect(normalized.summary.passed).toBe(0);
    expect(normalized.results[0].status).toBe("ERROR");
    expect(normalized.results[0].diagnostic).toBe("Failed to pull container image");
  });

  it("rejects invalid payloads missing results array", () => {
    expect(() => normalizeOpsScriptGateJson(null, meta)).toThrow();
    expect(() => normalizeOpsScriptGateJson({}, meta)).toThrow();
    expect(() => normalizeOpsScriptGateJson({ results: [] }, meta)).toThrow();
  });

  it("rejects unsupported distros", () => {
    const native: NativeOpsScriptPayload = {
      results: [
        {
          distro: "archlinux:latest",
          status: "PASS",
          exit_code: 0,
        },
      ],
    };
    expect(() => normalizeOpsScriptGateJson(native, meta)).toThrow(/Unsupported distro/);
  });

  it("rejects duplicate distro results via strict schema parse", () => {
    const native: NativeOpsScriptPayload = {
      results: [
        {
          distro: "debian:12-slim",
          status: "PASS",
          exit_code: 0,
        },
        {
          distro: "debian:12-slim",
          status: "PASS",
          exit_code: 0,
        },
      ],
    };
    expect(() => normalizeOpsScriptGateJson(native, meta)).toThrow();
  });

  it("truncates excessively long diagnostic strings", () => {
    const native: NativeOpsScriptPayload = {
      results: [
        {
          distro: "debian:12-slim",
          status: "FAIL",
          exit_code: 1,
          diagnostic: {
            message: "x".repeat(3000),
            command: "y".repeat(500),
            hint: "z".repeat(3000),
          },
          output_snippet: "w".repeat(7000),
        },
      ],
    };

    const normalized = normalizeOpsScriptGateJson(native, meta);
    const item = normalized.results[0];
    expect(item.diagnostic?.length).toBeLessThanOrEqual(2000);
    expect(item.command_failed?.length).toBeLessThanOrEqual(200);
    expect(item.remediation_hint?.length).toBeLessThanOrEqual(2000);
    expect(item.output_snippet?.length).toBeLessThanOrEqual(5000);
  });
});
