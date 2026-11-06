// @effect-diagnostics nodeBuiltinImport:off -- Migration fixtures inspect native directory links and inject a failed alias creation.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import { vi } from "vite-plus/test";

import { migrateDirectoryWithLegacyAlias } from "./liveraryMigration.ts";

vi.mock("node:fs", { spy: true });

const fixture = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const platform = yield* HostProcess.Platform;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-directory-" });
  const legacy = NodePath.join(root, "t3-custom");
  const canonical = NodePath.join(root, "liverary");
  return { fs, root, legacy, canonical, platform };
});

it.effect("moves a legacy directory once and keeps old absolute paths readable", () =>
  Effect.gen(function* () {
    const { fs, legacy, canonical, platform } = yield* fixture;
    const bytes = Uint8Array.from([0, 1, 127, 128, 255]);
    yield* fs.makeDirectory(legacy);
    yield* fs.writeFile(NodePath.join(legacy, "Local State"), bytes);

    migrateDirectoryWithLegacyAlias(legacy, canonical, platform);
    migrateDirectoryWithLegacyAlias(legacy, canonical, platform);

    assert.equal(yield* fs.realPath(legacy), yield* fs.realPath(canonical));
    assert.isTrue(NodeFS.lstatSync(legacy).isSymbolicLink());
    assert.isFalse(NodeFS.lstatSync(canonical).isSymbolicLink());
    assert.deepEqual(yield* fs.readFile(NodePath.join(legacy, "Local State")), bytes);
    assert.deepEqual(yield* fs.readFile(NodePath.join(canonical, "Local State")), bytes);
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

it.effect("never overwrites a distinct destination or adopts an unrelated directory link", () =>
  Effect.gen(function* () {
    const { fs, root, legacy, canonical, platform } = yield* fixture;
    yield* fs.makeDirectory(legacy);
    yield* fs.makeDirectory(canonical);
    yield* fs.writeFileString(NodePath.join(legacy, "keep"), "old");
    yield* fs.writeFileString(NodePath.join(canonical, "keep"), "new");

    assert.throws(
      () => migrateDirectoryWithLegacyAlias(legacy, canonical, platform),
      /Both Liverary/,
    );
    assert.equal(yield* fs.readFileString(NodePath.join(legacy, "keep")), "old");
    assert.equal(yield* fs.readFileString(NodePath.join(canonical, "keep")), "new");

    const unrelated = NodePath.join(root, "unrelated");
    yield* fs.makeDirectory(unrelated);
    const link = NodePath.join(root, "foreign-link");
    NodeFS.symlinkSync(unrelated, link, platform === "win32" ? "junction" : "dir");
    assert.throws(
      () => migrateDirectoryWithLegacyAlias(link, canonical, platform),
      /unrelated directory link/,
    );
    assert.equal(yield* fs.realPath(link), yield* fs.realPath(unrelated));
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

it.effect("restores the legacy directory if creating its alias fails", () =>
  Effect.gen(function* () {
    const { fs, legacy, canonical, platform } = yield* fixture;
    yield* fs.makeDirectory(legacy);
    yield* fs.writeFileString(NodePath.join(legacy, "keep"), "original");
    using _symlink = vi.spyOn(NodeFS, "symlinkSync").mockImplementation(() => {
      throw new Error("alias creation failed");
    });

    assert.throws(
      () => migrateDirectoryWithLegacyAlias(legacy, canonical, platform),
      /original directory was restored/,
    );
    assert.isFalse(yield* fs.exists(canonical));
    assert.equal(yield* fs.readFileString(NodePath.join(legacy, "keep")), "original");
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);

it.effect("leaves a current directory intact when no legacy directory exists", () =>
  Effect.gen(function* () {
    const { fs, legacy, canonical, platform } = yield* fixture;
    migrateDirectoryWithLegacyAlias(legacy, canonical, platform);
    assert.isFalse(yield* fs.exists(canonical));
    yield* fs.makeDirectory(canonical);
    yield* fs.writeFileString(NodePath.join(canonical, "keep"), "current");
    migrateDirectoryWithLegacyAlias(legacy, canonical, platform);
    assert.equal(yield* fs.readFileString(NodePath.join(canonical, "keep")), "current");
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);
