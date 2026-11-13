// @effect-diagnostics nodeBuiltinImport:off -- Electron profile selection and locking must finish before readiness.
import * as NodeFS from "node:fs";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import { toStringUnknown } from "effect/Inspectable";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { migrateDirectoryWithLegacyAlias } from "@t3tools/shared/liveraryMigration";
import { desktopMessages } from "../locales/ko.ts";
import * as ElectronApp from "../electron/ElectronApp.ts";

export class DesktopDataMigrationError extends Schema.TaggedError<DesktopDataMigrationError>()(
  "DesktopDataMigrationError",
  { directory: Schema.String, cause: Schema.Defect() },
) {
  override get message(): string {
    return desktopMessages.dataMigrationFailed(
      this.directory,
      this.cause instanceof Error ? this.cause.message : toStringUnknown(this.cause),
    );
  }
}

interface UserDataPathInput {
  readonly appDataDirectory: string;
  readonly isDevelopment: boolean;
  readonly platform: NodeJS.Platform;
}

export const resolveUserDataPath = Effect.fn("desktop.userData.resolveUserDataPath")(function* (
  input: UserDataPathInput,
) {
  const path = yield* Path.Path;
  return path.join(input.appDataDirectory, "liverary");
});

const findLegacyProfile = Effect.fn("desktop.userData.findLegacyProfile")(function* (
  input: UserDataPathInput,
  canonical: string,
) {
  const path = yield* Path.Path;
  const candidates = ["liverary-dev", "t3-custom", "t3-custom-dev"].map((name) =>
    path.join(input.appDataDirectory, name),
  );
  return yield* Effect.try({
    try: () => {
      const directories: string[] = [];
      const aliases: string[] = [];
      for (const entry of [canonical, ...candidates]) {
        const info = NodeFS.lstatSync(entry, { throwIfNoEntry: false });
        if (!info) continue;
        if (info.isDirectory()) directories.push(entry);
        else if (entry !== canonical && info.isSymbolicLink()) aliases.push(entry);
        else throw new Error(desktopMessages.invalidProfilePath(entry));
      }
      if (directories.length > 1) {
        throw new Error(desktopMessages.profileConflict(directories));
      }
      const directory = directories[0];
      for (const alias of aliases) {
        if (!directory || NodeFS.realpathSync(alias) !== NodeFS.realpathSync(directory)) {
          throw new Error(desktopMessages.invalidProfilePath(alias));
        }
      }
      return directory === canonical ? undefined : directory;
    },
    catch: (cause) => new DesktopDataMigrationError({ directory: canonical, cause }),
  });
});

export const migrateUserDataPath = Effect.fn("desktop.userData.migrateUserDataPath")(function* (
  input: UserDataPathInput,
) {
  const canonical = yield* resolveUserDataPath(input);
  const legacy = yield* findLegacyProfile(input, canonical);
  if (legacy) {
    yield* Effect.try({
      try: () => migrateDirectoryWithLegacyAlias(legacy, canonical, input.platform),
      catch: (cause) => new DesktopDataMigrationError({ directory: canonical, cause }),
    });
  }
  return canonical;
});

export const prepareUserDataProfile = Effect.fn("desktop.userData.prepareUserDataProfile")(
  function* (input: UserDataPathInput) {
    const electronApp = yield* ElectronApp.ElectronApp;
    const canonical = yield* resolveUserDataPath(input);
    const legacy = yield* findLegacyProfile(input, canonical);
    const lock = Effect.fn("desktop.userData.lockProfile")(function* (profile: string) {
      yield* electronApp.setPath("userData", profile);
      if (!(yield* electronApp.requestSingleInstanceLock)) {
        yield* electronApp.quit;
        return yield* Effect.interrupt;
      }
    });
    if (legacy) {
      yield* lock(legacy);
      // Windows cannot rename a profile while Chromium owns its lock file.
      yield* electronApp.releaseSingleInstanceLock;
      yield* migrateUserDataPath(input);
    }
    yield* lock(canonical);
    return canonical;
  },
);

const GPU_CACHE_DIRECTORIES = [
  "GPUCache",
  "GrShaderCache",
  "ShaderCache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "GPUPersistentCache",
];

// Keyed on Electron, not Chromium: Electron patches ship Chromium backports under the same Chrome version.
export const clearStaleGpuCaches = Effect.fn("desktop.userData.clearStaleGpuCaches")(
  function* (input: { readonly userDataPath: string; readonly electronVersion: string }) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const markerPath = path.join(input.userDataPath, "gpu-cache-electron-version");
    const cachedVersion = yield* fs.readFileString(markerPath).pipe(
      Effect.catchIf(
        (error) => error.reason._tag === "NotFound",
        () => Effect.undefined,
      ),
    );
    if (cachedVersion?.trim() === input.electronVersion) return;
    for (const name of GPU_CACHE_DIRECTORIES) {
      yield* fs.remove(path.join(input.userDataPath, name), { recursive: true, force: true });
    }
    yield* fs.makeDirectory(input.userDataPath, { recursive: true });
    yield* fs.writeFileString(markerPath, input.electronVersion);
  },
  (effect, input) =>
    effect.pipe(
      Effect.catch((error) =>
        Effect.logWarning("could not clear stale GPU caches", {
          userDataPath: input.userDataPath,
          electronVersion: input.electronVersion,
          error: error.message,
        }),
      ),
    ),
);
