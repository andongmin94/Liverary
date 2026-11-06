import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import {
  migrateUserDataPath,
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
