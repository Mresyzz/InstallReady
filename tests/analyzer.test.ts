import { describe, it, expect } from "vitest";
import { analyzeShellScript } from "../lib/analyzer";

describe("Static Shell Installer Analyzer & Fixtures Verification", () => {
  // Fixture A: Portable installer
  it("Fixture A: portable installer reports Likely compatible across all distros", () => {
    const script = `#!/bin/sh
set -e
echo "Installing application..."
mkdir -p /opt/app
echo "Done."`;

    const report = analyzeShellScript("install.sh", script);
    expect(report.findings.filter((f) => f.severity === "warning").length).toBe(0);

    for (const status of report.distroCompatibility) {
      expect(status.status).toBe("Likely compatible");
    }
  });

  // Fixture B: Debian-only assumption
  it("Fixture B: Debian-only assumption warns on Alpine", () => {
    const script = `#!/bin/sh
set -e
apt-get update
apt-get install -y curl`;

    const report = analyzeShellScript("install.sh", script);
    const alpineStatus = report.distroCompatibility.find((d) => d.distro === "alpine:3.20");
    const debianStatus = report.distroCompatibility.find((d) => d.distro === "debian:12-slim");

    expect(alpineStatus?.status).toBe("Potential issue");
    expect(debianStatus?.status).toBe("Likely compatible");

    const aptFinding = report.findings.find((f) => f.command.includes("apt-get"));
    expect(aptFinding).toBeDefined();
    expect(aptFinding?.line).toBe(3);
    expect(aptFinding?.affected_distros).toContain("alpine:3.20");
    expect(aptFinding?.hint).toContain("apk");
  });

  // Fixture C: Alpine-only assumption
  it("Fixture C: Alpine-only assumption warns on Debian and Ubuntu", () => {
    const script = `#!/bin/sh
set -e
apk add curl git`;

    const report = analyzeShellScript("install.sh", script);
    const alpineStatus = report.distroCompatibility.find((d) => d.distro === "alpine:3.20");
    const debianStatus = report.distroCompatibility.find((d) => d.distro === "debian:12-slim");
    const ubuntuStatus = report.distroCompatibility.find((d) => d.distro === "ubuntu:22.04");

    expect(alpineStatus?.status).toBe("Likely compatible");
    expect(debianStatus?.status).toBe("Potential issue");
    expect(ubuntuStatus?.status).toBe("Potential issue");

    const apkFinding = report.findings.find((f) => f.command.includes("apk"));
    expect(apkFinding).toBeDefined();
    expect(apkFinding?.affected_distros).toContain("debian:12-slim");
  });

  // Fixture D: bash-specific
  it("Fixture D: bash-specific syntax under #!/bin/sh notes shell assumption", () => {
    const script = `#!/bin/sh
arr=(a b c)
echo "\${arr[0]}"`;

    const report = analyzeShellScript("install.sh", script);
    const bashFinding = report.findings.find((f) => f.kind === "shell_assumption");
    expect(bashFinding).toBeDefined();
    expect(bashFinding?.affected_distros).toContain("alpine:3.20");
  });

  // Case A: guarded branches do NOT warn
  it("Case A: guarded branches do NOT warn on package manager assumptions", () => {
    const script = `#!/bin/sh
if command -v apt-get >/dev/null 2>&1; then
  apt-get update && apt-get install -y curl
elif command -v apk >/dev/null 2>&1; then
  apk add curl
else
  echo "Unsupported OS"
  exit 1
fi`;

    const report = analyzeShellScript("install.sh", script);
    const warnings = report.findings.filter((f) => f.kind === "package_manager_assumption");
    expect(warnings.length).toBe(0);

    for (const status of report.distroCompatibility) {
      expect(status.status).toBe("Likely compatible");
    }
  });

  // Case B: unconditional apt-get after detection DOES warn
  it("Case B: unconditional apt-get after detection DOES warn", () => {
    const script = `#!/bin/sh
if command -v brew >/dev/null 2>&1; then
  brew install curl
fi
apt-get install -y curl`;

    const report = analyzeShellScript("install.sh", script);
    const aptFinding = report.findings.find((f) => f.command.includes("apt-get"));
    expect(aptFinding).toBeDefined();
    expect(aptFinding?.line).toBe(5);
    expect(aptFinding?.affected_distros).toContain("alpine:3.20");
  });

  // Case C: commented-out guards do NOT protect unconditional commands
  it("Case C: commented-out guards do NOT protect unconditional commands", () => {
    const script = `#!/bin/sh
# if command -v apt-get >/dev/null 2>&1; then
apt-get update
# fi`;

    const report = analyzeShellScript("install.sh", script);
    const aptFinding = report.findings.find((f) => f.command.includes("apt-get"));
    expect(aptFinding).toBeDefined();
    expect(aptFinding?.line).toBe(3);
    expect(aptFinding?.affected_distros).toContain("alpine:3.20");
  });

  // Case D: unrelated guard elsewhere in file does NOT protect unconditional distro-specific commands
  it("Case D: unrelated guard elsewhere in file does NOT protect unconditional distro commands", () => {
    const script = `#!/bin/sh
if [ -f /etc/os-release ]; then
  echo "Linux detected"
fi
apt-get update`;

    const report = analyzeShellScript("install.sh", script);
    const aptFinding = report.findings.find((f) => f.command.includes("apt-get"));
    expect(aptFinding).toBeDefined();
    expect(aptFinding?.line).toBe(5);
    expect(aptFinding?.affected_distros).toContain("alpine:3.20");
  });

  it("detects systemctl usage inside minimal containers", () => {
    const script = `#!/bin/sh
systemctl start myservice`;

    const report = analyzeShellScript("install.sh", script);
    const sysFinding = report.findings.find((f) => f.kind === "service_manager_assumption");
    expect(sysFinding).toBeDefined();
    expect(sysFinding?.line).toBe(2);
  });
});
