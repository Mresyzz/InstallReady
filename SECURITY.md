# Security Policy: InstallReady

## 1. Zero-Execution Web Architecture

**InstallReady does NOT execute arbitrary untrusted repository scripts on:**
- the web server
- the API server
- the frontend server
- a long-lived application host
- any machine containing application secrets or tokens

Docker containers are **NOT** treated as a security sandbox for arbitrary untrusted code. Therefore, InstallReady v0.1 enforces a strict two-level execution model:

### Level 1 — Static Analysis (Web Tier)
Available for any public GitHub repository. It only:
- parses and validates GitHub repository URLs
- queries official GitHub REST API endpoints with strict size and count limits
- inspects script ASTs and text patterns for cross-distro package-manager assumptions
- **NEVER** spawns shell processes or executes repository code.

### Level 2 — Runtime Verified (Isolated GitHub Actions Tier)
Executed exclusively within disposable GitHub Actions runners using [OpsScript Gate](https://github.com/Mresyzz/opsscript-gate) (`Mresyzz/opsscript-gate@v0.4.1`).
- Automatic showcase scans are strictly restricted to a curated allowlist.
- Arbitrary user repositories are **NEVER** automatically executed on InstallReady shared infrastructure.
- Users can run verification inside their own repository via generated GitHub Actions workflows.

---

## 2. Server-Side Request Forgery (SSRF) Defenses

- **Strict Target Whitelisting**: User input is strictly parsed for `github.com` public repositories. All outgoing HTTP requests are constructed internally targeting official GitHub API endpoints (`api.github.com`).
- **No Arbitrary URL Proxying**: The server never fetches raw URLs provided by users.
- **Path Traversal Defenses**: All repository-relative paths are validated using `validateRepositoryPath()`, rejecting `..`, absolute paths, backslashes, URL schemes, and control characters.
- **Full SHA Pinned Routes**: Commit-pinned result routes (`/r/[owner]/[repo]/[commitSha]`) strictly enforce 40-character hex commit hashes (`^[0-9a-f]{40}$`), rejecting branch names or dynamic references.

---

## 3. GitHub Content & Rate Limits

- **Candidate File Limit**: Maximum 100 candidate files inspected per repository.
- **File Size Limit**: Maximum 1 MiB per inspected script.
- **Strict Timeouts**: 10-second hard abort timeout on all GitHub API calls.
- **Truncation Awareness**: When the GitHub Git Tree API returns `truncated: true`, the system explicitly records `partial_scan: true` and presents a clear UI warning rather than asserting false absence.

---

## 4. Credential Isolation & Untrusted Artifact Handling

- Any `actions/checkout` step in runtime verification workflows must declare `persist-credentials: false`.
- Target repository scripts run with minimal GitHub permissions (`contents: read`) and `network: none` by default.
- Runtime scan artifacts are treated as **untrusted inputs**. The publishing job runs strict schema validation (`validateUntrustedArtifactJson`), never executes artifact scripts or binaries, and derives publication paths solely from trusted workflow variables.

---

## 5. Output Escaping & SVG Safety

- All dynamic data rendered into SVG badges is XML-escaped (`&`, `<`, `>`, `"`, `'`) to prevent SVG injection and cross-site scripting (XSS).
- Dangerous HTML rendering methods (`dangerouslySetInnerHTML`) are prohibited for user-controlled code content.

---

## 6. Reporting a Vulnerability

If you discover a security issue or vulnerability in InstallReady, please **do not open a public issue**.
Instead, report it directly via GitHub Security Advisories at:
https://github.com/Mresyzz/InstallReady/security/advisories

All reports will be evaluated within 48 hours.
