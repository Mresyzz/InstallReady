# Contributing to InstallReady

Thank you for your interest in contributing to **InstallReady**!

## Code of Conduct & Principles

1. **Simplicity First**: Follow KISS principles. Avoid speculative abstractions or premature infrastructure additions.
2. **Deterministic Rules**: Static analysis findings must be deterministic. Avoid fuzzy or LLM-based hallucinated warnings.
3. **Fact-Based Verification**: Real runtime compatibility results (`PASS` / `FAIL`) must only come from verified [OpsScript Gate](https://github.com/Mresyzz/opsscript-gate) runs. Never fabricate verification data.
4. **Security Boundaries**: Never propose architectures that execute arbitrary external repository code on web processes.

---

## Local Development Setup

### Requirements
- Node.js 20+ or 22+
- npm 10+

### Steps

```bash
# Clone repository
git clone https://github.com/Mresyzz/InstallReady.git
cd InstallReady

# Install dependencies
npm install

# Optional: configure GITHUB_TOKEN to avoid public API rate limits
cp .env.example .env.local

# Run development server
npm run dev

# Run full test suite
npm test

# Run linter and typecheck
npm run lint
npm run typecheck
```

---

## Adding a Showcase Repository

To add a public repository to the showcase:

1. Edit `data/showcase.json`.
2. Add your repository object under `repositories` or `aiCodingVertical`:
   ```json
   {
     "owner": "your-org",
     "repo": "your-project",
     "category": "dev-cli",
     "defaultScript": "install.sh",
     "description": "Short description of your project.",
     "featured": false,
     "verificationType": "static_only"
   }
   ```
3. Run tests to ensure JSON validity:
   ```bash
   npm test
   ```
4. Open a pull request with a descriptive title.
