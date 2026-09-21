import { describe, it, expect } from "vitest";
import { escapeXml, generateInstallReadyBadge } from "../lib/badge";
import { GET } from "../app/api/badges/[owner]/[repo]/route";
import { NextRequest } from "next/server";

describe("SVG Badge Generation & XML Security Boundary", () => {
  it("strictly XML-escapes untrusted dynamic inputs", () => {
    const raw = `<script>alert("xss")</script> & 'foo'`;
    const escaped = escapeXml(raw);
    expect(escaped).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &apos;foo&apos;");
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
  });

  it("generates neutral badge for not_checked state", () => {
    const svg = generateInstallReadyBadge({ type: "not_checked" });
    expect(svg).toContain("not checked");
    expect(svg).toContain("#6e7681"); // 中性灰
    expect(svg).not.toContain("#2da44e"); // 绝不是绿色
  });

  it("generates blue informative badge for static_checked state", () => {
    const svg = generateInstallReadyBadge({ type: "static_checked" });
    expect(svg).toContain("static checked");
    expect(svg).toContain("#0969da"); // 稳健蓝
    // 关键安全断言：静态检查绝不可渲染绿色 passing 徽章
    expect(svg).not.toContain("#2da44e");
  });

  it("generates green passing badge ONLY when all runtime tests pass", () => {
    const svg = generateInstallReadyBadge({
      type: "runtime_verified",
      passed: 4,
      total: 4,
    });
    expect(svg).toContain("4/4 passing");
    expect(svg).toContain("#2da44e"); // 绿色
  });

  it("generates red failing badge when runtime tests fail", () => {
    const svg = generateInstallReadyBadge({
      type: "runtime_verified",
      passed: 3,
      total: 4,
    });
    expect(svg).toContain("3/4 passing");
    expect(svg).toContain("#cf222e"); // 红色
    expect(svg).not.toContain("#2da44e");
  });
});

describe("Badge API Route (/api/badges/[owner]/[repo])", () => {
  it("returns not_checked badge when no runtime verification data exists", async () => {
    const req = new NextRequest("http://localhost:3000/api/badges/unverified-org/unknown-repo");
    const context = {
      params: Promise.resolve({ owner: "unverified-org", repo: "unknown-repo" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    const svg = await res.text();
    expect(svg).toContain("not checked");
    expect(svg).not.toContain("4/4 passing");
    expect(svg).not.toContain("#2da44e");
  });

  it("returns not_checked badge even when query parameters are supplied if no file exists", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/badges/test-owner/test-repo?commit=0123456789abcdef0123456789abcdef01234567&script=install.sh"
    );
    const context = {
      params: Promise.resolve({ owner: "test-owner", repo: "test-repo" }),
    };

    const res = await GET(req, context);
    expect(res.status).toBe(200);
    const svg = await res.text();
    expect(svg).toContain("not checked");
    expect(svg).not.toContain("#2da44e");
  });
});
