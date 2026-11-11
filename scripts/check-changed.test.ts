// @effect-diagnostics nodeBuiltinImport:off
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { expect } from "vite-plus/test";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Option from "effect/Option";
import { assert, describe, it } from "@effect/vitest";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import * as TestClock from "effect/testing/TestClock";

import {
  adjacentTests,
  comparisonBase,
  defaultConcurrency,
  gitLines,
  runSteps,
  splitTests,
  type Step,
} from "./check-changed.ts";
import { ciRequirements, decide, readWorkspace } from "../.github/scripts/ci-changes.cjs";

const GiB = 1024 ** 3;

describe("check:changed", () => {
  it("bounds the default concurrency by the scarcer of cores and available memory", () => {
    assert.strictEqual(defaultConcurrency(32, 128 * GiB), 16);
    assert.strictEqual(defaultConcurrency(32, 20 * GiB), 3);
    assert.strictEqual(defaultConcurrency(4, 15 * GiB), 2);
    assert.strictEqual(defaultConcurrency(4, 2 * GiB), 1);
    assert.strictEqual(defaultConcurrency(1, 64 * GiB), 1);
  });

  it.effect(
    "keeps weighted steps within the budget, in order, and serial steps one at a time",
    () =>
      Effect.gen(function* () {
        const startedAt: Record<string, number> = {};
        let active = 0;
        let maxActive = 0;
        let serialActive = 0;
        let maxSerial = 0;
        const step = (
          name: string,
          options: { weight?: number; serial?: boolean } = {},
        ): Step<never> => {
          const slots = Math.min(options.weight ?? 1, 3);
          return {
            name,
            ...options,
            run: Effect.gen(function* () {
              startedAt[name] = (yield* Clock.currentTimeMillis) / 1000;
              active += slots;
              maxActive = Math.max(maxActive, active);
              if (options.serial) maxSerial = Math.max(maxSerial, ++serialActive);
              yield* Effect.sleep("1 second");
              active -= slots;
              if (options.serial) serialActive--;
              return { ok: true, output: "" };
            }),
          };
        };
        const fiber = yield* runSteps(
          [
            step("light 1"),
            // Above the budget, so it holds every slot rather than never starting.
            step("heavy", { weight: 5 }),
            step("pair", { weight: 2 }),
            step("light 2"),
            step("test 1", { serial: true }),
            step("test 2", { serial: true }),
          ],
          { concurrency: 3, timeoutSeconds: 60 },
        ).pipe(Effect.forkChild);
        yield* TestClock.adjust("10 seconds");
        const results = yield* Fiber.join(fiber);

        assert.deepStrictEqual(
          results.map((result) => result.outcome),
          ["pass", "pass", "pass", "pass", "pass", "pass"],
        );
        assert.strictEqual(maxActive, 3);
        // Lighter steps queued behind the heavy one never start ahead of it.
        assert.deepStrictEqual(startedAt, {
          "light 1": 0,
          heavy: 1,
          pair: 2,
          "light 2": 2,
          "test 1": 3,
          "test 2": 4,
        });
        assert.strictEqual(maxSerial, 1);
      }),
  );

  it.effect("interrupts a step at its timeout and reports TIMEOUT, apart from FAIL", () =>
    Effect.gen(function* () {
      let interrupted = false;
      const fiber = yield* runSteps(
        [
          {
            name: "hangs",
            run: Effect.never.pipe(
              Effect.onInterrupt(() => Effect.sync(() => (interrupted = true))),
            ),
          },
          { name: "fails", run: Effect.succeed({ ok: false, output: "error" }) },
          { name: "passes", run: Effect.succeed({ ok: true, output: "" }) },
        ],
        { concurrency: 3, timeoutSeconds: 10 },
      ).pipe(Effect.forkChild);
      yield* TestClock.adjust("9 seconds");
      assert.isFalse(interrupted);
      yield* TestClock.adjust("1 second");
      const results = yield* Fiber.join(fiber);

      assert.isTrue(interrupted);
      assert.deepStrictEqual(
        results.map(({ name, outcome, time }) => [name, outcome, time]),
        [
          ["hangs", "TIMEOUT", "killed after 10s"],
          ["fails", "FAIL", "0.0s"],
          ["passes", "pass", "0.0s"],
        ],
      );
    }),
  );

  it("runs the .github/scripts node:test files with node --test, not vitest", () => {
    assert.deepStrictEqual(
      splitTests([
        "apps/server/src/ws.test.ts",
        ".github/scripts/fixture.test.cjs",
        ".github\\scripts\\other-fixture.test.cjs",
        "scripts/check-changed.test.ts",
      ]),
      {
        vitestTests: ["apps/server/src/ws.test.ts", "scripts/check-changed.test.ts"],
        nodeTests: [".github/scripts/fixture.test.cjs", ".github\\scripts\\other-fixture.test.cjs"],
      },
    );
  });

  it("selects standalone logic suites on helper and dependency changes, and keeps component suites", async () => {
    const setup = "apps/web/src/components/settings/CodexSetupSection";
    const row = "apps/web/src/components/chat/V2LifecycleRow";
    const integrations = "apps/web/src/components/settings/IntegrationsSettings";
    const changed = [setup, row, integrations].map((stem) => stem + ".tsx");
    const logicTest = (stem: string) => stem + ".logic.test.ts";
    const select = (files: string[], present = files, dependenciesChanged = false) =>
      adjacentTests(
        NodePath.join(import.meta.dirname, ".."),
        files,
        present,
        dependenciesChanged,
      ).pipe(Effect.provide(NodeServices.layer), Effect.runPromise);
    expect(await select(changed)).toEqual(new Set([logicTest(integrations)]));
    expect(await select([setup + ".logic.ts", row + ".logic.ts"], [setup + ".logic.ts"])).toEqual(
      new Set([logicTest(setup), logicTest(row)]),
    );
    expect(await select([logicTest(row)])).toEqual(new Set([logicTest(row)]));
    expect(await select([...changed, "pnpm-lock.yaml"], changed, true)).toEqual(
      new Set([logicTest(setup), logicTest(row), logicTest(integrations)]),
    );
    expect(await select(["apps/mobile/package.json"], [], true)).toEqual(new Set());
  });

  it.effect("fails instead of returning an empty file list when git exits nonzero", () => {
    const spawner = (exitCode: number) =>
      ChildProcessSpawner.make(() =>
        Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(1),
            exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(exitCode)),
            isRunning: Effect.succeed(false),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.encodeText(Stream.make(exitCode === 0 ? "a.ts\nb.ts\n" : "")),
            stderr: Stream.encodeText(
              Stream.make(exitCode === 0 ? "" : "fatal: index file corrupt"),
            ),
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        ),
      );
    return Effect.gen(function* () {
      const listed = yield* gitLines("/repo", ["ls-files"]).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner(0)),
      );
      assert.deepStrictEqual(listed, ["a.ts", "b.ts"]);
      const error = yield* gitLines("/repo", ["ls-files"]).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner(128)),
        Effect.flip,
      );
      assert.strictEqual(
        error,
        "check:changed: git ls-files exited with 128: fatal: index file corrupt",
      );
    });
  });

  it.each([
    [".github/liverary-release.json", ["@t3tools/scripts", "@t3tools/web"]],
    [".github/upstream-maintenance.md", []],
    [".github/ISSUE_TEMPLATE/config.yml", []],
    ["knip.jsonc", []],
    [".github/workflows/release.yml", ["@t3tools/scripts"]],
    [".github/actions/setup-ci-deps/action.yml", ["@t3tools/scripts"]],
    [".github/scripts/ci-changes.cjs", ["@t3tools/scripts"]],
    [".github/triage/PLAYBOOK.md", ["@t3tools/evals", "@t3tools/scripts", "t3"]],
    ["apps/web/package.json", ["@t3tools/scripts", "@t3tools/web"]],
    ["apps/server/package.json", ["@t3tools/evals", "@t3tools/scripts", "t3"]],
  ])("limits checks for repository automation and metadata: %s", (file, expected) => {
    assert.deepStrictEqual(decide([file], readWorkspace()).affected, expected);
  });

  it("builds the desktop app when a change can affect the bundle or its verification", () => {
    const docsAndLauncher = [
      "README.md",
      ".github/ISSUE_TEMPLATE/config.yml",
      "Liverary-dev.cmd",
      "실행기.cmd",
    ];
    assert.deepStrictEqual(decide(docsAndLauncher, readWorkspace()).affected, []);
    assert.deepStrictEqual(ciRequirements(docsAndLauncher), {
      buildDesktop: false,
      prepareRuntime: false,
    });
    const checkOnly = [
      ".github/workflows/check-upstream.yml",
      ".github/workflows/publish-release.yml",
      ".github/scripts/retire-releases.cjs",
      "apps/web/src/session.browser.test.tsx",
      "apps/mobile/src/index.ts",
      ".agents/skills/fixture.test.ts",
    ];
    for (const file of checkOnly) {
      assert.deepStrictEqual(
        ciRequirements([file]),
        { buildDesktop: false, prepareRuntime: true },
        file,
      );
    }
    for (const file of [
      "apps/web/src/session.tsx",
      "apps/web/public/manual.md",
      "apps/desktop/src/main.ts",
      "apps/server/src/bin.ts",
      "packages/contracts/src/index.ts",
      "apps/mobile/deps/example/package.json",
      "pnpm-lock.yaml",
      ".github/liverary-release.json",
      ".github/workflows/ci.yml",
      ".github/actions/setup-ci-deps/action.yml",
      "scripts/build-desktop-artifact.ts",
      "apps/web/scripts/verify-built-boot.ts",
      "unrecognized-config.json",
    ]) {
      assert.deepStrictEqual(
        ciRequirements([...checkOnly, file]),
        { buildDesktop: true, prepareRuntime: true },
        file,
      );
    }
  });

  it.each([
    "packages/shared/src/testing/longTempDir.ts",
    "packages/shared/src/testing/providerEnv.ts",
    "package.json",
    "pnpm-lock.yaml",
    "unrecognized-config.json",
  ])("tests every package when shared setup or an unknown path %s changes", (file) => {
    const packages = readWorkspace();
    assert.deepStrictEqual(
      decide([file], packages).affected,
      packages.map(({ name }) => name).sort(),
    );
  });
});

// Hooks export GIT_DIR and GIT_INDEX_FILE, and user config or the default
// ~/.config/git/ignore can ignore or sign fixture files.
// Git recognizes /dev/null on Windows but rejects Node's \\.\nul device path.
const fixtureConfig = {
  "core.excludesFile": "/dev/null",
  "user.name": "Fixture",
  "user.email": "fixture@example.invalid",
};
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_COUNT: String(Object.keys(fixtureConfig).length),
  ...Object.fromEntries(
    Object.entries(fixtureConfig).flatMap(([key, value], index) => [
      [`GIT_CONFIG_KEY_${index}`, key],
      [`GIT_CONFIG_VALUE_${index}`, value],
    ]),
  ),
};

// History A -> B -> C, with HEAD at C. Each remote's main points at A or B.
function fixture(remotes: Record<string, "A" | "B">) {
  const root = NodeFS.realpathSync(
    NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-check-changed-")),
  );
  const commits: Record<string, string> = {};
  try {
    const write = (file: string, content: string) => {
      const path = NodePath.join(root, file);
      NodeFS.mkdirSync(NodePath.dirname(path), { recursive: true });
      NodeFS.writeFileSync(path, content);
    };
    const git = (...args: Array<string>) =>
      NodeChildProcess.execFileSync("git", args, { cwd: root, encoding: "utf8", env }).trim();
    git("init");
    for (const name of ["A", "B", "C"]) {
      write(`${name}.txt`, name);
      git("add", ".");
      git("commit", "-m", name);
      commits[name] = git("rev-parse", "HEAD");
    }
    for (const [remote, commit] of Object.entries(remotes)) {
      git("remote", "add", remote, NodePath.join(root, "missing"));
      git("update-ref", `refs/remotes/${remote}/main`, commits[commit]!);
    }
  } catch (error) {
    NodeFS.rmSync(root, { recursive: true, force: true });
    throw error;
  }
  return {
    commits,
    root,
    [Symbol.dispose]() {
      NodeFS.rmSync(root, { recursive: true, force: true });
    },
  };
}

const compare = (root: string, ref: Option.Option<string>) =>
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    return yield* comparisonBase(root, ref).pipe(
      Effect.provideService(
        ChildProcessSpawner.ChildProcessSpawner,
        ChildProcessSpawner.make((command) => spawner.spawn(ChildProcess.setEnv(command, env))),
      ),
    );
  }).pipe(Effect.provide(NodeServices.layer), Effect.runPromise);

it.each(["upstream", "team/upstream"])(
  "compares against %s/main when the fork's origin/main lags it",
  async (remote) => {
    using project = fixture({ origin: "A", [remote]: "B" });
    const result = await compare(project.root, Option.none());
    assert.strictEqual(result.base, project.commits.B);
    assert.strictEqual(result.ref, remote + "/main");
  },
);

it("compares against an explicit ref instead of the closest remote main", async () => {
  using project = fixture({ origin: "A", upstream: "B" });
  const result = await compare(project.root, Option.some("origin/main"));
  assert.strictEqual(result.base, project.commits.A);
  assert.strictEqual(result.ref, "origin/main");
});

function launcherFixture(platform: NodeJS.Platform = "win32") {
  const root = NodeFS.realpathSync(
    NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3 checks & (fixture) ")),
  );
  const write = (file: string, content: string) => {
    const path = NodePath.join(root, file);
    NodeFS.mkdirSync(NodePath.dirname(path), { recursive: true });
    NodeFS.writeFileSync(path, content);
  };
  for (const file of [
    "scripts/check-changed.ts",
    "scripts/check-changed-command.ts",
    ".github/scripts/ci-changes.cjs",
  ]) {
    write(file, NodeFS.readFileSync(NodePath.join(import.meta.dirname, "..", file), "utf8"));
  }
  write(".gitignore", "node_modules/\nrecords/\n");
  write("pnpm-workspace.yaml", "packages:\n  - packages/*\n");
  write(
    "package.json",
    JSON.stringify({
      type: "module",
      scripts: {
        "knip:check:files": "knip --include files",
        "knip:check:exports": "knip --exports",
      },
    }),
  );
  write("packages/example/package.json", JSON.stringify({ name: "example" }));
  const source = "packages/example/space & (draft) %PATH% ! 研究.ts";
  write(source, "export const value = 1;\n");
  write(".repos/library/reference.ts", "export const reference = 0;\n");
  write(
    "node_modules/vite-plus/package.json",
    JSON.stringify({ type: "module", exports: { "./bin": "./cli.js" } }),
  );
  write(
    "node_modules/vite-plus/cli.js",
    `
    import fs from 'node:fs';
    import path from 'node:path';
    const args = process.argv.slice(2);
    fs.writeFileSync(path.join(process.env.RECORDS, process.pid + '.json'), JSON.stringify({ args, cwd: process.cwd() }));
    console.log('fixture stdout: ' + args[0]);
    console.error('fixture stderr: ' + args[0]);
    process.exit(args[0] === process.env.FAIL_STEP ? 23 : 0);
  `,
  );
  // Keep the fixture launcher shell-free while selecting the command batching platform.
  write(
    "scripts/check-changed.ts",
    NodeFS.readFileSync(NodePath.join(import.meta.dirname, "check-changed.ts"), "utf8")
      .replace("vitePlusCommand(args, platform)", 'vitePlusCommand(args, "win32")')
      .replace(
        "Effect.provide(NodeServices.layer),",
        `Effect.provideService(HostProcess.Platform, ${JSON.stringify(platform)}), Effect.provide(NodeServices.layer),`,
      ),
  );
  for (const name of ["effect", "@effect/platform-node", "@t3tools/shared"]) {
    const dest = NodePath.join(root, "node_modules", name);
    NodeFS.mkdirSync(NodePath.dirname(dest), { recursive: true });
    NodeFS.symlinkSync(
      NodeFS.realpathSync(NodePath.join(import.meta.dirname, "node_modules", name)),
      dest,
      "junction",
    );
  }
  const git = (...args: Array<string>) =>
    NodeChildProcess.execFileSync("git", args, { cwd: root, stdio: "pipe", env });
  git("init");
  git("add", ".");
  git(
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "fixture",
  );
  const records = NodePath.join(root, "records");
  NodeFS.mkdirSync(records);
  return {
    root,
    source,
    write,
    run(failStep = "") {
      return NodeChildProcess.spawnSync(process.execPath, ["scripts/check-changed.ts", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        env: { ...env, TEMP: NodeOS.tmpdir(), RECORDS: records, FAIL_STEP: failStep },
      });
    },
    calls: (): Array<{ args: Array<string>; cwd: string }> =>
      NodeFS.readdirSync(records).map((file) =>
        JSON.parse(NodeFS.readFileSync(NodePath.join(records, file), "utf8")),
      ),
    [Symbol.dispose]() {
      NodeFS.rmSync(root, { recursive: true, force: true });
    },
  };
}

it.each([
  {
    platform: "win32",
    extraFiles: 0,
    compilerFiles: 400,
    brandFile: "assets/custom/liverary-app-icon.svg",
  },
  { platform: "win32", extraFiles: 400, compilerFiles: 0, brandFile: undefined },
  { platform: "linux", extraFiles: 201, compilerFiles: 0, brandFile: undefined },
  { platform: "linux", extraFiles: 0, compilerFiles: 175, brandFile: undefined },
] as const)(
  "checks changed source paths with $platform batching and $extraFiles extra files",
  ({ platform, extraFiles, compilerFiles, brandFile }) => {
    using project = launcherFixture(platform);
    project.write(project.source, "export const value = 2;\n");
    if (brandFile) project.write(brandFile, "<svg/>\n");
    const sources = [project.source];
    for (let index = 0; index < extraFiles; index++) {
      const source = `packages/example/${"long-source-name-".repeat(6)}${index}.test.ts`;
      project.write(source, "export const value = 1;\n");
      sources.push(source);
    }
    const compilerSources = Array.from({ length: compilerFiles }, (_, index) => {
      const source = `apps/web/src/${"long-component-name-".repeat(6)}${index}.tsx`;
      project.write(source, "export {};\n");
      sources.push(source);
      return source;
    });
    project.write(".repos/library/reference.ts", "export const reference = 1;\n");
    project.write(".repos/library/reference.test.ts", 'throw new Error("vendored test");\n');
    project.write(".repos/library/package.json", JSON.stringify({ name: "vendored" }));
    const result = project.run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const calls = project.calls();
    expect(
      calls.filter(({ args }) => args.includes("icons:check")).map(({ args }) => args),
    ).toEqual(brandFile ? [["run", "icons:check", "--brand", "production"]] : []);
    const lintCalls = calls.filter(({ args }) => args[0] === "lint");
    expect(lintCalls.flatMap(({ args }) => args.slice(2)).sort()).toEqual(sources.sort());
    expect(lintCalls.every(({ cwd }) => cwd === project.root)).toBe(true);
    const testCalls = calls.filter(({ args }) => args[0] === "test" && !args.includes("-t"));
    const compilerCalls = calls.filter(({ args }) => args[0] === "test" && args.includes("-t"));
    if (platform === "win32") {
      expect(
        lintCalls.every(
          ({ args }) =>
            args.slice(2).reduce((size, file) => size + JSON.stringify(file).length + 1, 0) <=
            24_000,
        ),
      ).toBe(true);
      expect(
        compilerCalls.every(
          ({ args }) =>
            args.reduce((size, arg) => size + JSON.stringify(arg).length + 1, 0) <= 24_000,
        ),
      ).toBe(true);
      if (compilerFiles > 0) expect(compilerCalls.length).toBeGreaterThan(1);
    } else {
      expect(lintCalls).toHaveLength(1);
      expect(testCalls).toHaveLength(extraFiles > 0 ? 1 : 0);
      expect(compilerCalls).toHaveLength(compilerFiles > 0 ? 1 : 0);
    }
    for (const source of compilerSources) {
      expect(
        compilerCalls.filter(({ args }) => new RegExp(args.at(-1)!).test(`compiles ${source}`)),
      ).toHaveLength(1);
    }
    const testPaths = testCalls.flatMap(({ args }) => args.slice(5));
    expect(testPaths.sort()).toEqual(
      sources.filter((source) => source.endsWith(".test.ts")).sort(),
    );
    expect(calls.some(({ args }) => args[0] === "fmt" && args.includes(project.source))).toBe(true);
    expect(calls.flatMap(({ args }) => args).some((arg) => arg.startsWith(".repos/"))).toBe(false);
    expect(calls.some(({ args }) => args[0] === "run" && args.includes("typecheck"))).toBe(true);
    expect(calls.some(({ args }) => args[0] === "install")).toBe(false);
    expect(result.stdout).toContain("fixture stdout: lint");
    expect(result.stdout).toContain("fixture stderr: lint");
  },
);

it("lints an Astro component and runs knip when only it changed", () => {
  using project = launcherFixture();
  const page = "packages/example/Page.astro";
  project.write(page, "---\nconst title = 1;\n---\n<h1>{title}</h1>\n");
  const result = project.run();
  expect(result.status, result.stdout + result.stderr).toBe(0);
  const calls = project.calls();
  expect(calls.find(({ args }) => args[0] === "lint")?.args).toEqual([
    "lint",
    "--no-error-on-unmatched-pattern",
    page,
  ]);
  const commands = calls.map(({ args }) => args);
  expect(commands).toContainEqual(["exec", "knip", "--include", "files"]);
  expect(commands).toContainEqual(["exec", "knip", "--exports"]);
});

it.each(["install", "lint", "test"])("reports a failing %s step with its output", (step) => {
  using project = launcherFixture();
  project.write(project.source, "export const value = 2;\n");
  if (step === "test") project.write("packages/example/source.test.ts", "export {};\n");
  project.write(
    "packages/example/package.json",
    JSON.stringify({ name: "example", version: "1.0.1" }),
  );
  const result = project.run(step);
  expect(result.status, result.stdout + result.stderr).toBe(1);
  const install = project.calls().find(({ args }) => args[0] === "install");
  expect(install?.args, result.stdout + result.stderr).toEqual([
    "install",
    "--lockfile-only",
    "--ignore-scripts",
  ]);
  expect(install?.cwd).not.toBe(project.root);
  expect(result.stdout + result.stderr).toContain(`fixture stdout: ${step}`);
  expect(result.stdout + result.stderr).toContain(`fixture stderr: ${step}`);
  const label = step === "install" ? "unused patches" : step === "test" ? "test (1 files)" : "lint";
  expect(result.stdout).toContain(`FAIL  ${label}`);
  if (step === "test") {
    expect(result.stdout.indexOf("fixture stdout: test")).toBeLessThan(
      result.stdout.indexOf("> vp test (1 files)"),
    );
  }
  if (step === "lint") expect(result.stdout).toContain("pass  unused patches");
  expect(
    NodeFS.existsSync(NodePath.join(project.root, "node_modules/.cache/check-changed.json")),
  ).toBe(false);
});
