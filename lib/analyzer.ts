import {
  Finding,
  DistroCompatibilityStatus,
  TARGET_DISTROS,
  REMEDIATION_HINTS,
} from "./findings";

export interface StaticAnalysisReport {
  scriptPath: string;
  totalLines: number;
  shebang: string | null;
  shellType: "bash" | "posix_sh" | "zsh" | "unknown";
  findings: Finding[];
  distroCompatibility: DistroCompatibilityStatus[];
  hasDistroGuards: boolean;
  analyzedAt: string;
}

/**
 * 确定性检查脚本是否包含常见的多发行版守卫分支。
 * 例如：
 * 1. 同时具备 command -v apt-get 和 command -v apk
 * 2. 检查 /etc/os-release 或 /etc/issue 并带有 case 分支
 */
function detectDistroGuards(content: string): boolean {
  // 检查是否具备 command -v / which / type 对不同包管理器的探测
  const checksApt = /command\s+-v\s+apt(?:-get)?|which\s+apt(?:-get)?|type\s+apt(?:-get)?/i.test(content);
  const checksApk = /command\s+-v\s+apk|which\s+apk|type\s+apk/i.test(content);
  const checksDnfOrYum = /command\s+-v\s+(?:dnf|yum)|which\s+(?:dnf|yum)|type\s+(?:dnf|yum)/i.test(content);

  // 如果脚本显式对 apt 和 apk 都进行了存在性分支检测，则认为具备确定性包管理器守卫
  if (checksApt && checksApk) {
    return true;
  }

  if ((checksApt || checksApk) && checksDnfOrYum) {
    return true;
  }

  // 检查基于 /etc/os-release 的发行版检测
  const checksOsRelease = /\/etc\/os-release|\/usr\/lib\/os-release/.test(content);
  const hasCaseOrIfDistro = /(?:case\s+["']?\$?(?:ID|ID_LIKE|NAME)["']?\s+in|if\s+\[\[?\s*"\$?(?:ID|ID_LIKE|NAME)")/.test(content);
  if (checksOsRelease && hasCaseOrIfDistro) {
    return true;
  }

  return false;
}

/**
 * 检查代码行是否处于注释或纯文本字符串中
 */
function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith("#");
}

/**
 * 保守型静态 Shell 安装脚本分析引擎
 */
export function analyzeShellScript(scriptPath: string, content: string): StaticAnalysisReport {
  const lines = content.split(/\r?\n/);
  const totalLines = lines.length;

  let shebang: string | null = null;
  let shellType: "bash" | "posix_sh" | "zsh" | "unknown" = "unknown";

  if (lines.length > 0 && lines[0].startsWith("#!")) {
    shebang = lines[0].trim();
    if (/bash/i.test(shebang)) {
      shellType = "bash";
    } else if (/(\/sh|\/dash)\b/i.test(shebang)) {
      shellType = "posix_sh";
    } else if (/zsh/i.test(shebang)) {
      shellType = "zsh";
    }
  }

  const hasGuards = detectDistroGuards(content);
  const findings: Finding[] = [];
  let findingCounter = 0;

  // 针对 Bashism 特性的检查：如果在 #!/bin/sh 下使用了 Bash 专有语法
  const isPosixShebang = shellType === "posix_sh";

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    if (isCommentOrEmpty(rawLine)) {
      return;
    }

    // 剔除行内尾部注释
    const codePart = rawLine.split(/(?<!\\)#/)[0].trim();
    if (!codePart) return;

    // 1. 包管理器假设检测（若无多发行版守卫，则直接报错）
    if (!hasGuards) {
      // Debian / Ubuntu 独占命令在 Alpine 下不可用
      const aptMatch = codePart.match(/\b(apt-get|apt|dpkg|add-apt-repository)\b(?:\s+([a-zA-Z0-9_\-]+))?/);
      if (aptMatch && !isDetectionContext(codePart, aptMatch[1])) {
        const cmd = aptMatch[1];
        findings.push({
          id: `f-${++findingCounter}`,
          kind: "package_manager_assumption",
          command: codePart.slice(0, 80),
          line: lineNum,
          severity: "warning",
          affected_distros: ["alpine:3.20"],
          message: `'${cmd}' is specific to Debian/Ubuntu and is not installed on Alpine Linux.`,
          hint: REMEDIATION_HINTS[cmd] || "Alpine normally uses apk instead of apt-get.",
        });
      }

      // Alpine 独占命令在 Debian / Ubuntu 下不可用
      const apkMatch = codePart.match(/\b(apk)\b(?:\s+([a-zA-Z0-9_\-]+))?/);
      if (apkMatch && !isDetectionContext(codePart, "apk")) {
        findings.push({
          id: `f-${++findingCounter}`,
          kind: "package_manager_assumption",
          command: codePart.slice(0, 80),
          line: lineNum,
          severity: "warning",
          affected_distros: ["debian:12-slim", "ubuntu:22.04", "ubuntu:24.04"],
          message: "'apk' is the Alpine Linux package manager and is not available on Debian or Ubuntu.",
          hint: REMEDIATION_HINTS["apk"] || "Debian and Ubuntu use apt-get instead of apk.",
        });
      }

      // RHEL / Fedora 独占命令
      const dnfMatch = codePart.match(/\b(dnf|yum|rpm)\b/);
      if (dnfMatch && !isDetectionContext(codePart, dnfMatch[1])) {
        const cmd = dnfMatch[1];
        findings.push({
          id: `f-${++findingCounter}`,
          kind: "package_manager_assumption",
          command: codePart.slice(0, 80),
          line: lineNum,
          severity: "warning",
          affected_distros: ["debian:12-slim", "ubuntu:22.04", "ubuntu:24.04", "alpine:3.20"],
          message: `'${cmd}' is specific to RedHat/Fedora families and is not present in Debian, Ubuntu, or Alpine.`,
          hint: REMEDIATION_HINTS[cmd] || `Use distro-appropriate package manager (apt-get on Debian/Ubuntu, apk on Alpine).`,
        });
      }

      // Arch Linux 独占命令
      const pacmanMatch = codePart.match(/\b(pacman)\b/);
      if (pacmanMatch && !isDetectionContext(codePart, "pacman")) {
        findings.push({
          id: `f-${++findingCounter}`,
          kind: "package_manager_assumption",
          command: codePart.slice(0, 80),
          line: lineNum,
          severity: "warning",
          affected_distros: ["debian:12-slim", "ubuntu:22.04", "ubuntu:24.04", "alpine:3.20"],
          message: "'pacman' is specific to Arch Linux and not available in Debian, Ubuntu, or Alpine.",
          hint: REMEDIATION_HINTS["pacman"] || "Use distro-appropriate package manager.",
        });
      }
    }

    // 2. 服务管理假设（systemctl / service 在最小容器中不可用）
    const sysMatch = codePart.match(/\b(systemctl|service)\b/);
    if (sysMatch && !isDetectionContext(codePart, sysMatch[1])) {
      const cmd = sysMatch[1];
      findings.push({
        id: `f-${++findingCounter}`,
        kind: "service_manager_assumption",
        command: codePart.slice(0, 80),
        line: lineNum,
        severity: "warning",
        affected_distros: ["debian:12-slim", "ubuntu:22.04", "ubuntu:24.04", "alpine:3.20"],
        message: `'${cmd}' was called directly. Minimal containers do not run systemd/init by default.`,
        hint: REMEDIATION_HINTS[cmd] || "Check if init daemon is active or provide a non-systemd fallback.",
      });
    }

    // 3. Bashism 检查（声明 posix_sh 但包含 bash 专有语法，例如数组或 [[ ]]）
    if (isPosixShebang) {
      if (/\b[a-zA-Z_][a-zA-Z0-9_]*=\s*\(/.test(codePart) || /\[\[.+\]\]/.test(codePart) || /\bfunction\s+[a-zA-Z_]/.test(codePart)) {
        findings.push({
          id: `f-${++findingCounter}`,
          kind: "shell_assumption",
          command: codePart.slice(0, 80),
          line: lineNum,
          severity: "warning",
          affected_distros: ["alpine:3.20"],
          message: "POSIX shebang (#!/bin/sh) used with Bash-specific syntax (arrays or [[ ]]). This fails under Alpine ash/dash.",
          hint: "Change shebang to #!/usr/bin/env bash or replace with standard POSIX sh syntax.",
        });
      }
    }

    // 4. Alpine 基础环境缺少 Bash 解释器检查
    if (lineNum === 1 && shellType === "bash") {
      findings.push({
        id: `f-${++findingCounter}`,
        kind: "shell_assumption",
        command: shebang || "#!/bin/bash",
        line: 1,
        severity: "info",
        affected_distros: ["alpine:3.20"],
        message: "Script requires bash. Minimal Alpine Linux containers do not include /bin/bash by default (ash is default).",
        hint: "Ensure bash is installed via `apk add --no-cache bash` before invoking, or make the script POSIX sh compliant.",
      });
    }

    // 5. Sudo 假设（容器中一般直接以 root 运行且未安装 sudo）
    if (/\bsudo\s+[a-zA-Z0-9_\-]+/.test(codePart) && !isDetectionContext(codePart, "sudo")) {
      findings.push({
        id: `f-${++findingCounter}`,
        kind: "privilege_assumption",
        command: codePart.slice(0, 80),
        line: lineNum,
        severity: "info",
        affected_distros: ["debian:12-slim", "alpine:3.20"],
        message: "Hardcoded 'sudo' prefix found. Minimal containers often lack sudo or already run as UID 0.",
        hint: "Consider wrapping in a helper: `if command -v sudo >/dev/null; then sudo ...; else ...; fi`.",
      });
    }
  });

  // 计算各个发行版的静态兼容性结论
  const distroCompatibility: DistroCompatibilityStatus[] = TARGET_DISTROS.map((d) => {
    const relevantFindings = findings.filter(
      (f) => f.affected_distros.includes(d.id) && f.severity !== "info"
    );
    return {
      distro: d.id,
      displayName: d.displayName,
      status: relevantFindings.length === 0 ? "Likely compatible" : "Potential issue",
      issueCount: relevantFindings.length,
    };
  });

  return {
    scriptPath,
    totalLines,
    shebang,
    shellType,
    findings,
    distroCompatibility,
    hasDistroGuards: hasGuards,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * 辅助函数：判断某命令是否处于检测上下文中（如 command -v, which, type, hash）
 */
function isDetectionContext(line: string, cmd: string): boolean {
  const pattern = new RegExp(
    `(?:command\\s+-v|which|type|hash)\\s+["']?${cmd}["']?|` +
    `if\\s+!\\s*(?:command\\s+-v|which)\\s+["']?${cmd}["']?`,
    "i"
  );
  return pattern.test(line);
}
