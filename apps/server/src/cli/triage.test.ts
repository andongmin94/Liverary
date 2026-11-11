import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

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
