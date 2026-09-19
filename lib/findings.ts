export type FindingSeverity = "warning" | "error" | "info";

export type FindingKind =
  | "package_manager_assumption"
  | "service_manager_assumption"
  | "shell_assumption"
  | "privilege_assumption"
  | "architecture_assumption"
  | "missing_tool_assumption";

export interface Finding {
  id: string;
  kind: FindingKind;
  command: string;
  line: number;
  severity: FindingSeverity;
  affected_distros: string[];
  message: string;
  hint: string;
}

export interface DistroCompatibilityStatus {
  distro: string; // e.g. "debian:12-slim", "ubuntu:22.04", "ubuntu:24.04", "alpine:3.20"
  displayName: string; // e.g. "Debian 12", "Ubuntu 22.04", "Ubuntu 24.04", "Alpine 3.20"
  status: "Likely compatible" | "Potential issue" | "Unknown";
  issueCount: number;
}

export const TARGET_DISTROS = [
  { id: "debian:12-slim", displayName: "Debian 12" },
  { id: "ubuntu:22.04", displayName: "Ubuntu 22.04" },
  { id: "ubuntu:24.04", displayName: "Ubuntu 24.04" },
  { id: "alpine:3.20", displayName: "Alpine 3.20" },
] as const;

export const REMEDIATION_HINTS: Record<string, string> = {
  "apt-get": "Alpine normally uses apk instead of apt-get.",
  apt: "Alpine normally uses apk instead of apt.",
  dpkg: "Alpine uses apk packages; dpkg is specific to Debian and Ubuntu.",
  "add-apt-repository": "Alpine does not have apt repositories. Add packages or APK repositories in /etc/apk/repositories.",
  apk: "Debian and Ubuntu use apt-get instead of apk.",
  dnf: "Debian, Ubuntu, and Alpine do not support dnf by default (RHEL/Fedora specific).",
  yum: "Debian, Ubuntu, and Alpine do not support yum by default (RHEL/CentOS specific).",
  pacman: "Debian, Ubuntu, and Alpine do not support pacman (Arch Linux specific).",
  systemctl: "Minimal container environments do not run systemd. Consider using background processes or checking for systemctl before invoking.",
  service: "Service command may not be available in minimal container environments like Alpine.",
  sudo: "Minimal container images (like debian-slim or alpine) typically run as root or lack sudo by default. Check `command -v sudo` before prefixing commands.",
};
