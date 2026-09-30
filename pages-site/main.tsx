import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { analyzeShellScript } from "../lib/analyzer";
import { discoverInstallerScripts, type GitTreeItem } from "../lib/discovery";
import { parseAndValidateGitHubUrl } from "../lib/repo-url";
import { generateGitHubActionWorkflow } from "../lib/workflow-templates";
import { generateReportMarkdown } from "../lib/report-markdown";
import "./styles.css";

type Scan = { owner: string; repo: string; sha: string; script: string; source: string; report: ReturnType<typeof analyzeShellScript>; candidates: string[] };

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (response.status === 403) throw new Error("GitHub API rate limit reached. Wait a little, or use the private script review below.");
  if (response.status === 404) throw new Error("Repository or file not found. Only public GitHub repositories are supported.");
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

async function scanRepository(input: string): Promise<Scan> {
  const parsed = parseAndValidateGitHubUrl(input);
  if (!parsed.valid || !parsed.owner || !parsed.repo) throw new Error(parsed.error || "Enter a valid GitHub repository.");
  const base = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const metadata = await githubJson<{ default_branch: string }>(base);
  const commit = await githubJson<{ sha: string }>(`${base}/commits/${encodeURIComponent(metadata.default_branch)}`);
  const tree = await githubJson<{ truncated: boolean; tree: GitTreeItem[] }>(`${base}/git/trees/${commit.sha}?recursive=1`);
  const discovery = discoverInstallerScripts(tree.tree, tree.truncated);
  if (!discovery.candidates.length) throw new Error("No .sh installer or bootstrap scripts were found in this repository.");
  const script = discovery.candidates[0].path;
  const file = await githubJson<{ content: string }>(`${base}/contents/${script}?ref=${commit.sha}`);
  const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), (character) => character.charCodeAt(0));
  const source = new TextDecoder().decode(bytes);
  return { owner: parsed.owner, repo: parsed.repo, sha: commit.sha, script, source, report: analyzeShellScript(script, source), candidates: discovery.candidates.map((candidate) => candidate.path) };
}

function App() {
  const [input, setInput] = useState("Mresyzz/opsscript-gate");
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const review = async () => { setBusy(true); setError(""); setScan(null); try { setScan(await scanRepository(input)); } catch (e) { setError(e instanceof Error ? e.message : "Scan failed."); } finally { setBusy(false); } };
  const workflow = scan ? generateGitHubActionWorkflow(scan.script) : "";
  const report = scan ? generateReportMarkdown(scan.report, { repository: `${scan.owner}/${scan.repo}`, commitSha: scan.sha, sourceUrl: `https://github.com/${scan.owner}/${scan.repo}/blob/${scan.sha}/${scan.script}` }) : "";
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); };
  return <><header className="shell nav"><a className="brand" href="./">InstallReady</a><a href="https://github.com/Mresyzz/InstallReady">Open source on GitHub ↗</a></header><main className="shell"><section className="hero"><span className="eyebrow">Commit-pinned Linux review</span><h1>Find installer breakage before users do.</h1><p>Check shell installers across Debian, Ubuntu, and Alpine with deterministic rules. Run the real container check in your own GitHub Actions workflow.</p><div className="panel"><form className="form" onSubmit={(event) => { event.preventDefault(); void review(); }}><input className="input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="owner/repository or GitHub URL" aria-label="GitHub repository"/><button className="button" disabled={busy}>{busy ? "Scanning…" : "Check repository"}</button></form><div className="examples"><button className="chip" onClick={() => setInput("Mresyzz/opsscript-gate")}>OpsScript Gate</button><button className="chip" onClick={() => setInput("nvm-sh/nvm")}>nvm</button><a className="chip" href="https://github.com/Mresyzz/InstallReady#private-script-review">Private script review</a></div>{error && <div className="message" role="alert">{error}</div>}<div className="notice">The static scan runs in your browser. No repository code is executed and no AI model is called. GitHub API limits apply to anonymous public scans.</div></div></section>{scan && <section className="result" aria-live="polite"><p className="eyebrow">{scan.owner}/{scan.repo} · {scan.sha.slice(0, 12)}</p><h2>{scan.script}</h2><p className="muted">{scan.candidates.length} candidate script(s) found. This report is static analysis only.</p><div className="grid">{scan.report.distroCompatibility.map((item) => <div className="card" key={item.distro}><strong>{item.displayName}</strong><span className={item.status === "Potential issue" ? "warn" : "ok"}>{item.status}</span></div>)}</div>{scan.report.findings.length ? <div>{scan.report.findings.map((finding) => <div className="finding" key={finding.id}><strong>Line {finding.line}: {finding.message}</strong><div className="muted">{finding.hint}</div></div>)}</div> : <div className="card ok">No supported static rule matched.</div>}<div className="actions"><button className="secondary" onClick={() => void copy(workflow)}>Copy GitHub Actions workflow</button><button className="secondary" onClick={() => void copy(report)}>Copy Markdown report</button><a className="secondary" href={`https://github.com/${scan.owner}/${scan.repo}/blob/${scan.sha}/${scan.script}`} target="_blank" rel="noreferrer">View source ↗</a></div><details className="card" style={{ marginTop: 16 }}><summary>Show generated workflow</summary><pre className="code">{workflow}</pre></details></section>}</main><footer className="shell footer">InstallReady is open source under MIT. Static rules are heuristic; runtime evidence comes from OpsScript Gate in GitHub Actions.</footer></>;
}

createRoot(document.getElementById("root")!).render(<App />);
