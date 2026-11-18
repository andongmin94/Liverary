// @effect-diagnostics nodeBuiltinImport:off -- Intercepts the spawn electron-updater requires natively.
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { autoUpdater, CancellationToken } from "electron-updater";
import type * as NodeChildProcess from "node:child_process";
import * as NodeModule from "node:module";
import { vi } from "vite-plus/test";

// electron-updater requires Electron natively, outside vi.mock's reach, and builds its
// autoUpdater singleton as soon as it is imported.
vi.hoisted(() => {
  const NodeModule = process.getBuiltinModule("node:module");
  const NodeEvents = process.getBuiltinModule("node:events");
  const require = NodeModule.createRequire(import.meta.url);
  const electronPath = NodeModule.createRequire(require.resolve("electron-updater")).resolve(
    "electron",
  );
  const electronModule = new NodeModule.Module(electronPath);
  electronModule.filename = electronPath;
  electronModule.loaded = true;
  electronModule.exports = {
    app: {
      getVersion: () => "1.0.0",
      getName: () => "Liverary",
      isPackaged: true,
      quit: () => undefined,
      once: () => undefined,
    },
    autoUpdater: new NodeEvents.EventEmitter(),
  };
  require.cache[electronPath] = electronModule;
});

import * as ElectronUpdater from "./ElectronUpdater.ts";

describe("ElectronUpdater", () => {
  it.effect("cancels the underlying download before a retry can reuse it", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const downloadUpdateMock = yield* Effect.acquireRelease(
          Effect.sync(() => vi.spyOn(autoUpdater, "downloadUpdate")),
          (spy) => Effect.sync(() => spy.mockRestore()),
        );
        const started = Promise.withResolvers<CancellationToken>();
        const cancelled = Promise.withResolvers<void>();
        const releaseCleanup = Promise.withResolvers<void>();
        let activeDownload: Promise<string[]> | null = null;
        let attempts = 0;
        downloadUpdateMock.mockImplementation((token = new CancellationToken()) => {
          if (activeDownload !== null) return activeDownload;
          attempts += 1;
          if (attempts > 1) {
            assert.isFalse(token.cancelled);
            return Promise.resolve(["installer.exe"]);
          }
          activeDownload = new Promise<string[]>((_resolve, reject) => {
            token.once("cancel", () => reject(new Error("Download cancelled")));
          }).finally(async () => {
            cancelled.resolve();
            await releaseCleanup.promise;
            activeDownload = null;
          });
          started.resolve(token);
          return activeDownload;
        });

        const updates = yield* ElectronUpdater.ElectronUpdater;
        const downloading = yield* updates.downloadUpdate.pipe(Effect.forkScoped);
        const token = yield* Effect.promise(() => started.promise);
        const interrupting = yield* Fiber.interrupt(downloading).pipe(Effect.forkScoped);

        yield* Effect.gen(function* () {
          yield* Effect.raceFirst(
            Effect.promise(() => cancelled.promise),
            Fiber.join(interrupting),
          );
          assert.isTrue(token.cancelled);
          assert.isUndefined(interrupting.pollUnsafe());
        }).pipe(Effect.ensuring(Effect.sync(() => releaseCleanup.resolve())));
        yield* Fiber.join(interrupting);

        assert.isNull(activeDownload);
        yield* updates.downloadUpdate;
        assert.equal(attempts, 2);
      }),
    ).pipe(Effect.provide(ElectronUpdater.layer)),
  );
});

const childProcess = NodeModule.createRequire(import.meta.url)("node:child_process") as {
  spawn: (
    command: string,
    args: ReadonlyArray<string>,
    options: NodeChildProcess.SpawnOptions,
  ) => NodeChildProcess.ChildProcess;
};

describe.skipIf(HostProcess.Platform.defaultValue() !== "linux")(
  "ElectronUpdater AppImage install",
  () => {
    it.live("relaunches the installed AppImage without the updating process's descriptors", () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const dir = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "liverary-appimage-install-",
        });
        const appImagePath = path.join(dir, "Liverary.AppImage");
        const stagedPath = path.join(dir, "Liverary-1.0.1.AppImage");
        const fdReportPath = path.join(dir, "relaunched-fds.txt");
        yield* fileSystem.writeFileString(appImagePath, "old AppImage");
        yield* fileSystem.writeFileString(
          stagedPath,
          `#!/bin/sh\nls /proc/self/fd > '${fdReportPath}'\n`,
        );
        yield* fileSystem.chmod(stagedPath, 0o755);

        yield* Effect.acquireRelease(
          Effect.sync(() => vi.stubEnv("APPIMAGE", appImagePath)),
          () => Effect.sync(() => vi.unstubAllEnvs()),
        );

        autoUpdater.logger = null;
        Object.assign(autoUpdater, {
          downloadedUpdateHelper: {
            file: stagedPath,
            downloadedFileInfo: { isAdminRightsRequired: false },
          },
        });

        // Electron's main process holds the AppImage runtime's keepalive pipe and some
        // Chromium files without O_CLOEXEC. Node cannot hold such a descriptor, so the
        // relaunch runs with fd 7 opened that way to stand in for them.
        const relaunched = yield* Deferred.make<void>();
        const realSpawn = childProcess.spawn;
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            childProcess.spawn = (command, args, options) => {
              const child = realSpawn(
                "bash",
                ["-c", 'exec 7</dev/null; exec "$@"', "leaky-parent", command, ...args],
                options,
              );
              child.once("exit", () => Deferred.doneUnsafe(relaunched, Effect.void));
              return child;
            };
            NodeModule.syncBuiltinESMExports();
          }),
          () =>
            Effect.sync(() => {
              childProcess.spawn = realSpawn;
              NodeModule.syncBuiltinESMExports();
            }),
        );

        const electronUpdater = yield* ElectronUpdater.ElectronUpdater;
        yield* electronUpdater.quitAndInstall({ isSilent: true, isForceRunAfter: true });
        yield* Deferred.await(relaunched);

        const descriptors = (yield* fileSystem.readFileString(fdReportPath)).trim().split("\n");
        assert.notInclude(
          descriptors,
          "7",
          `relaunched AppImage inherited the updating process's fd 7 (open fds: ${descriptors.join(" ")})`,
        );
      }).pipe(Effect.provide([ElectronUpdater.layer, NodeServices.layer])),
    );
  },
);
