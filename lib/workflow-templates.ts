import { validateRepositoryPath } from "./repository-path";
import { ENGINE_ACTION } from "./engine";

/**
 * 为目标仓库生成即插即用的 GitHub Actions 配置文件内容
 * 显式引用 Mresyzz/opsscript-gate@v0.6.0 运行时引擎
 */
export function generateGitHubActionWorkflow(scriptPath: string = "install.sh", changedOnly = false): string {
  const safeScriptPath = validateRepositoryPath(scriptPath).normalizedPath || "install.sh";
  const trigger = changedOnly ? "on:\n  pull_request:" : "on:\n  pull_request:\n  push:\n    branches: [main]";

  return `name: Install Compatibility

${trigger}

permissions:
  contents: read

jobs:
  compatibility:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v7
        with:
          persist-credentials: false${changedOnly ? "\n          fetch-depth: 0" : ""}

      - name: Run OpsScript Gate Compatibility Check
        uses: ${ENGINE_ACTION}
        with:
          ${changedOnly ? "changed-since: ${{ github.event.pull_request.base.sha }}" : `script-path: ${safeScriptPath}`}
          shell: auto
          timeout: 60
          mem-limit: 256m
          pids-limit: 128
          network: none
          format: json
          output: reports/installready.json

      - name: Keep compatibility report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: install-compatibility
          path: reports/installready.json
          if-no-files-found: ignore
`;
}

/**
 * 生成本地终端 CLI 运行命令
 */
export function generateCliSnippet(scriptPath: string = "install.sh"): string {
  const safeScriptPath = validateRepositoryPath(scriptPath).normalizedPath || "install.sh";
  return `# Install OpsScript Gate from PyPI
pip install opsscript-gate

# Run isolated container verification locally (requires Docker)
opsscript-gate run ./${safeScriptPath} --shell auto --timeout 60 --network none
`;
}
