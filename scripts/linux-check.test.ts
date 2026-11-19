import { describe, expect, it } from "vite-plus/test";

import {
  forkSuite,
  parseCheckSummary,
  parseOptions,
  parseTestFailures,
  toWslPath,
} from "./linux-check.ts";

describe("parseOptions", () => {
  it("applies defaults and parses flags", () => {
    expect(parseOptions(["--base", "abc"])).toEqual({
      base: "abc",
      distro: "Ubuntu-24.04",
      concurrency: 4,
      upstream: undefined,
      out: undefined,
      keep: false,
      verbose: false,
    });
    expect(
      parseOptions(["--base", "abc", "--distro", "Debian", "--concurrency", "2", "--keep"]),
    ).toMatchObject({ distro: "Debian", concurrency: 2, keep: true });
  });

  it.each([[[]], [["--base", "abc", "--concurrency", "0"]], [["--base", "abc", "--nope"]]])(
    "rejects %j",
    (args) => {
      expect(() => parseOptions(args)).toThrow();
    },
  );
});

describe("toWslPath", () => {
  it.each([
    ["C:\\Users\\studcom\\Desktop\\레포\\Liverary", "/mnt/c/Users/studcom/Desktop/레포/Liverary"],
    ["C:/Users/studcom/Desktop/레포/Liverary/", "/mnt/c/Users/studcom/Desktop/레포/Liverary"],
    ["D:\\a b\\c.sh", "/mnt/d/a b/c.sh"],
    ["E:\\", "/mnt/e"],
  ])("%s", (input, expected) => {
    expect(toWslPath(input)).toBe(expected);
  });

  it("rejects paths without a drive letter", () => {
    expect(() => toWslPath("\\\\wsl$\\Ubuntu\\home")).toThrow();
  });
});

const checkLog = [
  "\u001b[32m> vp fmt  pass  1.2s\u001b[39m",
  " \u001b[31mFAIL\u001b[39m  \u001b[2m|server|\u001b[22m src/a.test.ts > Service > keeps state",
  " FAIL  |server| src/a.test.ts > Service > keeps state",
  " FAIL  |web| src/b.browser.test.tsx > renders",
  "\u001b[41m\u001b[1m FAIL \u001b[22m\u001b[49m \u001b[30m\u001b[43m t3 \u001b[49m\u001b[39m src/c.test.ts\u001b[2m > \u001b[22mrefuses callers",
  " FAIL  scripts/broken.test.ts [ scripts/broken.test.ts ]",
  "check:changed summary",
  "  pass  fmt  1.2s",
  "  FAIL  test (3 files)  40.5s",
  "  TIMEOUT  typecheck  killed after 3600s",
  "  knip skipped: no code or manifest changed",
].join("\n");

describe("log parsing", () => {
  it("reads the step summary", () => {
    expect(parseCheckSummary(checkLog)).toEqual([
      { outcome: "pass", name: "fmt", time: "1.2s" },
      { outcome: "FAIL", name: "test (3 files)", time: "40.5s" },
      { outcome: "TIMEOUT", name: "typecheck", time: "killed after 3600s" },
    ]);
  });

  it("groups failing tests by file without ANSI or duplicates", () => {
    expect(Object.fromEntries(parseTestFailures(checkLog))).toEqual({
      "src/a.test.ts": ["Service > keeps state"],
      "src/b.browser.test.tsx": ["renders"],
      "src/c.test.ts": ["refuses callers"],
      "scripts/broken.test.ts": ["(file failed)"],
    });
  });
});

describe("forkSuite", () => {
  it("keeps existing files and splits node:test files", () => {
    const added = [
      "apps/server/src/b.test.ts",
      "apps/web/src/a.browser.test.tsx",
      ".github/scripts/release.test.mjs",
      "apps/server/src/removed.test.ts",
      "apps/server/src/b.test.ts",
    ];
    const existing = new Set(added.filter((file) => !file.includes("removed")));
    expect(forkSuite(added, existing)).toEqual({
      vitest: ["apps/server/src/b.test.ts", "apps/web/src/a.browser.test.tsx"],
      node: [".github/scripts/release.test.mjs"],
    });
  });
});
