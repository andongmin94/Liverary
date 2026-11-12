import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import * as TestClock from "effect/testing/TestClock";
import { findCodexDesktopExecutable } from "./CodexDesktopExecutable.ts";

it.layer(NodeServices.layer)("Codex Desktop CLI", (it) => {
  it.effect("uses the current relocated CLI ahead of the old unversioned Windows copy", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const local = yield* fs.makeTempDirectoryScoped();
      const bin = path.join(local, "OpenAI", "Codex", "bin");
      const find = findCodexDesktopExecutable().pipe(
        Effect.provideService(HostProcess.Platform, "win32"),
        Effect.provideService(HostProcess.Environment, { LOCALAPPDATA: local, PATH: "" }),
        Effect.provide(
          Layer.mock(ChildProcessSpawner.ChildProcessSpawner)({ string: () => Effect.succeed("") }),
        ),
      );
      expect(yield* find).toBeUndefined();
      yield* fs.makeDirectory(bin, { recursive: true });
      const legacy = path.join(bin, "codex.exe");
      yield* fs.writeFileString(legacy, "");
      expect(yield* find).toBe(legacy);
      for (const [name, exe, when] of [
        ["ffffffffffffffff", "codex.exe", 1000],
        ["aaaaaaaabbbbbbbb", "codex.exe", 2000],
        ["cccccccccccccccc", "rg.exe", 3000],
        [".staging-aaa", "codex.exe", 4000],
      ] as const) {
        const folder = path.join(bin, name);
        yield* fs.makeDirectory(folder);
        yield* fs.writeFileString(path.join(folder, exe), "");
        yield* fs.utimes(folder, when, when);
      }
      expect(yield* find).toBe(path.join(bin, "aaaaaaaabbbbbbbb", "codex.exe"));
    }),
  );

  it.effect("finds the Windows package when the desktop has not yet extracted its CLI", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const local = yield* fs.makeTempDirectoryScoped();
      const install = path.join(local, "WindowsApps", "OpenAI.Codex_1");
      const binary = path.join(install, "app", "resources", "codex.exe");
      yield* fs.makeDirectory(path.dirname(binary), { recursive: true });
      yield* fs.writeFileString(binary, "");
      expect(
        yield* findCodexDesktopExecutable().pipe(
          Effect.provideService(HostProcess.Platform, "win32"),
          Effect.provideService(HostProcess.Environment, { LOCALAPPDATA: local, PATH: "" }),
          Effect.provide(
            Layer.mock(ChildProcessSpawner.ChildProcessSpawner)({
              string: () => Effect.succeed(install + "\r\n"),
            }),
          ),
        ),
      ).toBe(binary);
    }),
  );

  it.effect("cancels an unresponsive Windows package query so server startup can continue", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const local = yield* fs.makeTempDirectoryScoped();
      const started = yield* Deferred.make<void>();
      const interrupted = yield* Deferred.make<void>();
      const finder = yield* findCodexDesktopExecutable().pipe(
        Effect.provideService(HostProcess.Platform, "win32"),
        Effect.provideService(HostProcess.Environment, { LOCALAPPDATA: local, PATH: "" }),
        Effect.provide(
          Layer.mock(ChildProcessSpawner.ChildProcessSpawner)({
            string: () =>
              Deferred.succeed(started, undefined).pipe(
                Effect.andThen(Effect.never),
                Effect.ensuring(Deferred.succeed(interrupted, undefined)),
              ),
          }),
        ),
        Effect.forkChild,
      );
      yield* Deferred.await(started);
      yield* TestClock.adjust("5 seconds");
      expect(yield* Deferred.isDone(interrupted)).toBe(true);
      expect(yield* Fiber.join(finder)).toBeUndefined();
    }),
  );

  it.effect("finds the nested macOS CLI in the user's Applications directory", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped();
      const binary = path.join(
        home,
        "Applications",
        "ChatGPT.app",
        "Contents",
        "Resources",
        "codex-cli",
        "CodexCLI.app",
        "Contents",
        "MacOS",
        "codex",
      );
      yield* fs.makeDirectory(path.dirname(binary), { recursive: true });
      yield* fs.writeFileString(binary, "", { mode: 0o755 });
      expect(
        yield* findCodexDesktopExecutable().pipe(
          Effect.provideService(HostProcess.Platform, "darwin"),
          Effect.provideService(HostProcess.HomeDirectory, home),
          Effect.provideService(HostProcess.Environment, { PATH: "" }),
        ),
      ).toBe(binary);
    }),
  );
});
