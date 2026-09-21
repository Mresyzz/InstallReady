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
      passed: 1,
      total: 1,
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
    expect(res.data?.engine.version).toBe("0.4.1");
  });

  it("accepts TIMED_OUT status when properly summarized", () => {
    const timedOutJson = JSON.stringify({
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
        passed: 0,
        total: 1,
        status: "TIMED_OUT",
        duration_seconds: 60.0,
      },
      results: [
        {
          distro: "debian:12-slim",
          status: "TIMED_OUT",
          exit_code: 124,
          duration_seconds: 60.0,
          diagnostic: "Command exceeded execution timeout",
        },
      ],
    });

    const res = validateUntrustedArtifactJson(timedOutJson, validOptions);
    expect(res.valid).toBe(true);
    expect(res.data?.summary.status).toBe("TIMED_OUT");
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

  it("rejects unauthorized engine version", () => {
    const tampered = JSON.parse(validJson);
    tampered.engine.version = "0.5.0";
    const res = validateUntrustedArtifactJson(JSON.stringify(tampered), validOptions);
    expect(res.valid).toBe(false);
  });

  it("rejects unauthorized distro name", () => {
    const tampered = JSON.parse(validJson);
    tampered.results[0].distro = "ubuntu:latest";
    const res = validateUntrustedArtifactJson(JSON.stringify(tampered), validOptions);
    expect(res.valid).toBe(false);
  });

  it("rejects duplicate distros in results array", () => {
    const tampered = JSON.parse(validJson);
    tampered.results.push({
      distro: "debian:12-slim",
      status: "PASS",
      exit_code: 0,
      duration_seconds: 0.2,
    });
    tampered.summary.total = 2;
    tampered.summary.passed = 2;
    const res = validateUntrustedArtifactJson(JSON.stringify(tampered), validOptions);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Duplicate distro entries found in results");
  });

  it("rejects summary total mismatch", () => {
    const tampered = JSON.parse(validJson);
    tampered.summary.total = 5; // results length is 1
    const res = validateUntrustedArtifactJson(JSON.stringify(tampered), validOptions);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("summary.total must equal the number of entries in results");
  });

  it("rejects summary passed count mismatch", () => {
    const tampered = JSON.parse(validJson);
    tampered.summary.passed = 0; // result status is PASS, so passed should be 1
    const res = validateUntrustedArtifactJson(JSON.stringify(tampered), validOptions);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("summary.passed must equal the exact count");
  });

  it("rejects summary status PASS when a result has failed", () => {
    const tampered = JSON.parse(validJson);
    tampered.results.push({
      distro: "alpine:3.20",
      status: "FAIL",
      exit_code: 1,
      duration_seconds: 0.2,
    });
    tampered.summary.total = 2;
    tampered.summary.passed = 1;
    tampered.summary.status = "PASS"; // Inconsistent!
    const res = validateUntrustedArtifactJson(JSON.stringify(tampered), validOptions);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("summary.status is inconsistent");
  });
});
