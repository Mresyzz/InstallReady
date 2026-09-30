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
 * 确定性检查脚本中是否包含多发行版适配逻辑（仅作为全局参考标记）
 */
export function detectDistroGuards(content: string): boolean {
  const checksApt = /command\s+-v\s+apt(?:-get)?|which\s+apt(?:-get)?|type\s+apt(?:-get)?/i.test(content);
  const checksApk = /command\s+-v\s+apk|which\s+apk|type\s+apk/i.test(content);
  const checksDnfOrYum = /command\s+-v\s+(?:dnf|yum)|which\s+(?:dnf|yum)|type\s+(?:dnf|yum)/i.test(content);

  if (checksApt && checksApk) {
    return true;
  }

  if ((checksApt || checksApk) && checksDnfOrYum) {
    return true;
  }

  const checksOsRelease = /\/etc\/os-release|\/usr\/lib\/os-release/.test(content);
  const hasCaseOrIfDistro = /(?:case\s+["']?\$?(?:ID|ID_LIKE|NAME)["']?\s+in|if\s+\[\[?\s*"\$?(?:ID|ID_LIKE|NAME)")/.test(content);
  if (checksOsRelease && hasCaseOrIfDistro) {
    return true;
  }

  return false;
}

/**
 * 分析条件字符串中守卫的包管理器命令
 */
function detectBranchGuardsFromCondition(condition: string): Set<string> {
  const guards = new Set<string>();

  if (
    /command\s+-v\s+apt(?:-get)?|which\s+apt(?:-get)?|type\s+apt(?:-get)?/i.test(condition) ||
    /\$?(?:ID|ID_LIKE|NAME)["']?\s*(?:=|==|\*)\s*["']?(?:debian|ubuntu)/i.test(condition)
  ) {
    guards.add("apt");
    guards.add("apt-get");
    guards.add("dpkg");
    guards.add("add-apt-repository");
  }

  if (
    /command\s+-v\s+apk|which\s+apk|type\s+apk/i.test(condition) ||
    /\$?(?:ID|ID_LIKE|NAME)["']?\s*(?:=|==|\*)\s*["']?alpine/i.test(condition)
  ) {
    guards.add("apk");
  }

  if (
    /command\s+-v\s+(?:dnf|yum|rpm)|which\s+(?:dnf|yum|rpm)|type\s+(?:dnf|yum|rpm)/i.test(condition) ||
    /\$?(?:ID|ID_LIKE|NAME)["']?\s*(?:=|==|\*)\s*["']?(?:fedora|rhel|centos)/i.test(condition)
  ) {
    guards.add("dnf");
    guards.add("yum");
    guards.add("rpm");
  }

  if (
    /command\s+-v\s+pacman|which\s+pacman|type\s+pacman/i.test(condition) ||
    /\$?(?:ID|ID_LIKE|NAME)["']?\s*(?:=|==|\*)\s*["']?arch/i.test(condition)
  ) {
    guards.add("pacman");
  }

  return guards;
}

/**
 * 构建逐行守卫映射表：保守型分支识别。
 * 仅当命令处于明确对应的 if/elif/case 分支内部时，才豁免该命令的发行版警告。
 * 文件中其他位置的 command -v 绝不跨行全局抑制警告。
 */
export function buildLineGuardMap(lines: string[]): Map<number, Set<string>> {
  const guardMap = new Map<number, Set<string>>();

  interface Block {
    type: "if" | "case";
    currentBranchGuards: Set<string>;
  }
  const stack: Block[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const lineNum = idx + 1;

    // 剔除行内注释
    const trimmed = rawLine.split(/(?<!\\)#/)[0].trim();

    // 单行行内短路守卫：例如 command -v apt-get >/dev/null && apt-get ...
    const inlineGuards = new Set<string>();
    if (trimmed) {
      if (/command\s+-v\s+apt(?:-get)?|which\s+apt(?:-get)?/i.test(trimmed)) {
        inlineGuards.add("apt");
        inlineGuards.add("apt-get");
        inlineGuards.add("dpkg");
        inlineGuards.add("add-apt-repository");
      }
      if (/command\s+-v\s+apk|which\s+apk/i.test(trimmed)) {
        inlineGuards.add("apk");
      }
      if (/command\s+-v\s+(?:dnf|yum)|which\s+(?:dnf|yum)/i.test(trimmed)) {
        inlineGuards.add("dnf");
        inlineGuards.add("yum");
        inlineGuards.add("rpm");
      }
      if (/command\s+-v\s+pacman|which\s+pacman/i.test(trimmed)) {
        inlineGuards.add("pacman");
      }
    }

    if (trimmed) {
      if (/^if\s+/i.test(trimmed)) {
        const guards = detectBranchGuardsFromCondition(trimmed);
        stack.push({ type: "if", currentBranchGuards: guards });
      } else if (/^elif\s+/i.test(trimmed)) {
        const top = stack[stack.length - 1];
        if (top && top.type === "if") {
          top.currentBranchGuards = detectBranchGuardsFromCondition(trimmed);
        }
      } else if (/^else\b/i.test(trimmed)) {
        const top = stack[stack.length - 1];
        if (top && top.type === "if") {
          top.currentBranchGuards = new Set<string>();
        }
      } else if (/^fi\b/i.test(trimmed)) {
        if (stack.length > 0 && stack[stack.length - 1].type === "if") {
          stack.pop();
        }
      } else if (/^case\s+.+\s+in\b/i.test(trimmed)) {
        stack.push({ type: "case", currentBranchGuards: new Set<string>() });
      } else if (/^esac\b/i.test(trimmed)) {
        if (stack.length > 0 && stack[stack.length - 1].type === "case") {
          stack.pop();
        }
      } else if (stack.length > 0 && stack[stack.length - 1].type === "case") {
        const top = stack[stack.length - 1];
        if (/debian|ubuntu/i.test(trimmed)) {
          top.currentBranchGuards = new Set(["apt", "apt-get", "dpkg", "add-apt-repository"]);
        } else if (/alpine/i.test(trimmed)) {
          top.currentBranchGuards = new Set(["apk"]);
        } else if (/fedora|rhel|centos/i.test(trimmed)) {
          top.currentBranchGuards = new Set(["dnf", "yum", "rpm"]);
        } else if (/arch/i.test(trimmed)) {
          top.currentBranchGuards = new Set(["pacman"]);
        } else if (/;;/.test(trimmed)) {
          top.currentBranchGuards = new Set();
        }
      }
    }

    // 聚合当前代码行的有效守卫集合
    const lineActiveGuards = new Set<string>(inlineGuards);
    for (const block of stack) {
      for (const g of block.currentBranchGuards) {
        lineActiveGuards.add(g);
      }
    }

    guardMap.set(lineNum, lineActiveGuards);
  }

  return guardMap;
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
  const lineGuardMap = buildLineGuardMap(lines);

  const findings: Finding[] = [];
  let findingCounter = 0;

  const isPosixShebang = shellType === "posix_sh";

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    if (isCommentOrEmpty(rawLine)) {
      return;
    }

    const codePart = rawLine.split(/(?<!\\)#/)[0].trim();
    if (!codePart) return;

    const guardedOnThisLine = lineGuardMap.get(lineNum) || new Set<string>();

    // 1. 包管理器假设检测（严格执行逐行守卫判断，绝不因其他位置的 command -v 全局豁免）
    const aptMatch = codePart.match(/\b(apt-get|apt|dpkg|add-apt-repository)\b(?:\s+([a-zA-Z0-9_\-]+))?/);
    if (aptMatch) {
      const cmd = aptMatch[1];
      const isGuarded = guardedOnThisLine.has(cmd) || isDetectionContext(codePart, cmd);
      if (!isGuarded) {
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
    }

    const apkMatch = codePart.match(/\b(apk)\b(?:\s+([a-zA-Z0-9_\-]+))?/);
    if (apkMatch) {
      const isGuarded = guardedOnThisLine.has("apk") || isDetectionContext(codePart, "apk");
      if (!isGuarded) {
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
    }

    const dnfMatch = codePart.match(/\b(dnf|yum|rpm)\b/);
    if (dnfMatch) {
      const cmd = dnfMatch[1];
      const isGuarded = guardedOnThisLine.has(cmd) || isDetectionContext(codePart, cmd);
      if (!isGuarded) {
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
    }

    const pacmanMatch = codePart.match(/\b(pacman)\b/);
    if (pacmanMatch) {
      const isGuarded = guardedOnThisLine.has("pacman") || isDetectionContext(codePart, "pacman");
      if (!isGuarded) {
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
