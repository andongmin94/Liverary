import * as NodeServices from "@effect/platform-node/NodeServices";
import { it, describe, expect } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";

import * as T3ProjectFileLoader from "./LiveraryProjectFileLoader.ts";

const layerTest = Layer.empty.pipe(
  Layer.provideMerge(T3ProjectFileLoader.layer),
  Layer.provideMerge(NodeServices.layer),
);

const makeTempDir = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.makeTempDirectoryScoped({
    prefix: "t3code-project-file-",
  });
});

it.layer(layerTest)("T3ProjectFileLoader", (it) => {
  describe("load", () => {
    it.effect.each([
      { label: "missing files", canonical: null, legacy: null, denied: false, expected: null },
      {
        label: "a canonical file",
        canonical: '{ "iconPath": "canonical.svg" }',
        legacy: null,
        denied: false,
        expected: { iconPath: "canonical.svg" },
      },
      {
        label: "a legacy file when the canonical file is absent",
        canonical: null,
        legacy: '{ "iconPath": "legacy.svg" }',
        denied: false,
        expected: { iconPath: "legacy.svg" },
      },
      {
        label: "the canonical file when both files exist",
        canonical: '{ "iconPath": "canonical.svg" }',
        legacy: '{ "iconPath": "legacy.svg" }',
        denied: false,
        expected: { iconPath: "canonical.svg" },
      },
      {
        label: "malformed canonical JSON without reading the legacy file",
        canonical: "{ not json",
        legacy: '{ "iconPath": "legacy.svg" }',
        denied: false,
        expected: null,
      },
      {
        label: "an unreadable canonical file without reading the legacy file",
        canonical: null,
        legacy: '{ "iconPath": "legacy.svg" }',
        denied: true,
        expected: null,
      },
      {
        label: "malformed legacy JSON without failing",
        canonical: null,
        legacy: "{ not json",
        denied: false,
        expected: null,
      },
    ])("handles $label", ({ canonical, legacy, denied, expected }) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const cwd = yield* makeTempDir;
        const canonicalPath = path.join(cwd, "liverary.json");
        if (canonical !== null) yield* fileSystem.writeFileString(canonicalPath, canonical);
        if (legacy !== null) yield* fileSystem.writeFileString(path.join(cwd, "t3.json"), legacy);
        const loader = yield* T3ProjectFileLoader.make.pipe(
          Effect.provideService(FileSystem.FileSystem, {
            ...fileSystem,
            readFileString: (filePath, encoding) =>
              denied && filePath === canonicalPath
                ? Effect.fail(
                    PlatformError.systemError({
                      _tag: "PermissionDenied",
                      module: "FileSystem",
                      method: "readFileString",
                      pathOrDescriptor: filePath,
                    }),
                  )
                : fileSystem.readFileString(filePath, encoding),
          }),
        );

        const loaded = yield* loader.load(cwd);

        expect(Option.getOrNull(loaded)).toEqual(expected);
      }),
    );
  });
});
