import { redirect } from "next/navigation";
import Link from "next/link";
import { parseAndValidateGitHubUrl } from "@/lib/repo-url";
import { fetchRepoMetadata, GitHubApiError } from "@/lib/github";
import { AlertCircle, ArrowLeft, Terminal } from "lucide-react";

interface PageProps {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{ script?: string }>;
}

export default async function RepoResolverPage({ params, searchParams }: PageProps) {
  const { owner, repo } = await params;
  const { script } = await searchParams;

  const urlValidation = parseAndValidateGitHubUrl(`${owner}/${repo}`);
  if (!urlValidation.valid || !urlValidation.owner || !urlValidation.repo) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Invalid Repository Format</h1>
        <p className="text-sm text-muted-foreground">{urlValidation.error}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  try {
    const metadata = await fetchRepoMetadata(urlValidation.owner, urlValidation.repo);
    const targetCommit = metadata.headCommitSha;

    if (!targetCommit) {
      throw new Error("Unable to resolve default branch HEAD commit.");
    }

    const query = script ? `?script=${encodeURIComponent(script)}` : "";
    redirect(`/r/${urlValidation.owner}/${urlValidation.repo}/${targetCommit}${query}`);
  } catch (err: unknown) {
    let title = "Failed to Resolve Repository";
    let message = "An unexpected error occurred while fetching repository metadata from GitHub.";

    if (err instanceof GitHubApiError) {
      if (err.code === "NOT_FOUND") {
        title = "Repository Not Found";
        message = `The repository '${owner}/${repo}' does not exist on GitHub or is private. Only public repositories are supported in v0.1.`;
      } else if (err.code === "RATE_LIMITED") {
        title = "GitHub API Rate Limit Reached";
        message = "GitHub API hourly rate limit has been exceeded. Please wait a few moments or configure a GITHUB_TOKEN on the server.";
      } else if (err.code === "PRIVATE_REPO") {
        title = "Private Repository Not Supported";
        message = "InstallReady v0.1 only scans public repositories. Authenticated owner scans will be available in future releases.";
      } else {
        message = err.message;
      }
    } else if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      // 正常重定向被抛出，属于 Next.js 正常行为
      throw err;
    }

    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 mx-auto">
          <Terminal className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Try another repository</span>
          </Link>
        </div>
      </div>
    );
  }
}
