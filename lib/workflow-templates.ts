import { validateRepositoryPath } from "./path-validator";

/**
 * 为目标仓库生成即插即用的 GitHub Actions 配置文件内容
 * 显式引用 Mresyzz/opsscript-gate@v0.4.1 运行时引擎
 */
export function generateGitHubActionWorkflow(scriptPath: string = "install.sh"): string {
  const safeScriptPath = validateRepositoryPath(scriptPath).normalizedPath || "install.sh";

  return `name: Install Compatibility

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
          script-path: ${safeScriptPath}
          shell: auto
          timeout: 60
          mem-limit: 256m
          pids-limit: 128
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
opsscript-gate run ./${safeScriptPath} --shell auto --timeout 60
`;
}
