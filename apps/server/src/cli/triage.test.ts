// @effect-diagnostics nodeBuiltinImport:off - CLI integration spawns a fake agent from PATH.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { TRIAGE_PROMPT_FILE_NAME } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as NetService from "@t3tools/shared/Net";
import { assert, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as TestConsole from "effect/testing/TestConsole";
import { Command } from "effect/cli";
import { vi } from "vite-plus/test";

import { cli } from "../binCli.ts";
import { buildTriageLaunchPrompt } from "../triage/triagePrompt.ts";
import { findTriageAgents } from "./triage.ts";

it.layer(NodeServices.layer)("liverary triage", (it) => {
  it.effect("offers both desktop executables when neither command is on PATH", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped();
      const build = path.join(
        home,
        "Claude-Data",
        "claude_pzs8sxrjxfjjc",
        "claude-code",
        "2.1.0",
        "aaaaaaaaaaaa",
      );
      yield* fs.makeDirectory(build, { recursive: true });
      yield* fs.writeFileString(path.join(build, ".verified"), "a".repeat(64));
      const claude = path.join(build, "claude.exe");
      yield* fs.writeFileString(claude, "");
      const codexDirectory = path.join(home, "OpenAI", "Codex", "bin", "a".repeat(16));
      yield* fs.makeDirectory(codexDirectory, { recursive: true });
      const codex = path.join(codexDirectory, "codex.exe");
      yield* fs.writeFileString(codex, "");
      const installed = yield* findTriageAgents().pipe(
        Effect.provideService(HostProcess.HomeDirectory, home),
        Effect.provideService(HostProcess.Platform, "win32"),
        Effect.provideService(HostProcess.Environment, {
          LOCALAPPDATA: home,
          APPDATA: home,
          PATH: "",
        }),
      );
      expect(installed.map((agent) => agent.command)).toEqual([claude, codex]);
    }),
  );
});

const FAILING_AGENT_POSIX = `#!/bin/sh
echo "Error: There is not enough space on the disk. (os error 112)" >&2
exit 1
`;
const FAILING_AGENT_WINDOWS = `@echo Error: There is not enough space on the disk. (os error 112) 1>&2
@exit /b 1
`;

it.live("a failed agent launch points at the prompt it could not run", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-triage-cli-" });
    const binDir = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-triage-bin-" });
    const codexHome = NodePath.join(baseDir, "codex-home");
    NodeFS.writeFileSync(NodePath.join(binDir, "codex"), FAILING_AGENT_POSIX, { mode: 0o755 });
    NodeFS.writeFileSync(NodePath.join(binDir, "codex.cmd"), FAILING_AGENT_WINDOWS);
    yield* Effect.acquireRelease(
      // PATH holds only the fake agent, so a broken fixture can never fall through to a real codex.
      Effect.sync(() => {
        vi.stubEnv("PATH", binDir);
        vi.stubEnv("CODEX_HOME", codexHome);
      }),
      () => Effect.sync(() => vi.unstubAllEnvs()),
    );
    const previousExitCode = process.exitCode;
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        process.exitCode = previousExitCode;
      }),
    );

    yield* Command.runWith(cli, { version: "0.0.0" })([
      "triage",
      "--agent",
      "codex",
      "--base-dir",
      baseDir,
    ]);
    const output = (yield* TestConsole.logLines).join("\n");

    assert.equal(process.exitCode, 1);
    const promptFilePath = NodeFS.readdirSync(baseDir, { recursive: true, encoding: "utf8" })
      .filter((entry) => NodePath.basename(entry) === TRIAGE_PROMPT_FILE_NAME)
      .map((entry) => NodePath.join(baseDir, entry))[0];
    assert.isDefined(promptFilePath);
    assert.include(output, promptFilePath);
    assert.include(output, buildTriageLaunchPrompt(promptFilePath));
    assert.include(output, NodePath.join(NodePath.dirname(promptFilePath), "context.md"));
    assert.include(output, `Codex keeps its state in ${codexHome}.`);
    assert.include(output, "set CODEX_HOME to a folder on another drive");
  }).pipe(
    Effect.provide(
      Layer.mergeAll(NodeServices.layer, NodeCrypto.layer, NetService.layer, TestConsole.layer),
    ),
  ),
);
