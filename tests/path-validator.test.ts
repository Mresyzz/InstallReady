import { describe, it, expect } from "vitest";
import {
  validateRepositoryPath,
  generateScriptSlug,
  generateScriptResultFilename,
} from "../lib/path-validator";

describe("Strict Repository Path Validation", () => {
  it("accepts clean relative paths", () => {
    const r1 = validateRepositoryPath("install.sh");
    expect(r1.valid).toBe(true);
    expect(r1.normalizedPath).toBe("install.sh");

    const r2 = validateRepositoryPath("scripts/install.sh");
    expect(r2.valid).toBe(true);
    expect(r2.normalizedPath).toBe("scripts/install.sh");

    const r3 = validateRepositoryPath("tools/bootstrap/setup.sh");
    expect(r3.valid).toBe(true);
    expect(r3.normalizedPath).toBe("tools/bootstrap/setup.sh");
  });

  it("rejects directory traversal attempts with ..", () => {
    expect(validateRepositoryPath("../install.sh").valid).toBe(false);
    expect(validateRepositoryPath("scripts/../../etc/passwd").valid).toBe(false);
    expect(validateRepositoryPath("foo/../bar.sh").valid).toBe(false);
  });

  it("rejects absolute paths", () => {
    expect(validateRepositoryPath("/etc/install.sh").valid).toBe(false);
    expect(validateRepositoryPath("/install.sh").valid).toBe(false);
    expect(validateRepositoryPath("C:/Windows/setup.sh").valid).toBe(false);
  });

  it("rejects backslashes to prevent traversal bypass", () => {
    expect(validateRepositoryPath("scripts\\install.sh").valid).toBe(false);
    expect(validateRepositoryPath("..\\..\\secret.sh").valid).toBe(false);
  });

  it("rejects control characters and NUL bytes", () => {
    expect(validateRepositoryPath("install\0.sh").valid).toBe(false);
    expect(validateRepositoryPath("install\n.sh").valid).toBe(false);
    expect(validateRepositoryPath("install\r.sh").valid).toBe(false);
  });

  it("rejects URL schemes", () => {
    expect(validateRepositoryPath("http://evil.com/install.sh").valid).toBe(false);
    expect(validateRepositoryPath("https://evil.com/install.sh").valid).toBe(false);
    expect(validateRepositoryPath("file:///etc/passwd").valid).toBe(false);
  });

  it("rejects excessively long paths (> 255 chars)", () => {
    const longPath = "a/".repeat(130) + "install.sh";
    expect(validateRepositoryPath(longPath).valid).toBe(false);
  });
});

describe("Collision-Resistant Script Slug Generation", () => {
  it("proves distinct repository paths with same basename cannot collide or overwrite each other", () => {
    const filename1 = generateScriptResultFilename("install.sh");
    const filename2 = generateScriptResultFilename("scripts/install.sh");
    const filename3 = generateScriptResultFilename("pkg/installer/install.sh");

    expect(filename1).not.toBe(filename2);
    expect(filename2).not.toBe(filename3);
    expect(filename1).not.toBe(filename3);

    expect(filename1).toMatch(/^install\.sh-[0-9a-f]{16}\.json$/);
    expect(filename2).toMatch(/^install\.sh-[0-9a-f]{16}\.json$/);
    expect(filename3).toMatch(/^install\.sh-[0-9a-f]{16}\.json$/);
  });

  it("proves distinct paths with inverted parts cannot collide or overwrite each other", () => {
    const f1 = generateScriptResultFilename("scripts/install.sh");
    const f2 = generateScriptResultFilename("install/scripts.sh");
    expect(f1).not.toBe(f2);
  });

  it("produces deterministic filenames for identical paths", () => {
    const f1 = generateScriptSlug("scripts/bootstrap.sh");
    const f2 = generateScriptSlug("scripts/bootstrap.sh");
    expect(f1).toBe(f2);
  });
});
