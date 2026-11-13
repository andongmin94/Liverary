// @effect-diagnostics nodeBuiltinImport:off - Electron profile tests use a temporary OS directory.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodePathLayer from "@effect/platform-node/NodePath";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as ElectronApp from "../electron/ElectronApp.ts";
import * as DesktopPreReadyFileSystem from "./DesktopPreReadyFileSystem.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";

import {
  clearStaleGpuCaches,
  migrateUserDataPath,
  prepareUserDataProfile,
  resolveLegacyUserDataPath,
  resolveUserDataPath,
} from "./DesktopUserData.ts";

it.effect.each(
  ["t3code", "t3code-v2", "T3 Code (Alpha)"].flatMap((sourceName) =>
    [false, true].map((isDevelopment) => ({ sourceName, isDevelopment })),
  ),
)(
  "migrates only the fork profile while keeping $sourceName separate (development: $isDevelopment)",
  ({ sourceName, isDevelopment }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "t3-custom-profile-" });
      const source = path.join(directory, sourceName);
      const state = '{"os_crypt":{"encrypted_key":"original-key"}}';
      yield* fs.makeDirectory(source, { recursive: true });
      yield* fs.writeFileString(path.join(source, "Local State"), state);

      const input = {
        appDataDirectory: directory,
        isDevelopment,
        platform: "win32" as const,
      };
      const destination = yield* resolveUserDataPath(input);

      assert.equal(destination, path.join(directory, isDevelopment ? "liverary-dev" : "liverary"));
      assert.isFalse(yield* fs.exists(path.join(destination, "Local State")));
      assert.equal(yield* fs.readFileString(path.join(source, "Local State")), state);
      const legacy = yield* resolveLegacyUserDataPath(input);
      const ownState = Uint8Array.from([0, 128, 255, 17]);
      yield* fs.makeDirectory(legacy);
      yield* fs.writeFile(path.join(legacy, "Local State"), ownState);
      yield* migrateUserDataPath(input);
      yield* migrateUserDataPath(input);
      assert.equal(yield* fs.realPath(legacy), yield* fs.realPath(destination));
      assert.deepEqual(yield* fs.readFile(path.join(destination, "Local State")), ownState);
      assert.equal(yield* fs.readFileString(path.join(source, "Local State")), state);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

it.effect.each([false, true])(
  "preserves distinct old and new profiles (development: %s)",
  (isDevelopment) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-profile-conflict-" });
      const input = { appDataDirectory: directory, isDevelopment, platform: "win32" as const };
      const legacy = yield* resolveLegacyUserDataPath(input);
      const canonical = yield* resolveUserDataPath(input);
      yield* fs.makeDirectory(legacy);
      yield* fs.makeDirectory(canonical);
      yield* fs.writeFileString(path.join(legacy, "Local State"), "old-key");
      yield* fs.writeFileString(path.join(canonical, "Local State"), "new-key");
      const result = yield* migrateUserDataPath(input).pipe(Effect.result);
      assert.equal(result._tag, "Failure");
      assert.equal(yield* fs.readFileString(path.join(legacy, "Local State")), "old-key");
      assert.equal(yield* fs.readFileString(path.join(canonical, "Local State")), "new-key");
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

const gpuCacheDirectories = [
  "GPUCache",
  "GrShaderCache",
  "ShaderCache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "GPUPersistentCache",
];

it.effect.each([
  { profile: "written by Electron 44.10.0", marker: "44.10.0" },
  { profile: "with no recorded Electron version", marker: undefined },
])("clears GPU caches $profile once when Electron 44.10.1 starts", ({ marker }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const userDataPath = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-gpu-cache-" });
    for (const name of gpuCacheDirectories) {
      yield* fs.makeDirectory(path.join(userDataPath, name), { recursive: true });
      yield* fs.writeFileString(path.join(userDataPath, name, "data_0"), "44.10.0 shaders");
    }
    yield* fs.makeDirectory(path.join(userDataPath, "Local Storage"), { recursive: true });
    yield* fs.writeFileString(path.join(userDataPath, "Local Storage", "LOCK"), "profile");
    yield* fs.writeFileString(path.join(userDataPath, "Local State"), "profile");
    if (marker !== undefined) {
      yield* fs.writeFileString(path.join(userDataPath, "gpu-cache-electron-version"), marker);
    }

    yield* clearStaleGpuCaches({ userDataPath, electronVersion: "44.10.1" });

    const survivingCaches: Array<string> = [];
    for (const name of gpuCacheDirectories) {
      if (yield* fs.exists(path.join(userDataPath, name))) survivingCaches.push(name);
    }
    assert.deepStrictEqual(survivingCaches, []);
    assert.equal(
      yield* fs.readFileString(path.join(userDataPath, "Local Storage", "LOCK")),
      "profile",
    );
    assert.equal(yield* fs.readFileString(path.join(userDataPath, "Local State")), "profile");

    yield* fs.makeDirectory(path.join(userDataPath, "GPUCache"));
    yield* fs.writeFileString(path.join(userDataPath, "GPUCache", "data_0"), "44.10.1 shaders");
    yield* clearStaleGpuCaches({ userDataPath, electronVersion: "44.10.1" });
    assert.equal(
      yield* fs.readFileString(path.join(userDataPath, "GPUCache", "data_0")),
      "44.10.1 shaders",
    );
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

it.effect("keeps GPU caches built on the first launch of a fresh install", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const appData = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-fresh-" });
    const userDataPath = yield* resolveUserDataPath({
      appDataDirectory: appData,
      isDevelopment: false,
      platform: "win32",
    });

    yield* clearStaleGpuCaches({ userDataPath, electronVersion: "44.10.1" });
    yield* fs.makeDirectory(path.join(userDataPath, "GPUCache"));
    yield* fs.writeFileString(path.join(userDataPath, "GPUCache", "data_0"), "44.10.1 shaders");
    yield* clearStaleGpuCaches({ userDataPath, electronVersion: "44.10.1" });

    assert.equal(
      yield* fs.readFileString(path.join(userDataPath, "GPUCache", "data_0")),
      "44.10.1 shaders",
    );
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

it.effect("retries on the next launch when a GPU cache cannot be removed", () =>
  Effect.gen(function* () {
    const writes: Array<string> = [];
    const fileSystem = FileSystem.makeNoop({
      remove: (path) =>
        Effect.fail(
          PlatformError.systemError({
            _tag: "PermissionDenied",
            module: "FileSystem",
            method: "remove",
            pathOrDescriptor: path,
          }),
        ),
      writeFileString: (path) =>
        Effect.sync(() => {
          writes.push(path);
        }),
    });

    yield* clearStaleGpuCaches({ userDataPath: "/profile", electronVersion: "44.10.1" }).pipe(
      Effect.provideService(FileSystem.FileSystem, fileSystem),
    );

    assert.deepStrictEqual(writes, []);
  }).pipe(Effect.provide(NodeServices.layer)),
);

const layerUserDataPreparation = (
  isDevelopment: boolean,
  events: string[],
  platform: NodeJS.Platform,
  fileSystemLayer: Layer.Layer<FileSystem.FileSystem> = FileSystem.layerNoop({
    exists: () => Effect.succeed(false),
  }),
  appDataDirectory = "/tmp/app-data",
  lockAvailable = true,
) =>
  Layer.effectDiscard(prepareUserDataProfile({ isDevelopment, platform, appDataDirectory })).pipe(
    Layer.provide(
      Layer.mergeAll(
        NodePathLayer.layerPosix,
        Layer.succeed(ElectronApp.ElectronApp, {
          setPath: (name: string, value: string) =>
            Effect.sync(() => {
              events.push(`setPath:${name}:${value}`);
            }),
          requestSingleInstanceLock: Effect.sync(() => {
            events.push("requestSingleInstanceLock");
            return lockAvailable;
          }),
          releaseSingleInstanceLock: Effect.sync(() => {
            events.push("releaseSingleInstanceLock");
          }),
          quit: Effect.sync(() => {
            events.push("quit");
          }),
        } as unknown as ElectronApp.ElectronApp["Service"]),
        fileSystemLayer,
      ),
    ),
  );

describe("prepareUserDataProfile", () => {
  it.each([
    {
      name: "packaged macOS",
      isDevelopment: false,
      platform: "darwin" as const,
      userData: "/tmp/app-data/liverary",
      profileState: "fresh" as const,
    },
    {
      name: "packaged Linux",
      isDevelopment: false,
      platform: "linux" as const,
      userData: "/tmp/app-data/liverary",
      profileState: "fresh" as const,
    },
    {
      name: "packaged Windows",
      isDevelopment: false,
      platform: "win32" as const,
      userData: "/tmp/app-data/liverary",
      profileState: "fresh" as const,
    },
    {
      name: "development",
      isDevelopment: true,
      platform: "win32" as const,
      userData: "/tmp/app-data/liverary-dev",
      profileState: "fresh" as const,
    },
    {
      name: "legacy Windows profile",
      isDevelopment: false,
      platform: "win32" as const,
      userData: "",
      profileState: "legacy" as const,
    },
    {
      name: "already migrated development profile",
      isDevelopment: true,
      platform: "win32" as const,
      userData: "",
      profileState: "migrated" as const,
    },
  ])(
    "prepares the local profile before startup can yield to the event loop ($name)",
    ({ isDevelopment, platform, userData, profileState }) => {
      const events: string[] = [];
      const directory =
        profileState === "fresh"
          ? null
          : NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-profile-"));
      if (directory)
        assert.equal(
          NodePath.dirname(NodePath.resolve(directory)),
          NodePath.resolve(NodeOS.tmpdir()),
        );
      const appDataDirectory = directory ?? "/tmp/app-data";
      const canonical = directory
        ? NodePath.posix.join(directory, isDevelopment ? "liverary-dev" : "liverary")
        : userData;
      const legacy = directory
        ? NodePath.posix.join(directory, isDevelopment ? "t3-custom-dev" : "t3-custom")
        : null;
      const bytes = Uint8Array.from([0, 128, 255, 3]);
      try {
        if (legacy) {
          NodeFS.mkdirSync(legacy);
          NodeFS.writeFileSync(NodePath.posix.join(legacy, "Local State"), bytes);
          if (profileState === "migrated") {
            NodeFS.renameSync(legacy, canonical);
            NodeFS.symlinkSync(
              canonical,
              legacy,
              HostProcess.Platform.defaultValue() === "win32" ? "junction" : "dir",
            );
          }
        }
        // oxlint-disable-next-line t3code/no-manual-effect-runtime-in-tests -- The assertion IS that the layer builds synchronously; it.effect would mask a regression to async.
        Effect.runSync(
          Effect.scoped(
            Layer.build(
              layerUserDataPreparation(
                isDevelopment,
                events,
                platform,
                DesktopPreReadyFileSystem.layer,
                appDataDirectory,
              ),
            ),
          ),
        );

        assert.deepEqual(events, [
          `setPath:userData:${legacy ?? canonical}`,
          "requestSingleInstanceLock",
          ...(profileState === "legacy"
            ? [
                "releaseSingleInstanceLock",
                `setPath:userData:${legacy}`,
                "requestSingleInstanceLock",
              ]
            : []),
          ...(legacy ? [`setPath:userData:${canonical}`] : []),
        ]);
        if (legacy) {
          assert.equal(NodeFS.realpathSync(legacy), NodeFS.realpathSync(canonical));
          assert.deepEqual(
            new Uint8Array(NodeFS.readFileSync(NodePath.posix.join(canonical, "Local State"))),
            bytes,
          );
        }
      } finally {
        if (directory) NodeFS.rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it.effect.each([
    { platform: "darwin" as const, legacyProfile: false },
    { platform: "win32" as const, legacyProfile: false },
    { platform: "linux" as const, legacyProfile: false },
    { platform: "win32" as const, legacyProfile: true },
  ])(
    "quits a second launch before initializing the application runtime on $platform (legacy: $legacyProfile)",
    ({ platform, legacyProfile }) =>
      Effect.gen(function* () {
        const events: string[] = [];
        const directory = legacyProfile
          ? NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-profile-active-"))
          : null;
        if (directory)
          assert.equal(
            NodePath.dirname(NodePath.resolve(directory)),
            NodePath.resolve(NodeOS.tmpdir()),
          );
        const legacy = directory ? NodePath.posix.join(directory, "t3-custom") : null;
        if (legacy) {
          NodeFS.mkdirSync(legacy);
          NodeFS.writeFileSync(NodePath.posix.join(legacy, "Local State"), "old-key");
        }
        try {
          const runtime = layerUserDataPreparation(
            false,
            events,
            platform,
            directory ? DesktopPreReadyFileSystem.layer : undefined,
            directory ?? undefined,
            false,
          ).pipe(
            Layer.flatMap(() =>
              Layer.effectDiscard(
                Effect.sync(() => {
                  events.push("initializeApplicationRuntime");
                }),
              ),
            ),
          );
          const exit = yield* Effect.exit(Effect.scoped(Layer.build(runtime)));

          assert.isTrue(Exit.hasInterrupts(exit));
          assert.deepEqual(events, [
            `setPath:userData:${legacy ?? "/tmp/app-data/liverary"}`,
            "requestSingleInstanceLock",
            "quit",
          ]);
          if (legacy && directory) {
            assert.equal(
              NodeFS.readFileSync(NodePath.posix.join(legacy, "Local State"), "utf8"),
              "old-key",
            );
            assert.isFalse(NodeFS.existsSync(NodePath.posix.join(directory, "liverary")));
          }
        } finally {
          if (directory) NodeFS.rmSync(directory, { recursive: true, force: true });
        }
      }),
  );
});
