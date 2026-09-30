import fs from "fs";
import path from "path";
import { validateRuntimeTarget } from "../lib/runtime-target";

async function main() {
  const rawRepo = process.env.TARGET_REPO_INPUT || "";
  const rawScript = process.env.SCRIPT_PATH_INPUT || "";
  const configPath = process.env.SHOWCASE_CONFIG_PATH || path.resolve(process.cwd(), "data/showcase.json");

  if (!rawRepo.trim() || !rawScript.trim()) {
    console.error("Error: TARGET_REPO_INPUT and SCRIPT_PATH_INPUT must be provided.");
    process.exit(1);
  }

  if (!fs.existsSync(configPath)) {
    console.error(`Error: Showcase config file not found at: ${configPath}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(configPath, "utf-8");
  const showcaseConfig = JSON.parse(rawJson);

  try {
    const validated = validateRuntimeTarget({
      rawRepo,
      rawScript,
      showcaseConfig,
    });

    console.log(`[Trusted Target Authorization Passed]`);
    console.log(`Repository: ${validated.owner}/${validated.repo}`);
    console.log(`Normalized Storage: ${validated.targetOwnerNormalized}/${validated.targetRepoNormalized}`);
    console.log(`Approved Script: ${validated.scriptPath}`);

    const githubOutput = process.env.GITHUB_OUTPUT;
    if (githubOutput) {
      fs.appendFileSync(githubOutput, `target_owner=${validated.owner}\n`);
      fs.appendFileSync(githubOutput, `target_repo=${validated.repo}\n`);
      fs.appendFileSync(githubOutput, `target_owner_normalized=${validated.targetOwnerNormalized}\n`);
      fs.appendFileSync(githubOutput, `target_repo_normalized=${validated.targetRepoNormalized}\n`);
      fs.appendFileSync(githubOutput, `target_full_name=${validated.owner}/${validated.repo}\n`);
      fs.appendFileSync(githubOutput, `script_path=${validated.scriptPath}\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Security Authorization Rejected: ${message}`);
    process.exit(1);
  }
}

main();
