// @effect-diagnostics nodeBuiltinImport:off -- The migration keeps existing directory aliases and SQLite ownership handles intact.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { migrateDirectoryWithLegacyAlias } from "@t3tools/shared/liveraryMigration";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as ProcessRunner from "./processRunner.ts";
import { acquireServerOwnership } from "./serverOwnership.ts";

export class ServerHomeMigrationError extends Schema.TaggedError<ServerHomeMigrationError>()(
  "ServerHomeMigrationError",
  {
    legacyDirectory: Schema.String,
    canonicalDirectory: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    const detail =
      typeof this.cause === "object" &&
      this.cause !== null &&
      "message" in this.cause &&
      typeof this.cause.message === "string"
        ? this.cause.message
        : "Check directory access and the migration error details.";
    return `Could not migrate Liverary data from ${this.legacyDirectory} to ${this.canonicalDirectory}. Close the old desktop app and stop its server first (liverary --base-dir "${this.legacyDirectory}" service stop), then retry. ${detail}`;
  }
}

export class ServerHomeMigrationArgumentsError extends Schema.TaggedError<ServerHomeMigrationArgumentsError>()(
  "ServerHomeMigrationArgumentsError",
  {},
) {
  override get message(): string {
    return "__migrate-home only accepts the legacy Liverary default or workspace development home.";
  }
}

export const migrateServerHome = Effect.fn("migrateServerHome")(
  function* (legacyDirectory: string, canonicalDirectory: string) {
    const fs = yield* FileSystem.FileSystem;
    const platform = yield* HostProcess.Platform;
    const source = yield* Effect.try({
      try: () => {
        try {
          return NodeFS.lstatSync(legacyDirectory);
        } catch (cause) {
          if (cause instanceof Error && "code" in cause && cause.code === "ENOENT")
            return undefined;
          throw cause;
        }
      },
      catch: (cause) =>
        new ServerHomeMigrationError({ legacyDirectory, canonicalDirectory, cause }),
    });
    if (source?.isDirectory() && !source.isSymbolicLink()) {
      // Windows cannot rename the home while SQLite's ownership handles remain open.
      yield* Effect.scoped(
        Effect.gen(function* () {
          for (const variant of ["userdata", "dev"]) {
            const stateDirectory = NodePath.join(legacyDirectory, variant);
            if (yield* fs.exists(stateDirectory)) {
              yield* acquireServerOwnership(NodePath.join(stateDirectory, "server-runtime.json"));
            }
          }
        }),
      );
    }
    yield* Effect.try({
      try: () => migrateDirectoryWithLegacyAlias(legacyDirectory, canonicalDirectory, platform),
      catch: (cause) =>
        new ServerHomeMigrationError({ legacyDirectory, canonicalDirectory, cause }),
    });
  },
  Effect.scoped,
  (effect, legacyDirectory, canonicalDirectory) =>
    effect.pipe(
      Effect.mapError((cause) =>
        cause._tag === "ServerHomeMigrationError"
          ? cause
          : new ServerHomeMigrationError({ legacyDirectory, canonicalDirectory, cause }),
      ),
    ),
);

export const migrateImplicitServerHome = Effect.fn("migrateImplicitServerHome")(function* (
  legacyDirectory: string,
  canonicalDirectory: string,
) {
  yield* migrateServerHome(legacyDirectory, canonicalDirectory).pipe(
    Effect.provide(Layer.mergeAll(ProcessRunner.layer, NodeCrypto.layer)),
  );
});

export async function runMigrateHomeCli(args: ReadonlyArray<string>): Promise<void> {
  const program = Effect.gen(function* () {
    const [legacyDirectory, canonicalDirectory] = args;
    const home = yield* HostProcess.HomeDirectory;
    const legacy = legacyDirectory === undefined ? "" : NodePath.resolve(legacyDirectory);
    const canonical = canonicalDirectory === undefined ? "" : NodePath.resolve(canonicalDirectory);
    const defaultHome =
      legacy === NodePath.join(home, ".t3-custom") &&
      canonical === NodePath.join(home, ".liverary");
    const workspaceDevelopment =
      NodePath.basename(legacy) === ".t3-custom-dev" &&
      NodePath.basename(canonical) === ".liverary-dev" &&
      NodePath.dirname(legacy) === NodePath.dirname(canonical);
    if (
      args.length !== 2 ||
      !NodePath.isAbsolute(legacyDirectory ?? "") ||
      !NodePath.isAbsolute(canonicalDirectory ?? "") ||
      (!defaultHome && !workspaceDevelopment)
    ) {
      return yield* new ServerHomeMigrationArgumentsError({});
    }
    yield* migrateImplicitServerHome(legacy, canonical);
  }).pipe(Effect.provide(NodeServices.layer));
  const result = await Effect.runPromiseExit(program);
  if (Exit.isFailure(result)) {
    const failure = Cause.squash(result.cause);
    process.stderr.write(`${failure instanceof Error ? failure.message : String(failure)}\n`);
    process.exitCode = 1;
  }
}
