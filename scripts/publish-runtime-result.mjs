import fs from "fs";
import path from "path";
import { createHash } from "crypto";

/**
 * 生产发布脚本：严格将未受信的构件 JSON 消毒，并且仅通过受信任的工作流环境变量构造目标路径。
 * 严禁执行构件内的任何脚本或命令。
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

  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact file not found at: ${artifactPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(artifactPath, "utf-8");
  if (Buffer.byteLength(rawContent, "utf8") > 512 * 1024) {
    console.error("Artifact exceeds 512KB limit.");
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(rawContent);
  } catch (err) {
    console.error("Malformed JSON in artifact:", err);
    process.exit(1);
  }

  // 严格属性核对
  if (data.schema_version !== 1) {
    console.error("Invalid schema_version:", data.schema_version);
    process.exit(1);
  }

  const expectedRepoFull = `${expectedOwner}/${expectedRepo}`.toLowerCase();
  if (String(data.repository).toLowerCase() !== expectedRepoFull) {
    console.error(`Repository mismatch: got ${data.repository}, expected ${expectedRepoFull}`);
    process.exit(1);
  }

  if (String(data.commit_sha).toLowerCase() !== expectedCommit.toLowerCase()) {
    console.error(`Commit SHA mismatch: got ${data.commit_sha}, expected ${expectedCommit}`);
    process.exit(1);
  }

  if (data.engine?.name !== "OpsScript Gate") {
    console.error("Invalid engine name:", data.engine?.name);
    process.exit(1);
  }

  // 构造抗碰撞目标文件名：<sanitized-basename>-<sha256(scriptPath)[0:16]>.json
  const rawBase = path.basename(expectedScript);
  const sanitizedBase = rawBase.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
  const hash = createHash("sha256").update(expectedScript).digest("hex").slice(0, 16);
  const targetFilename = `${sanitizedBase}-${hash}.json`;

  const targetDir = path.join(
    outputBaseDir,
    expectedOwner.toLowerCase(),
    expectedRepo.toLowerCase(),
    expectedCommit.toLowerCase()
  );

  fs.mkdirSync(targetDir, { recursive: true });
  const finalDest = path.join(targetDir, targetFilename);

  // 写入已消毒、校验过的标准 JSON
  fs.writeFileSync(finalDest, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Successfully verified and published runtime result to: ${finalDest}`);
}

main().catch((err) => {
  console.error("Publishing script failed:", err);
  process.exit(1);
});
