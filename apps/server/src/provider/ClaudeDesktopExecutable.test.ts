import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { findClaudeDesktopExecutable } from "./ClaudeDesktopExecutable.ts";

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
