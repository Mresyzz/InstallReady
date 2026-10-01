import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeShellScript } from "../lib/analyzer";
import type { DistroCompatibilityStatus } from "../lib/findings";

interface FixtureDefinition {
  id: string;
  path: string;
  source: "synthetic";
  expected: Record<string, DistroCompatibilityStatus["status"]>;
  notes: string;
}

const benchmarkRoot = resolve(__dirname, "../benchmarks");
const fixtures = JSON.parse(
  readFileSync(resolve(benchmarkRoot, "manifest.json"), "utf8"),
) as FixtureDefinition[];

describe("static compatibility fixture baseline", () => {
  it("keeps every fixture explicitly labelled and synthetic", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
    for (const fixture of fixtures) {
      expect(fixture.source).toBe("synthetic");
      expect(fixture.notes.length).toBeGreaterThan(20);
    }
  });

  for (const fixture of fixtures) {
    it(`${fixture.id}: matches its reviewed status contract`, () => {
      const scriptPath = resolve(benchmarkRoot, fixture.path);
      const report = analyzeShellScript(fixture.path, readFileSync(scriptPath, "utf8"));
      const actual = Object.fromEntries(
        report.distroCompatibility.map((status) => [status.distro, status.status]),
      );

      expect(actual).toEqual(fixture.expected);
      expect(report.distroCompatibility.every((status) => status.evidence.length > 0)).toBe(true);
    });
  }
});
