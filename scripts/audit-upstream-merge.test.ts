import { expect, it } from "vite-plus/test";

import {
  brandingMatches,
  excludedTreeOf,
  isTestPath,
  isUiSourcePath,
  parseAddedLines,
  parseMigrationEntries,
  restrictedDependencies,
  uiLiterals,
} from "./audit-upstream-merge.ts";

it("numbers added lines per file and ignores removed lines and headers", () => {
  const diff = [
    "diff --git a/src/a.ts b/src/a.ts",
    "--- a/src/a.ts",
    "+++ b/src/a.ts",
    "@@ -3,2 +3,2 @@ context",
    "-old",
    "+new one",
    "++++ looks like a header",
    "diff --git a/gone.ts b/gone.ts",
    "--- a/gone.ts",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-removed",
    "diff --git a/new.ts b/new.ts",
    "--- /dev/null",
    "+++ b/new.ts",
    "@@ -0,0 +10 @@",
    "+first",
  ].join("\n");
  expect(parseAddedLines(diff)).toEqual([
    { path: "src/a.ts", line: 3, text: "new one" },
    { path: "src/a.ts", line: 4, text: "+++ looks like a header" },
    { path: "new.ts", line: 10, text: "first" },
  ]);
});

it.each([
  ['expect(out).toContain("This host is ready for T3\'s browser.");', ["T3's"]],
  ["`Stop T3 Code server process ${pid}`", ["T3 Code"]],
  ['expect(stdout).toBe("t3code wsl runtime test server 0.0.0\\n");', ["t3code"]],
  ['path.join(home, ".t3")', [".t3 path"]],
  ['NodePath.join(home, ".t3/ssh-launch/test-target")', [".t3 path"]],
  ['toContain("versions/1.2.5/t3")', ["t3 executable", "versions/<v>/t3"]],
  ['path.join(baseDir, "runtime/versions", version, "t3")', ["t3 executable"]],
  ['NodePath.join(state, "run-t3.sh")', ["t3 script"]],
  ['const scheme = "t3code://app";', ["t3code"]],
  ['appId: "com.t3tools.t3code"', ["t3code", "com.t3tools"]],
  ['install: "t3 service install",', ["t3 CLI hint"]],
  ["process.env.T3CODE_HOME ?? T3CODE_DEV_AUTH_TOKEN", []],
  ['import { x } from "@t3tools/contracts";', []],
  ['name: "t3_thread_create",', []],
  ["// oxlint-disable-next-line t3code/no-unreasoned-state-sync -- reason", []],
  ['readLegacy(".t3code/vcs.json", "t3.json")', []],
  ['"https://github.com/pingdotgg/t3code/issues"', []],
  ['"$schema": "https://t3.codes/schema.json"', []],
  ['path.join(home, ".t3code-old")', ["t3code"]],
  ['link: "https://t3.chat", dir: "st3/x"', []],
])("branding in %s", (line, expected) => {
  expect(brandingMatches(line)).toEqual(expected);
});

it("classifies paths", () => {
  expect(
    [
      "apps/server/src/cli/browser.test.ts",
      "packages/ssh/src/launcherTestHarness.ts",
      "apps/server/src/orchestration-v2/testkit/fixtures/simple/a.ndjson",
      "apps/web/src/components/Chat.browser.test.tsx",
      "apps/server/src/cloud/bootService.ts",
      "apps/server/src/update/LatestVersion.ts",
    ].map(isTestPath),
  ).toEqual([true, true, true, true, false, false]);
  expect(
    [
      "docs/guide.md",
      "apps/web/src/i18n/en.ts",
      "apps/web/src/components/clerk/A.tsx",
      "apps/docs/x",
    ].map(excludedTreeOf),
  ).toEqual(["docs/", "apps/web/src/i18n/", "apps/web/src/components/clerk/", undefined]);
  expect(
    [
      "apps/web/src/components/A.tsx",
      "apps/web/src/lib/a.ts",
      "apps/desktop/src/menu.ts",
      "apps/desktop/src/menu.test.ts",
    ].map(isUiSourcePath),
  ).toEqual([true, false, true, false]);
});

it.each([
  [
    "apps/web/src/A.tsx",
    '<Button aria-label="Close panel" title={"Reply"}>',
    ["Close panel", "Reply"],
  ],
  ["apps/web/src/A.tsx", "<span>Clone failed</span>", ["Clone failed"]],
  ["apps/web/src/A.tsx", "          Find on page in browser", ["Find on page in browser"]],
  [
    "apps/desktop/src/menu.ts",
    '{ label: "Check for Updates…", role: "about" }',
    ["Check for Updates…"],
  ],
  ["apps/web/src/A.tsx", '<Input placeholder="검색" label={copy.label} title="API_KEY" />', []],
  ["apps/web/src/A.tsx", "  readonly onUpdate: (next: Config) => Promise<boolean>;", []],
  ["apps/web/src/A.tsx", '<div className="flex gap-2">{count > 1 && <Badge />}</div>', []],
  ["apps/web/src/A.tsx", '<Item title="settings.general" label="chat-view" />', []],
  ["apps/desktop/src/a.ts", "          Plain words in a ts file", []],
])("UI literals in %s: %s", (path, line, expected) => {
  expect(uiLiterals(path, line)).toEqual(expected);
});

it("reads migration entries and newly added restricted dependencies", () => {
  const source = [
    "const migrationEntries = [",
    '  [81, "ProjectionMessageSearchText", Migration0081],',
    '  [82, "NativeSessionSync", Migration0082],',
    "] as const;",
  ].join("\n");
  expect([...parseMigrationEntries(source)]).toEqual([
    ["ProjectionMessageSearchText", 81],
    ["NativeSessionSync", 82],
  ]);

  const base = JSON.stringify({ dependencies: { "@clerk/shared": "1", react: "19" } });
  const head = JSON.stringify({
    dependencies: { "@clerk/shared": "1", "@clerk/react": "5", react: "19", "gt-react": "1" },
    devDependencies: { generaltranslation: "1", "gt-reactive": "1" },
  });
  expect(restrictedDependencies(base, head)).toEqual([
    "@clerk/react",
    "gt-react",
    "generaltranslation",
  ]);
  expect(restrictedDependencies("", JSON.stringify({ dependencies: { "@clerk/x": "1" } }))).toEqual(
    ["@clerk/x"],
  );
});
