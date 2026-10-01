import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { analyzeShellScript } from "../lib/analyzer";
import { discoverInstallerScripts, HIGH_CONFIDENCE_FALLBACK_PATHS, mergeFallbackCandidates, type GitTreeItem } from "../lib/discovery";
import { parseAndValidateGitHubUrl } from "../lib/repo-url";
import { generateGitHubActionWorkflow } from "../lib/workflow-templates";
import { generateReportMarkdown } from "../lib/report-markdown";
import "./styles.css";

type Scan = { owner: string; repo: string; defaultBranch: string; sha: string; script: string; source: string; report: ReturnType<typeof analyzeShellScript>; candidates: string[]; warning?: string };

const DEMO_SCRIPT = `#!/bin/sh\nset -e\napt-get update -qq\necho "Installer step"\n`;
const DEMO_SCAN: Scan = {
  owner: "example",
  repo: "installer-demo",
  defaultBranch: "main",
  sha: "demo000000000000000000000000000000000000",
  script: "install.sh",
  source: DEMO_SCRIPT,
  report: analyzeShellScript("install.sh", DEMO_SCRIPT),
  candidates: ["install.sh"],
};

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (response.status === 403) throw new Error("GitHub API rate limit reached. Wait a little, or use the private script review below.");
  if (response.status === 404) throw new Error("Repository or file not found. Only public GitHub repositories are supported.");
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

async function scanRepository(input: string, preferredScript = ""): Promise<Scan> {
  const parsed = parseAndValidateGitHubUrl(input);
  if (!parsed.valid || !parsed.owner || !parsed.repo) throw new Error(parsed.error || "Enter a valid GitHub repository.");
  const base = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const metadata = await githubJson<{ default_branch: string }>(base);
  const commit = await githubJson<{ sha: string }>(`${base}/commits/${encodeURIComponent(metadata.default_branch)}`);
  const tree = await githubJson<{ truncated: boolean; tree: GitTreeItem[] }>(`${base}/git/trees/${commit.sha}?recursive=1`);
  let discovery = discoverInstallerScripts(tree.tree, tree.truncated);
  if (tree.truncated) {
    const fallback = await findFallbackCandidates(base, commit.sha);
    discovery = mergeFallbackCandidates(discovery.candidates, fallback, true);
  }
  if (!discovery.candidates.length) throw new Error("No .sh installer or bootstrap scripts were found in this repository.");
  const script = discovery.candidates.some((candidate) => candidate.path === preferredScript) ? preferredScript : discovery.candidates[0].path;
  const source = await readScript(parsed.owner, parsed.repo, commit.sha, script);
  return { owner: parsed.owner, repo: parsed.repo, defaultBranch: metadata.default_branch, sha: commit.sha, script, source, report: analyzeShellScript(script, source), candidates: discovery.candidates.map((candidate) => candidate.path), warning: discovery.warning };
}

async function findFallbackCandidates(base: string, sha: string): Promise<Array<{ path: string; size?: number }>> {
  const results = await Promise.all(HIGH_CONFIDENCE_FALLBACK_PATHS.map(async (path) => {
    try {
      const file = await githubJson<{ type?: string; size?: number }>(`${base}/contents/${path}?ref=${encodeURIComponent(sha)}`);
      return file.type === "file" ? { path, ...(file.size === undefined ? {} : { size: file.size }) } : null;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Repository or file not found")) return null;
      throw error;
    }
  }));
  return results.filter((result): result is { path: string; size?: number } => result !== null);
}

async function readScript(owner: string, repo: string, sha: string, script: string): Promise<string> {
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const file = await githubJson<{ content: string }>(`${base}/contents/${script}?ref=${encodeURIComponent(sha)}`);
  const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readQuery(): { repo: string; script: string; demo: boolean } {
  const params = new URLSearchParams(window.location.search);
  return { repo: params.get("repo") || "", script: params.get("script") || "", demo: params.get("demo") === "1" };
}

function App() {
  const initial = readQuery();
  const [input, setInput] = useState(initial.repo || "Mresyzz/opsscript-gate");
  const [scan, setScan] = useState<Scan | null>(initial.demo ? DEMO_SCAN : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!initial.repo || initial.demo) return;
    setBusy(true);
    scanRepository(initial.repo, initial.script).then(setScan).catch((e) => setError(e instanceof Error ? e.message : "Scan failed.")).finally(() => setBusy(false));
  }, []);
  const review = async () => { setBusy(true); setError(""); setScan(null); try { const result = await scanRepository(input); setScan(result); const params = new URLSearchParams({ repo: `${result.owner}/${result.repo}`, script: result.script }); history.replaceState(null, "", `?${params}`); } catch (e) { setError(e instanceof Error ? e.message : "Scan failed."); } finally { setBusy(false); } };
  const showDemo = () => { setScan(DEMO_SCAN); setError(""); history.replaceState(null, "", "?demo=1"); };
  const selectScript = async (script: string) => {
    if (!scan || scan.owner === "example" || script === scan.script) return;
    setBusy(true);
    setError("");
    try {
      const source = await readScript(scan.owner, scan.repo, scan.sha, script);
      setScan({ ...scan, script, source, report: analyzeShellScript(script, source) });
      const params = new URLSearchParams({ repo: `${scan.owner}/${scan.repo}`, script });
      history.replaceState(null, "", `?${params}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Script load failed.");
    } finally {
      setBusy(false);
    }
  };
  const workflow = scan ? generateGitHubActionWorkflow(scan.script) : "";
  const report = scan ? generateReportMarkdown(scan.report, { repository: `${scan.owner}/${scan.repo}`, commitSha: scan.sha, sourceUrl: `https://github.com/${scan.owner}/${scan.repo}/blob/${scan.sha}/${scan.script}` }) : "";
  const workflowUrl = scan && scan.owner !== "example" ? `https://github.com/${scan.owner}/${scan.repo}/new/${encodeURIComponent(scan.defaultBranch)}?filename=.github%2Fworkflows%2Fopsscript-gate.yml&value=${encodeURIComponent(workflow)}` : "#";
  const shareUrl = scan ? `${window.location.origin}${window.location.pathname}?${scan.owner === "example" ? "demo=1" : new URLSearchParams({ repo: `${scan.owner}/${scan.repo}`, script: scan.script })}` : "";
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); };
  return <><header className="shell nav"><a className="brand" href="./">InstallReady</a><a href="https://github.com/Mresyzz/InstallReady">Open source on GitHub ↗</a></header><main className="shell"><section className="hero"><span className="eyebrow">Commit-pinned Linux review</span><h1>Find installer breakage before users do.</h1><p>Check shell installers across Debian, Ubuntu, and Alpine with deterministic rules. Run the real container check in your own GitHub Actions workflow.</p><div className="panel"><form className="form" onSubmit={(event) => { event.preventDefault(); void review(); }}><input className="input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="owner/repository or GitHub URL" aria-label="GitHub repository"/><button className="button" disabled={busy}>{busy ? "Scanning…" : "Check repository"}</button></form><div className="examples"><button className="chip" onClick={() => setInput("Mresyzz/opsscript-gate")}>OpsScript Gate</button><button className="chip" onClick={() => setInput("nvm-sh/nvm")}>nvm</button><button className="chip" onClick={showDemo}>See a 10-second demo</button></div>{error && <div className="message" role="alert">{error}</div>}<div className="notice">The static scan runs in your browser. No repository code is executed and no AI model is called. GitHub API limits apply to anonymous public scans.</div></div></section>{scan && <section className="result" aria-live="polite"><p className="eyebrow">{scan.owner}/{scan.repo} · {scan.sha.slice(0, 12)}</p>{scan.warning && <div className="notice">{scan.warning}</div>}{scan.candidates.length > 1 && <label className="candidate-picker">Review another candidate<select value={scan.script} disabled={busy} onChange={(event) => void selectScript(event.target.value)}>{scan.candidates.map((candidate) => <option value={candidate} key={candidate}>{candidate}</option>)}</select></label>}<h2>{scan.script}</h2><p className="muted">{scan.candidates.length} candidate script(s) found. This report is static analysis only.</p><div className="grid">{scan.report.distroCompatibility.map((item) => <div className="card" key={item.distro}><strong>{item.displayName}</strong><span className={item.status === "Potential issue" ? "warn" : item.status === "Unknown" ? "muted" : "ok"}>{item.status}</span><p className="muted">{item.evidence[0]?.reason}</p></div>)}</div>{scan.report.findings.length ? <div>{scan.report.findings.map((finding) => <div className="finding" key={finding.id}><strong>Line {finding.line}: {finding.message}</strong><div className="muted">{finding.hint}</div></div>)}</div> : <div className="card ok">No supported static rule matched.</div>}<div className="actions"><a className="button" href={workflowUrl} target={scan.owner === "example" ? undefined : "_blank"} rel="noreferrer">Add workflow on GitHub ↗</a><button className="secondary" onClick={() => void copy(shareUrl)}>Copy share link</button><button className="secondary" onClick={() => void copy(workflow)}>Copy workflow</button><button className="secondary" onClick={() => void copy(report)}>Copy Markdown report</button><a className="secondary" href={scan.owner === "example" ? "#" : `https://github.com/${scan.owner}/${scan.repo}/blob/${scan.sha}/${scan.script}`} target="_blank" rel="noreferrer">View source ↗</a></div><details className="card" style={{ marginTop: 16 }}><summary>Show generated workflow</summary><pre className="code">{workflow}</pre></details></section>}</main><footer className="shell footer">InstallReady is open source under MIT. Static rules are heuristic; runtime evidence comes from OpsScript Gate in GitHub Actions. <span>Guides: <a href="./shellcheck-alternative/">ShellCheck runtime companion</a> · <a href="./alpine-installer-check/">Alpine installer checks</a> · <a href="./github-action-shell-testing/">GitHub Actions shell testing</a></span></footer></>;
}

createRoot(document.getElementById("root")!).render(<App />);
