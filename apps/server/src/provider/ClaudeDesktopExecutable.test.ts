import * as NodeURL from "node:url";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import { spawnAndCollect } from "@t3tools/provider-core/server/snapshotProbe";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as ChildProcess from "effect/process/ChildProcess";
import { findClaudeDesktopExecutable } from "./ClaudeDesktopExecutable.ts";

it.live("runs the Desktop handoff in a terminal and releases it after exit", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "claude-desktop-terminal-" });
    const fixture = path.join(cwd, "handoff.cjs");
    yield* fs.writeFileString(
      fixture,
      "process.exit(process.stdin.isTTY && process.stdout.isTTY ? 0 : 1);\n",
    );
    const program = `
      import * as Effect from 'effect/Effect';
      import * as NodeServices from '@effect/platform-node/NodeServices';
      import * as NodePtyAdapter from ${JSON.stringify(new URL("../terminal/NodePtyAdapter.ts", import.meta.url).href)};
      import { runClaudeDesktopCommand } from ${JSON.stringify(new URL("./ClaudeDesktopExecutable.ts", import.meta.url).href)};
      const opened = await Effect.runPromise(runClaudeDesktopCommand({
        executable: process.execPath,
        args: [${JSON.stringify(fixture)}],
        cwd: ${JSON.stringify(cwd)},
        environment: process.env,
      }).pipe(Effect.provide(NodePtyAdapter.layer), Effect.provide(NodeServices.layer)));
      if (!opened) process.exitCode = 1;
    `;
    const executable = yield* HostProcess.ExecutablePath;
    const result = yield* spawnAndCollect(
      executable,
      ChildProcess.make(executable, ["--input-type=module", "-e", program], {
        cwd: NodeURL.fileURLToPath(new URL("../../", import.meta.url)),
      }),
    );
    expect(result.code).toBe(0);
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

it.layer(NodeServices.layer)("Claude Desktop CLI", (it) => {
  it.effect.each(["win32", "darwin"] as const)(
    "selects the most recent complete Desktop build on %s",
    (platform) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const home = yield* fs.makeTempDirectoryScoped();
        const find = findClaudeDesktopExecutable().pipe(
          Effect.provideService(HostProcess.Platform, platform),
          Effect.provideService(HostProcess.HomeDirectory, home),
          Effect.provideService(HostProcess.Environment, { LOCALAPPDATA: home, APPDATA: home }),
        );
        expect(yield* find).toBeUndefined();
        const cache =
          platform === "win32"
            ? path.join(home, "Claude-Data", "claude_pzs8sxrjxfjjc", "claude-code")
            : path.join(home, "Library", "Application Support", "Claude", "claude-code");
        const file = platform === "win32" ? "claude.exe" : "claude.app/Contents/MacOS/claude";
        for (const [version, build, date] of [
          ["2.1.9", "111111111111", 3000],
          ["2.1.10", "eeeeeeeeeeee", 1000],
          ["2.1.10", "aaaaaaaaaaaa", 2000],
          ["2.1.11", "bbbbbbbbbbbb", null],
        ] as const) {
          const root = path.join(cache, version, build);
          const binary = path.join(root, file);
          yield* fs.makeDirectory(path.dirname(binary), { recursive: true });
          yield* fs.writeFileString(binary, "", { mode: 0o755 });
          if (date !== null) {
            const marker = path.join(root, ".verified");
            yield* fs.writeFileString(marker, build.padEnd(64, "0"));
            yield* fs.utimes(marker, date, date);
          }
        }
        expect(yield* find).toBe(path.join(cache, "2.1.10", "aaaaaaaaaaaa", file));
      }),
  );
});
