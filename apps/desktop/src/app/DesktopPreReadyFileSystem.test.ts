import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import * as DesktopPreReadyFileSystem from "./DesktopPreReadyFileSystem.ts";

it.layer(NodeServices.layer)("DesktopPreReadyFileSystem", (it) => {
  it.effect.skipIf(HostProcess.Platform.defaultValue() === "win32" || process.getuid?.() === 0)(
    "fails instead of treating an unreadable profile as missing",
    () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "liverary-pre-ready-fs-",
        });
        const profile = path.join(root, "liverary");
        assert.isFalse(yield* DesktopPreReadyFileSystem.make.exists(profile));
        yield* fileSystem.makeDirectory(profile);
        yield* fileSystem.chmod(root, 0o000);
        yield* Effect.addFinalizer(() => fileSystem.chmod(root, 0o700).pipe(Effect.orDie));

        const error = yield* DesktopPreReadyFileSystem.make.exists(profile).pipe(Effect.flip);
        assert.equal(error.reason._tag, "PermissionDenied");
      }),
  );
});
