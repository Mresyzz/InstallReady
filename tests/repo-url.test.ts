import { describe, it, expect } from "vitest";
import { parseAndValidateGitHubUrl, validateFullCommitSha } from "../lib/repo-url";

describe("GitHub Repository URL Normalization & SSRF Prevention", () => {
  it("normalizes standard https github URL", () => {
    const res = parseAndValidateGitHubUrl("https://github.com/Mresyzz/opsscript-gate");
    expect(res.valid).toBe(true);
    expect(res.owner).toBe("Mresyzz");
    expect(res.repo).toBe("opsscript-gate");
  });

  it("normalizes github.com domain prefix without scheme", () => {
    const res = parseAndValidateGitHubUrl("github.com/nvm-sh/nvm");
    expect(res.valid).toBe(true);
    expect(res.owner).toBe("nvm-sh");
    expect(res.repo).toBe("nvm");
  });

  it("normalizes plain owner/repo shorthand", () => {
    const res = parseAndValidateGitHubUrl("docker/docker-install");
    expect(res.valid).toBe(true);
    expect(res.owner).toBe("docker");
    expect(res.repo).toBe("docker-install");
  });

  it("strips trailing slashes and .git extensions", () => {
    const res = parseAndValidateGitHubUrl("https://github.com/ohmyzsh/ohmyzsh.git/");
    expect(res.valid).toBe(true);
    expect(res.owner).toBe("ohmyzsh");
    expect(res.repo).toBe("ohmyzsh");
  });

  it("rejects non-GitHub domains to prevent SSRF", () => {
    expect(parseAndValidateGitHubUrl("https://gitlab.com/owner/repo").valid).toBe(false);
    expect(parseAndValidateGitHubUrl("https://bitbucket.org/owner/repo").valid).toBe(false);
    expect(parseAndValidateGitHubUrl("https://evil.attacker.com/owner/repo").valid).toBe(false);
  });

  it("rejects malformed inputs and path injections", () => {
    expect(parseAndValidateGitHubUrl("").valid).toBe(false);
    expect(parseAndValidateGitHubUrl("just-a-string").valid).toBe(false);
    expect(parseAndValidateGitHubUrl("owner/repo/subpath").valid).toBe(false);
    expect(parseAndValidateGitHubUrl("owner/../evil").valid).toBe(false);
  });
});

describe("Strict 40-Character Commit SHA Validation", () => {
  it("accepts valid full 40-character hex commit SHA", () => {
    expect(validateFullCommitSha("eb41fd07a3dd641f4a347c6213302ef1b6f6eb71")).toBe(true);
    expect(validateFullCommitSha("2222222222222222222222222222222222222222")).toBe(true);
  });

  it("strictly rejects 7-39 character abbreviated SHAs", () => {
    expect(validateFullCommitSha("eb41fd0")).toBe(false);
    expect(validateFullCommitSha("2222222")).toBe(false);
    expect(validateFullCommitSha("eb41fd07a3dd641f4a347c6213302ef1b6f6eb7")).toBe(false); // 39 chars
  });

  it("strictly rejects branch names, HEAD, and tags", () => {
    expect(validateFullCommitSha("main")).toBe(false);
    expect(validateFullCommitSha("master")).toBe(false);
    expect(validateFullCommitSha("HEAD")).toBe(false);
    expect(validateFullCommitSha("v0.4.1")).toBe(false);
    expect(validateFullCommitSha("refs/heads/main")).toBe(false);
  });
});
