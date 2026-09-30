# InstallReady

> **Does this repo actually install cleanly on Linux?**

[![CI](https://github.com/Mresyzz/InstallReady/actions/workflows/ci.yml/badge.svg)](https://github.com/Mresyzz/InstallReady/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**InstallReady** checks Linux installer and bootstrap scripts (`install.sh`, `setup.sh`, `bootstrap.sh`) across Debian, Ubuntu, and Alpine before users discover the breakage for you.

---

## 🎯 Illustrative Output (Demo Fixture)

```text
demo/installer-fixture (Demo fixture)
install.sh (commit 22222222...)

Linux Install Compatibility — 3 / 4 Runtime Verified

Debian 12        ✅ PASS
Ubuntu 22.04     ✅ PASS
Ubuntu 24.04     ✅ PASS
Alpine 3.20      ❌ FAIL

Alpine 3.20 Failure: Line 43
Command: apt-get install -y curl
Diagnostic: apt-get: command not found

Suggested fix:
Alpine normally uses apk instead of apt-get.
```

Or for a portable installer:

```text
demo/portable-fixture (Illustrative output)
install.sh

Static Analysis Review:
Debian 12        Likely compatible
Ubuntu 22.04     Likely compatible
Ubuntu 24.04     Likely compatible
Alpine 3.20      Likely compatible
```

---

## 💡 What It Does

InstallReady operates on a strict two-level model:

1. **Level 1 — Static Analysis**:
   - Works immediately on any public GitHub repository.
   - Inspects the repository tree for likely installer scripts.
   - Identifies package-manager assumptions (`apt-get`, `apk`, `dnf`, `pacman`), bashisms, and service managers.
   - Features deterministic branch-aware guard detection (`if command -v apt-get ... elif command -v apk`) to prevent false positives while flagging unconditional commands.
   - Statuses: **Likely compatible**, **Potential issue**, or **Unknown**. *Never uses PASS or green badges for static analysis.*

2. **Level 2 — Runtime Verification**:
   - Powered by [OpsScript Gate](https://github.com/Mresyzz/opsscript-gate) (`Mresyzz/opsscript-gate@v0.4.1`).
   - Executes scripts inside isolated, unprivileged Debian, Ubuntu, and Alpine containers in GitHub Actions.
   - Records true runtime exit codes, command-level breakages, line numbers, and timeouts.
   - Statuses: **PASS**, **FAIL**, **ERROR**, or **TIMED_OUT**.

---

## 🔍 Why

- **ShellCheck** tells you whether shell code looks syntactically valid POSIX syntax.
- **InstallReady** analyzes whether an installer script makes cross-distribution assumptions.
- **OpsScript Gate** verifies whether the script actually executes cleanly across Linux distributions.

```
InstallReady (User Discovery & Product Layer)
    ↓
runtime verification powered by
    ↓
OpsScript Gate (Container Runtime Engine)
```

---

## 🛡️ Security Model

- **Zero-Execution Web Tier**: InstallReady never executes arbitrary untrusted repository code on web processes or application hosts.
- **SSRF Defenses**: Input is validated strictly for `github.com` public repositories. All outgoing HTTP requests are constructed internally for official GitHub endpoints.
- **Credential Isolation**: Runtime workflows set `persist-credentials: false` and run with `network: none` by default.
- **Untrusted Artifact Schema**: Scan artifacts are treated as hostile inputs and validated against strict schemas before publication.
- See [SECURITY.md](SECURITY.md) for the full security policy.

---

## ⚡ Add Verification to Your Repository

Add `.github/workflows/installready.yml` to your repository:

```yaml
name: Install Compatibility

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  compatibility:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v7

      - name: Run OpsScript Gate Compatibility Check
        uses: Mresyzz/opsscript-gate@v0.4.1
        with:
          script-path: install.sh
          shell: auto
          timeout: 60
          mem-limit: 256m
          pids-limit: 128
```

Or test locally with Python 3.10+ and Docker:

```bash
pip install opsscript-gate
opsscript-gate run ./install.sh --shell auto --timeout 60
```

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/Mresyzz/InstallReady.git
cd InstallReady

# Install dependencies
npm install

# Run unit and security regression tests
npm test

# Run linter and typecheck
npm run lint
npm run typecheck

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📦 Deployment

InstallReady is built with Next.js App Router and is fully deployable to **Vercel** or any standard Node.js serverless platform:

```bash
# Environment variables (Optional)
GITHUB_TOKEN=your_personal_access_token
```

---

## 🌟 Adding a Showcase Repository

To suggest an open-source repository for the showcase:
1. Open a pull request modifying `data/showcase.json`.
2. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
