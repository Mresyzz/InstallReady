import fs from "fs";
import path from "path";
import { validateUntrustedArtifactJson } from "../lib/schema";
import { generateScriptResultFilename, validateRepositoryPath } from "../lib/path-validator";
import { validateFullCommitSha } from "../lib/repo-url";

/**
 * 生产发布脚本 (TypeScript / tsx 执行)：
 * 严格将未受信的构件 JSON 做全量模式校验，并完全使用受信任的工作流环境变量构造目标落盘路径。
 * 绝不执行任何构件内的代码，亦不从构件内部取路径。
 */
async function main() {
  const artifactPath = process.env.ARTIFACT_PATH;
  const expectedOwner = process.env.EXPECTED_OWNER;
  const expectedRepo = process.env.EXPECTED_REPO;
  const expectedCommit = process.env.EXPECTED_COMMIT;
  const expectedScript = process.env.EXPECTED_SCRIPT;
  const outputBaseDir = process.env.OUTPUT_BASE_DIR || "./results";

  if (!artifactPath || !expectedOwner || !expectedRepo || !expectedCommit || !expectedScript) {
    console.error("Missing required trusted environment variables for publishing.");
    process.exit(1);
  }

  if (!validateFullCommitSha(expectedCommit)) {
    console.error(`Invalid trusted commit SHA '${expectedCommit}': must be a 40-character hex string.`);
    process.exit(1);
  }

  const scriptValidation = validateRepositoryPath(expectedScript);
  if (!scriptValidation.valid || !scriptValidation.normalizedPath) {
    console.error(`Invalid trusted script path '${expectedScript}': ${scriptValidation.error}`);
    process.exit(1);
  }

  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact file not found at: ${artifactPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(artifactPath, "utf-8");

  // 使用系统统一且严格的 validateUntrustedArtifactJson 校验
  const validation = validateUntrustedArtifactJson(rawContent, {
    expectedOwner,
    expectedRepo,
    expectedCommitSha: expectedCommit,
    expectedScriptPath: expectedScript,
    maxJsonSizeBytes: 512 * 1024,
  });

  if (!validation.valid || !validation.data) {
    console.error(`Security rejection: ${validation.error}`);
    process.exit(1);
  }

  const validatedData = validation.data;

  // 严格从受信任环境变量构造目标文件名与存储路径：
  // 结构：owner/repo/commit-sha/<sanitized-basename>-<sha256(scriptPath)[0:16]>.json
  const targetFilename = generateScriptResultFilename(scriptValidation.normalizedPath);
  const targetDir = path.join(
    outputBaseDir,
    expectedOwner.toLowerCase(),
    expectedRepo.toLowerCase(),
    expectedCommit.toLowerCase()
  );

  fs.mkdirSync(targetDir, { recursive: true });
  const finalDest = path.join(targetDir, targetFilename);

  // 写入已消毒、校验过的标准 JSON
  fs.writeFileSync(finalDest, JSON.stringify(validatedData, null, 2), "utf-8");
  console.log(`Successfully verified and published runtime result to: ${finalDest}`);

  // 严格输出规范化的小写相对路径至 GITHUB_OUTPUT，供发布工作流仅暂存该单一文件
  const relativeFilePath = `${expectedOwner.toLowerCase()}/${expectedRepo.toLowerCase()}/${expectedCommit.toLowerCase()}/${targetFilename}`;
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `published_file=${relativeFilePath}\n`);
  }
}

main().catch((err) => {
  console.error("Publishing script failed:", err);
  process.exit(1);
});
