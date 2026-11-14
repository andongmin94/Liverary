import { deleteSession, getSessionMessages, listSessions } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeSettings } from "@t3tools/contracts";
import {
  NativeSessionError,
  type NativeSessionMessage,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { normalizeProjectPathForComparison } from "@t3tools/shared/path";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import { makeClaudeDesktopCatalogReader } from "../project/ClaudeDesktopHistory.ts";
import { claudeDesktopProfilePaths } from "./ClaudeDesktopExecutable.ts";
import { runClaudeHistoryOperation } from "./ClaudeHistory.ts";
import { makeClaudeEnvironment, resolveClaudeHomePath } from "./Drivers/ClaudeHome.ts";

const decodeJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));
const decodeSessions = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      sessionId: Schema.String,
      summary: Schema.String,
      cwd: Schema.optional(Schema.String),
      createdAt: Schema.optional(Schema.Number),
      lastModified: Schema.Number,
      fileSize: Schema.optional(Schema.Number),
    }),
  ),
);
const decodeMessages = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      uuid: Schema.String,
      type: Schema.Literals(["user", "assistant"]),
      timestamp: Schema.String,
      message: Schema.Struct({ content: Schema.Unknown }),
      is_meta: Schema.optional(Schema.Boolean),
      parent_tool_use_id: Schema.optional(Schema.NullOr(Schema.String)),
    }),
  ),
);
const decodeText = Schema.decodeUnknownOption(
  Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
);

// Claude Desktop and compaction inject model-only guidance into user turns, either as its own text block or inline.
const SYSTEM_REMINDER = /<system-reminder>[\s\S]*?<\/system-reminder>/g;

function messageText(content: unknown, role: "user" | "assistant"): string {
  const texts =
    typeof content === "string"
      ? [content]
      : Array.isArray(content)
        ? content.flatMap((block) => {
            const decoded = decodeText(block);
            return Option.isSome(decoded) ? [decoded.value.text] : [];
          })
        : [];
  if (role === "assistant") return texts.join("\n");
  return texts
    .map((text) => text.replace(SYSTEM_REMINDER, "").trim())
    .filter((text) => text.length > 0)
    .join("\n");
}

export const makeClaudeNativeSessions = Effect.fn("ClaudeNativeSessions.make")(function* (
  settings: Pick<ClaudeSettings, "homePath">,
  baseEnvironment: NodeJS.ProcessEnv,
) {
  const path = yield* Path.Path;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const home = yield* HostProcess.HomeDirectory;
  const hostEnvironment = yield* HostProcess.Environment;
  const environment = yield* makeClaudeEnvironment(settings, baseEnvironment);
  const configDir = yield* resolveClaudeHomePath(settings, environment);
  const hostConfigDir = yield* resolveClaudeHomePath({ homePath: "" }, hostEnvironment);
  const usesHostConfig =
    normalizeProjectPathForComparison(configDir) ===
    normalizeProjectPathForComparison(hostConfigDir);
  const usesDesktopHome =
    normalizeProjectPathForComparison(configDir) ===
    normalizeProjectPathForComparison(path.join(home, ".claude"));
  const desktopProfiles = usesDesktopHome ? yield* claudeDesktopProfilePaths : [];
  const readDesktopCatalog = yield* makeClaudeDesktopCatalogReader;
  const fail = (operation: string) => (cause: unknown) =>
    new NativeSessionError({
      operation,
      detail: "Could not read or update Claude session history.",
      cause,
    });
  const execute = Effect.fn("ClaudeNativeSessions.execute")(function* (
    method: "listSessions" | "getSessionMessages" | "deleteSession",
    sessionId: string | undefined,
    options: { readonly dir?: string; readonly includeProgrammatic?: boolean },
  ) {
    if (usesHostConfig) {
      return yield* Effect.tryPromise({
        try: async (): Promise<unknown> => {
          if (method === "listSessions") return listSessions(options);
          if (method === "getSessionMessages") return getSessionMessages(sessionId!, options);
          return deleteSession(sessionId!, options).then(() => null);
        },
        catch: fail(method),
      });
    }
    return yield* runClaudeHistoryOperation({
      method,
      ...(sessionId === undefined ? {} : { sessionId }),
      options,
      environment: { ...environment, CLAUDE_CONFIG_DIR: configDir },
    }).pipe(
      Effect.provideService(Path.Path, path),
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
      Effect.flatMap(decodeJson),
    );
  });
  return {
    scope: "global",
    watchPaths: [configDir, ...desktopProfiles],
    list: Effect.fn("ClaudeNativeSessions.list")(
      function* ({ cwd }) {
        const catalog = usesDesktopHome ? yield* readDesktopCatalog() : null;
        if (catalog && !catalog.complete) return { sessions: [], complete: false };
        const history = yield* execute("listSessions", undefined, {
          ...(cwd === undefined ? {} : { dir: cwd }),
          includeProgrammatic: true,
        }).pipe(Effect.flatMap(decodeSessions));
        const visibleNativeIds = new Set(
          catalog
            ? [...catalog.sessions.values()].flatMap((session) => [
                session.cliSessionId,
                ...session.aliases,
              ])
            : (yield* execute("listSessions", undefined, {
                ...(cwd === undefined ? {} : { dir: cwd }),
                includeProgrammatic: false,
              }).pipe(Effect.flatMap(decodeSessions))).map((session) => session.sessionId),
        );
        const sessions = new Map<string, NativeSessionSummary>(
          history
            .filter((session) => visibleNativeIds.has(session.sessionId))
            .map((session) => [
              session.sessionId,
              {
                nativeId: session.sessionId,
                cwd: session.cwd ?? "",
                title: session.summary,
                createdAt: DateTime.formatIso(
                  DateTime.makeUnsafe(session.createdAt ?? session.lastModified),
                ),
                updatedAt: DateTime.formatIso(DateTime.makeUnsafe(session.lastModified)),
                revision: `${session.lastModified}:${session.fileSize ?? ""}`,
                state: "active",
              },
            ]),
        );
        const catalogIds = new Set<string>();
        for (const session of catalog?.sessions.values() ?? []) {
          if (
            cwd !== undefined &&
            normalizeProjectPathForComparison(session.cwd) !==
              normalizeProjectPathForComparison(cwd)
          )
            continue;
          const native = sessions.get(session.cliSessionId);
          const activity = DateTime.formatIso(DateTime.makeUnsafe(session.lastActivityAt));
          catalogIds.add(session.sessionId);
          for (const alias of session.aliases) sessions.delete(alias);
          sessions.set(session.cliSessionId, {
            nativeId: session.cliSessionId,
            catalogId: session.sessionId,
            aliases: session.aliases,
            cwd: session.cwd,
            title: session.title?.trim() || native?.title || "",
            createdAt: native?.createdAt ?? activity,
            updatedAt: native && native.updatedAt > activity ? native.updatedAt : activity,
            ...(native?.revision === undefined ? {} : { revision: native.revision }),
            state: session.state,
          });
        }
        const deleted = [...(catalog?.deleted ?? [])].flatMap(([catalogId, modified]) => {
          if (catalogIds.has(catalogId)) return [];
          const at = DateTime.formatIso(DateTime.makeUnsafe(modified));
          return [
            {
              nativeId: "",
              catalogId,
              cwd: "",
              title: "",
              createdAt: at,
              updatedAt: at,
              state: "deleted" as const,
            },
          ];
        });
        // SDK enumeration skips unreadable transcripts, so absence is never proof of deletion.
        return {
          sessions: [...sessions.values(), ...deleted],
          excludedNativeIds: history
            .filter((session) => !sessions.has(session.sessionId))
            .map((session) => session.sessionId),
          complete: false,
        };
      },
      Effect.mapError(fail("list")),
    ),
    read: Effect.fn("ClaudeNativeSessions.read")(
      function* ({ nativeId, cwd }) {
        const messages = yield* execute("getSessionMessages", nativeId, { dir: cwd }).pipe(
          Effect.flatMap(decodeMessages),
        );
        return messages.flatMap((message): NativeSessionMessage[] => {
          if (message.is_meta || message.parent_tool_use_id) return [];
          const text = messageText(message.message.content, message.type);
          if (!text.trim()) return [];
          return [
            {
              id: message.uuid,
              role: message.type,
              text,
              createdAt: DateTime.formatIso(DateTime.makeUnsafe(message.timestamp)),
            },
          ];
        });
      },
      Effect.mapError(fail("read")),
    ),
    delete: Effect.fn("ClaudeNativeSessions.delete")(
      function* ({ nativeId, cwd }) {
        yield* execute("deleteSession", nativeId, { dir: cwd });
      },
      Effect.mapError(fail("delete")),
    ),
    deletionScope: "transcript",
  } satisfies ProviderNativeSessions;
});
