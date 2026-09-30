import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { validateRuntimeTarget, ShowcaseConfig } from "../lib/runtime-target";

describe("Trusted Runtime Target & Path Authorization Boundary", () => {
  const mockShowcaseConfig: ShowcaseConfig = {
    repositories: [
      {
        owner: "Mresyzz",
        repo: "opsscript-gate",
        verificationType: "static_only",
        runtimeEnabled: false,
        runtimeScripts: [],
      },
      {
        owner: "TrustedOrg",
        repo: "verified-installer",
        verificationType: "runtime_verified",
        runtimeEnabled: true,
        runtimeScripts: ["install.sh", "scripts/setup.sh"],
      },
    ],
  };

  // 1. mixed-case owner/repo normalizes to lowercase storage path
  it("1. normalizes mixed-case owner and repo to lowercase storage paths", () => {
    const res = validateRuntimeTarget({
      rawRepo: "TrustedOrg/Verified-Installer",
      rawScript: "install.sh",
      showcaseConfig: mockShowcaseConfig,
    });

    expect(res.owner).toBe("TrustedOrg");
    expect(res.repo).toBe("verified-installer");
    expect(res.targetOwnerNormalized).toBe("trustedorg");
    expect(res.targetRepoNormalized).toBe("verified-installer");
  });

  // 2. runtimeEnabled:false → runtime execution rejected
  it("2. rejects runtime execution when runtimeEnabled is false", () => {
    expect(() =>
      validateRuntimeTarget({
        rawRepo: "Mresyzz/opsscript-gate",
        rawScript: "install.sh",
        showcaseConfig: mockShowcaseConfig,
      })
    ).toThrow(/runtimeEnabled is false/);
  });

  // 3. valid repository but script not in runtimeScripts → rejected
  it("3. rejects valid repository when requested script is not in runtimeScripts allowlist", () => {
    expect(() =>
      validateRuntimeTarget({
        rawRepo: "TrustedOrg/verified-installer",
        rawScript: "deploy.sh",
        showcaseConfig: mockShowcaseConfig,
      })
    ).toThrow(/not an explicitly authorized runtime script/);
  });

  // 4. path traversal script → rejected
  it("4. rejects path traversal in script path before any execution", () => {
    expect(() =>
      validateRuntimeTarget({
        rawRepo: "TrustedOrg/verified-installer",
        rawScript: "../etc/passwd",
        showcaseConfig: mockShowcaseConfig,
      })
    ).toThrow(/Directory traversal/);

    expect(() =>
      validateRuntimeTarget({
        rawRepo: "TrustedOrg/verified-installer",
        rawScript: "scripts/../../install.sh",
        showcaseConfig: mockShowcaseConfig,
      })
    ).toThrow(/Directory traversal/);
  });

  // 5. absolute script path → rejected
  it("5. rejects absolute script paths before any execution", () => {
    expect(() =>
      validateRuntimeTarget({
        rawRepo: "TrustedOrg/verified-installer",
        rawScript: "/install.sh",
        showcaseConfig: mockShowcaseConfig,
      })
    ).toThrow(/Absolute paths are not permitted/);

    expect(() =>
      validateRuntimeTarget({
        rawRepo: "TrustedOrg/verified-installer",
        rawScript: "C:/install.sh",
        showcaseConfig: mockShowcaseConfig,
      })
    ).toThrow(/Absolute paths are not permitted/);
  });

  // 6. trusted runtimeScript → accepted
  it("6. accepts authorized script in explicitly enabled repository", () => {
    const res = validateRuntimeTarget({
      rawRepo: "TrustedOrg/verified-installer",
      rawScript: "scripts/setup.sh",
      showcaseConfig: mockShowcaseConfig,
    });

    expect(res.scriptPath).toBe("scripts/setup.sh");
    expect(res.owner).toBe("TrustedOrg");
  });

  // 7. unknown repo → rejected
  it("7. rejects repositories not present in trusted showcase allowlist", () => {
    expect(() =>
      validateRuntimeTarget({
        rawRepo: "attacker-org/malicious-repo",
        rawScript: "install.sh",
        showcaseConfig: mockShowcaseConfig,
      })
    ).toThrow(/NOT in the trusted showcase allowlist/);
  });

  // 8. scheduled execution no longer exists in workflow YAML
  it("8. verifies scheduled triggers are completely removed from showcase-runtime.yml", () => {
    const workflowPath = path.resolve(process.cwd(), ".github/workflows/showcase-runtime.yml");
    const workflowContent = fs.readFileSync(workflowPath, "utf-8");

    // 严禁存在 schedule: 或 cron:
    expect(workflowContent).not.toMatch(/^\s*schedule:\s*$/m);
    expect(workflowContent).not.toMatch(/^\s*-\s*cron:\s*.*$/m);

    // 必须仅有 workflow_dispatch
    expect(workflowContent).toMatch(/workflow_dispatch:\s*\n\s*inputs:/);

    // inputs 必须为必填且无假默认值
    expect(workflowContent).not.toContain("default: 'Mresyzz/opsscript-gate'");
    expect(workflowContent).not.toContain("default: 'install.sh'");
  });

  // 9. runtime target metadata comes from trusted config
  it("9. derives target owner and repo strictly from trusted showcase configuration", () => {
    const res = validateRuntimeTarget({
      rawRepo: "TRUSTEDORG/VERIFIED-INSTALLER",
      rawScript: "install.sh",
      showcaseConfig: mockShowcaseConfig,
    });

    // 保证来源于受信任配置条目而不是攻击者提供的任意大小写
    expect(res.owner).toBe("TrustedOrg");
    expect(res.repo).toBe("verified-installer");
    expect(res.targetOwnerNormalized).toBe("trustedorg");
    expect(res.targetRepoNormalized).toBe("verified-installer");
  });

  // 10. output result path is deterministic
  it("10. generates deterministic, collision-resistant, lowercase relative result path", () => {
    const res = validateRuntimeTarget({
      rawRepo: "TrustedOrg/verified-installer",
      rawScript: "scripts/setup.sh",
      showcaseConfig: mockShowcaseConfig,
    });

    const commitSha = "0123456789abcdef0123456789abcdef01234567";
    const path1 = res.getDeterministicRelativePath(commitSha);
    const path2 = res.getDeterministicRelativePath(commitSha);

    expect(path1).toBe(path2);
    expect(path1).toMatch(
      /^trustedorg\/verified-installer\/0123456789abcdef0123456789abcdef01234567\/setup\.sh-[0-9a-f]{16}\.json$/
    );
  });
});
