import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { claudeDesktopProfilePaths } from "../provider/ClaudeDesktopExecutable.ts";
import { claudeAccountConfigPath } from "../provider/claudeResetCredits.ts";
import type { NativeSessionState } from "@t3tools/provider-core/server/nativeSessions";

const Uuid = Schema.String.check(Schema.isUUID());
const isUuid = Schema.is(Uuid);
const decodeConfig = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ lastKnownAccountUuid: Uuid })),
);
const Session = Schema.Struct({
  sessionId: Schema.String,
  cliSessionId: Uuid,
  cwd: Schema.String,
  title: Schema.optional(Schema.String),
  lastActivityAt: Schema.Number,
  isArchived: Schema.optional(Schema.Boolean),
  priorCliSessionIds: Schema.optional(Schema.Array(Uuid)),
  rewindEdges: Schema.optional(Schema.Array(Schema.Struct({ parent: Uuid, child: Uuid }))),
});
const decodeSession = Schema.decodeUnknownOption(Schema.fromJsonString(Session));
const decodeTrust = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      projects: Schema.Record(Schema.String, Schema.Unknown),
    }),
  ),
);
const trustedProject = Schema.is(Schema.Struct({ hasTrustDialogAccepted: Schema.Literal(true) }));
const decodeTranscriptLocation = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      cwd: Schema.optional(Schema.String),
      sessionId: Schema.optional(Schema.String),
    }),
  ),
);
const decodeArchive = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ archived: Schema.Array(Schema.String) })),
);
const decodeCliAccount = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      oauthAccount: Schema.Struct({ accountUuid: Uuid, organizationUuid: Uuid }),
    }),
  ),
);
const decodeSessionIds = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      cliSessionId: Uuid,
      priorCliSessionIds: Schema.optional(Schema.Array(Uuid)),
      rewindEdges: Schema.optional(Schema.Array(Schema.Struct({ parent: Uuid, child: Uuid }))),
    }),
  ),
);

export type ClaudeDesktopSession = typeof Session.Type & {
  readonly state: NativeSessionState;
  readonly aliases: ReadonlyArray<string>;
};

export interface ClaudeDesktopCatalog {
  readonly sessions: ReadonlyMap<string, ClaudeDesktopSession>;
  readonly deleted: ReadonlyMap<string, number>;
  readonly complete: boolean;
}

const makeDesktopProfileReader = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const profiles = yield* claudeDesktopProfilePaths;
  return Effect.gen(function* () {
    for (const profile of profiles) {
      const root = path.join(profile, "claude-code-sessions");
      if (!(yield* fs.exists(root))) continue;
      const config = Option.getOrUndefined(
        decodeConfig(yield* fs.readFileString(path.join(profile, "config.json"))),
      );
      if (!config) return null;
      const account = path.join(root, config.lastKnownAccountUuid);
      const orgs = (yield* fs.readDirectory(account)).filter(isUuid);
      if (orgs.length !== 1) return null;
      return {
        accountId: config.lastKnownAccountUuid,
        orgId: orgs[0]!,
        folder: path.join(account, orgs[0]!),
      };
    }
    return undefined;
  });
});

export const canAdoptClaudeDesktopSession = Effect.fn("ClaudeDesktopHistory.canAdopt")(
  function* (nativeId: string, configDir?: string) {
    if (!isUuid(nativeId)) return false;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const profile = yield* yield* makeDesktopProfileReader;
    if (!profile) return false;
    const config = Option.getOrUndefined(
      decodeCliAccount(yield* fs.readFileString(yield* claudeAccountConfigPath(configDir))),
    );
    if (
      config?.oauthAccount.accountUuid !== profile.accountId ||
      config.oauthAccount.organizationUuid !== profile.orgId
    )
      return false;
    const entries = new Set(yield* fs.readDirectory(profile.folder));
    const localId = `local_${nativeId}`;
    if (entries.has(`${localId}.json`) || entries.has(`deleted_${nativeId}`)) return false;
    if (entries.has("archived-sessions.idx")) {
      const archive = Option.getOrUndefined(
        decodeArchive(yield* fs.readFileString(path.join(profile.folder, "archived-sessions.idx"))),
      );
      if (!archive || archive.archived.includes(localId)) return false;
    }
    for (const name of entries) {
      if (!name.startsWith("local_") || !name.endsWith(".json")) continue;
      const ids = Option.getOrUndefined(
        decodeSessionIds(yield* fs.readFileString(path.join(profile.folder, name))),
      );
      if (
        !ids ||
        ids.cliSessionId === nativeId ||
        ids.priorCliSessionIds?.includes(nativeId) ||
        ids.rewindEdges?.some(({ parent, child }) => parent === nativeId || child === nativeId)
      )
        return false;
    }
    return true;
  },
  Effect.orElseSucceed(() => false),
);

export const hasClaudeDesktopHandoffTrust = Effect.fn("ClaudeDesktopHistory.hasHandoffTrust")(
  function* (nativeId: string, cwd: string, configDir?: string) {
    if (!isUuid(nativeId)) return false;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    if (!path.isAbsolute(cwd) || (yield* fs.realPath(cwd)) !== cwd) return false;
    const key = path.sep === "\\" ? cwd.replaceAll("\\", "/") : cwd;
    // Desktop's CLI deep link can grant trust silently. Only an explicit grant for this exact cwd permits automatic opening.
    const configs = new Set([
      yield* claudeAccountConfigPath(undefined),
      yield* claudeAccountConfigPath(configDir),
    ]);
    for (const file of configs) {
      const config = Option.getOrUndefined(decodeTrust(yield* fs.readFileString(file)));
      if (!trustedProject(config?.projects[key]) && !trustedProject(config?.projects[cwd]))
        return false;
    }
    const root = path.join(
      configDir ?? path.join(yield* HostProcess.HomeDirectory, ".claude"),
      "projects",
    );
    let found = false;
    for (const name of yield* fs.readDirectory(root)) {
      const file = path.join(root, name, `${nativeId}.jsonl`);
      if (!(yield* fs.exists(file).pipe(Effect.orElseSucceed(() => false)))) continue;
      if (found) return false;
      let observed = false;
      const mismatch = yield* fs.stream(file).pipe(
        Stream.decodeText,
        Stream.splitLines,
        Stream.filter((line) => {
          if (!line.trim()) return false;
          const location = Option.getOrUndefined(decodeTranscriptLocation(line));
          if (!location || (location.sessionId !== undefined && location.sessionId !== nativeId))
            return true;
          if (location.cwd === undefined) return false;
          if (location.cwd !== key && location.cwd !== cwd) return true;
          if (location.sessionId === nativeId) observed = true;
          return false;
        }),
        Stream.runHead,
      );
      if (Option.isSome(mismatch) || !observed) return false;
      found = true;
    }
    return found;
  },
  Effect.orElseSucceed(() => false),
);

export const makeClaudeDesktopCatalogReader = Effect.gen(function* () {
  const desktopProfile = yield* makeDesktopProfileReader;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const unreadable = (): ClaudeDesktopCatalog => ({
    sessions: new Map(),
    deleted: new Map(),
    complete: false,
  });
  return Effect.fn("ClaudeDesktopHistory.readCatalog")(function* (): Effect.fn.Return<
    ClaudeDesktopCatalog | null,
    unknown
  > {
    const profile = yield* desktopProfile;
    if (profile === undefined) return null;
    if (profile === null) return unreadable();
    const { folder } = profile;
    const entries = new Set(yield* fs.readDirectory(folder));
    const sessions = new Map<string, ClaudeDesktopSession>();
    const deleted = new Map<string, number>();
    let complete = true;
    let archived: ReadonlySet<string> = new Set();
    if (entries.has("archived-sessions.idx")) {
      const archive = decodeArchive(
        yield* fs.readFileString(path.join(folder, "archived-sessions.idx")),
      );
      if (Option.isNone(archive)) return unreadable();
      archived = new Set(archive.value.archived);
    }
    for (const name of entries) {
      if (name.startsWith("deleted_") && isUuid(name.slice("deleted_".length))) {
        const stat = yield* fs.stat(path.join(folder, name));
        deleted.set(
          `local_${name.slice("deleted_".length)}`,
          Option.getOrUndefined(stat.mtime)?.getTime() ?? 0,
        );
        continue;
      }
      if (!name.startsWith("local_") || !name.endsWith(".json")) continue;
      const id = name.slice(0, -".json".length);
      const uuid = id.slice("local_".length);
      if (!isUuid(uuid)) continue;
      const session = Option.getOrUndefined(
        decodeSession(yield* fs.readFileString(path.join(folder, name))),
      );
      if (session?.sessionId !== id || !path.isAbsolute(session.cwd)) {
        complete = false;
        continue;
      }
      const aliases = new Set([
        ...(session.priorCliSessionIds ?? []),
        ...(session.rewindEdges?.flatMap(({ parent, child }) => [parent, child]) ?? []),
      ]);
      aliases.delete(session.cliSessionId);
      sessions.set(session.cliSessionId, {
        ...session,
        aliases: [...aliases],
        state: entries.has(`deleted_${uuid}`)
          ? "deleted"
          : session.isArchived || archived.has(id)
            ? "archived"
            : "active",
      });
    }
    return { sessions, deleted, complete };
  }, Effect.orElseSucceed(unreadable));
});
