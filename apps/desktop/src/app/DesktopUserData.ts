import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { migrateDirectoryWithLegacyAlias } from "@t3tools/shared/liveraryMigration";
import { desktopMessages } from "../locales/ko.ts";

export class DesktopDataMigrationError extends Schema.TaggedError<DesktopDataMigrationError>()(
  "DesktopDataMigrationError",
  { directory: Schema.String, cause: Schema.Defect() },
) {
  override get message(): string {
    return desktopMessages.dataMigrationFailed(
      this.directory,
      this.cause instanceof Error ? this.cause.message : String(this.cause),
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
  return path.join(input.appDataDirectory, input.isDevelopment ? "liverary-dev" : "liverary");
});

export const resolveLegacyUserDataPath = Effect.fn("desktop.userData.resolveLegacyUserDataPath")(
  function* (input: UserDataPathInput) {
    const path = yield* Path.Path;
    return path.join(input.appDataDirectory, input.isDevelopment ? "t3-custom-dev" : "t3-custom");
  },
);

export const migrateUserDataPath = Effect.fn("desktop.userData.migrateUserDataPath")(function* (
  input: UserDataPathInput,
) {
  const legacy = yield* resolveLegacyUserDataPath(input);
  const canonical = yield* resolveUserDataPath(input);
  yield* Effect.try({
    try: () => migrateDirectoryWithLegacyAlias(legacy, canonical, input.platform),
    catch: (cause) => new DesktopDataMigrationError({ directory: canonical, cause }),
  });
  return canonical;
});
