import { describe, it, expect } from "vitest";
import { validateUntrustedArtifactJson } from "../lib/schema";

describe("Untrusted Artifact Schema Validation Boundary", () => {
  const validJson = JSON.stringify({
    schema_version: 1,
    repository: "owner/repo",
    commit_sha: "1111111111111111111111111111111111111111",
    script_path: "install.sh",
    verified_at: "2026-09-19T12:00:00.000Z",
    engine: {
      name: "OpsScript Gate",
      version: "0.4.1",
    },
    summary: {
      passed: 4,
      total: 4,
      status: "PASS",
      duration_seconds: 1.2,
    },
    results: [
      {
        distro: "debian:12-slim",
        status: "PASS",
        exit_code: 0,
        duration_seconds: 0.3,
      },
    ],
  });

  const validOptions = {
    expectedOwner: "owner",
    expectedRepo: "repo",
    expectedCommitSha: "1111111111111111111111111111111111111111",
    expectedScriptPath: "install.sh",
  };

  it("accepts conforming OpsScript Gate result JSON", () => {
    const res = validateUntrustedArtifactJson(validJson, validOptions);
    expect(res.valid).toBe(true);
    expect(res.data?.engine.name).toBe("OpsScript Gate");
  });

  it("rejects repository mismatch spoofing", () => {
    const res = validateUntrustedArtifactJson(validJson, {
      ...validOptions,
      expectedOwner: "other-owner",
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain("does not match expected");
  });

  it("rejects commit SHA mismatch spoofing", () => {
    const res = validateUntrustedArtifactJson(validJson, {
      ...validOptions,
      expectedCommitSha: "2222222222222222222222222222222222222222",
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain("commit_sha");
  });

  it("rejects script path mismatch spoofing", () => {
    const res = validateUntrustedArtifactJson(validJson, {
      ...validOptions,
      expectedScriptPath: "scripts/bootstrap.sh",
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain("script_path");
  });

  it("rejects oversized JSON exceeding limit", () => {
    const huge = " ".repeat(100) + validJson;
    const res = validateUntrustedArtifactJson(huge, {
      ...validOptions,
      maxJsonSizeBytes: 50,
    });
    expect(res.valid).toBe(false);
    expect(res.error).toContain("exceeds maximum size limit");
  });

  it("rejects illegal engine name", () => {
    const tampered = JSON.parse(validJson);
    tampered.engine.name = "Fake Engine";
    const res = validateUntrustedArtifactJson(JSON.stringify(tampered), validOptions);
    expect(res.valid).toBe(false);
  });
});
