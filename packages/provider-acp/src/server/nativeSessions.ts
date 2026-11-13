// @effect-diagnostics nodeBuiltinImport:off
import * as NodeCrypto from "node:crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
import * as Semaphore from "effect/Semaphore";
import * as AcpErrors from "effect-acp/errors";
import type * as AcpSchema from "effect-acp/compat";
import {
  NativeSessionError,
  type NativeSessionMessage,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import type { AcpSessionRuntime } from "./AcpSessionRuntime.ts";

type Connection = Pick<
  AcpSessionRuntime["Service"],
  "initialize" | "listSessions" | "readSession" | "deleteSession" | "handleSessionUpdate"
>;
const isRequestError = Schema.is(AcpErrors.AcpRequestError);
const failed = (operation: string) => (cause: unknown) =>
  new NativeSessionError({
    operation,
    detail: "ACP native session operation failed.",
    ...(operation === "read" && isRequestError(cause) && cause.code === -32002
      ? { notFound: true }
      : {}),
    cause,
  });

/** ACP 1 chunks have no required message ID; content and occurrence give repeatable replay IDs. */
export function acpReplayMessages(
  updates: ReadonlyArray<AcpSchema.SessionUpdate>,
  createdAt: string,
): NativeSessionMessage[] {
  const rows: Array<{ id?: string; role: "user" | "assistant"; text: string }> = [];
  let chunk: (typeof rows)[number] | undefined;
  for (const update of updates) {
    if (update.sessionUpdate === "user_message" || update.sessionUpdate === "agent_message") {
      const role = update.sessionUpdate === "user_message" ? "user" : "assistant";
      const text = (update.content ?? [])
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("\n");
      const previous = rows.find((row) => row.id === update.messageId);
      if (previous) {
        if (update.content !== undefined) previous.text = text;
      } else if (text) rows.push({ id: update.messageId, role, text });
      chunk = undefined;
      continue;
    }
    if (
      update.sessionUpdate !== "user_message_chunk" &&
      update.sessionUpdate !== "agent_message_chunk"
    ) {
      if (update.sessionUpdate === "tool_call") chunk = undefined;
      continue;
    }
    const role = update.sessionUpdate === "user_message_chunk" ? "user" : "assistant";
    const id = update.messageId ?? undefined;
    if (update.content.type !== "text") {
      if (chunk && (chunk.role !== role || chunk.id !== id)) chunk = undefined;
      continue;
    }
    const previous = id ? rows.find((row) => row.id === id) : undefined;
    if (previous) previous.text += update.content.text;
    else if (chunk?.role === role && chunk.id === id) chunk.text += update.content.text;
    else {
      chunk = { ...(id ? { id } : {}), role, text: update.content.text };
      rows.push(chunk);
    }
  }
  const occurrences = new Map<string, number>();
  return rows
    .filter((row) => row.text.length > 0)
    .map((row) => {
      if (row.id) return { ...row, id: row.id, createdAt };
      const digest = NodeCrypto.createHash("sha256")
        .update(`${row.role}\0${row.text}`)
        .digest("hex");
      const occurrence = occurrences.get(digest) ?? 0;
      occurrences.set(digest, occurrence + 1);
      return { ...row, id: `replay:${digest}:${occurrence}`, createdAt };
    });
}

/** One initialized process serves a refresh; its scope closes all loaded sessions afterwards. */
export function makeAcpNativeSessions<AcquireError>(
  acquire: Effect.Effect<Connection, AcquireError, Scope.Scope>,
): ProviderNativeSessions {
  const withConnection = <A, E, R>(
    use: (sessions: ProviderNativeSessions) => Effect.Effect<A, E, R>,
  ) =>
    Effect.scoped(
      Effect.gen(function* () {
        const runtime = yield* acquire.pipe(Effect.mapError(failed("connect")));
        const initialized = yield* runtime.initialize().pipe(Effect.mapError(failed("initialize")));
        const capabilities = initialized.agentCapabilities;
        const canRead = capabilities?.loadSession === true;
        const canDelete = capabilities?.sessionCapabilities?.delete != null;
        if (canRead) service.read = read;
        else delete service.read;
        if (canDelete) {
          service.delete = remove;
          service.deletionScope = "session";
        } else {
          delete service.delete;
          delete service.deletionScope;
        }
        const gate = yield* Semaphore.make(1);
        const directories = new Map<string, ReadonlyArray<string>>();
        const timestamps = new Map<string, string>();
        let replay: { sessionId: string; updates: AcpSchema.SessionUpdate[] } | undefined;
        yield* runtime
          .handleSessionUpdate((notification) =>
            Effect.sync(() => {
              if (replay?.sessionId === notification.sessionId)
                replay.updates.push(notification.update);
            }),
          )
          .pipe(Effect.mapError(failed("read")));
        const connected: ProviderNativeSessions = {
          scope: "global",
          list: Effect.fn("AcpNativeSessions.list")(function* () {
            if (capabilities?.sessionCapabilities?.list == null)
              return { sessions: [], complete: false };
            const sessions = new Map<string, NativeSessionSummary>();
            const observedAt = DateTime.formatIso(yield* DateTime.now);
            const seen = new Set<string>();
            let cursor: string | undefined;
            do {
              const page = yield* runtime
                .listSessions(cursor ? { cursor } : {})
                .pipe(Effect.mapError(failed("list")));
              for (const row of page.sessions) {
                const at = Option.match(DateTime.make(row.updatedAt ?? ""), {
                  // Undated catalogs must change each refresh so new messages are read again.
                  onNone: () => observedAt,
                  onSome: DateTime.formatIso,
                });
                directories.set(row.sessionId, row.additionalDirectories ?? []);
                timestamps.set(row.sessionId, at);
                sessions.set(row.sessionId, {
                  nativeId: row.sessionId,
                  cwd: row.cwd,
                  title: row.title || row.sessionId,
                  createdAt: at,
                  updatedAt: at,
                  state: "active",
                });
              }
              cursor = page.nextCursor ?? undefined;
              if (cursor && seen.has(cursor))
                return yield* new NativeSessionError({
                  operation: "list",
                  detail: "ACP repeated a pagination cursor.",
                });
              if (cursor) seen.add(cursor);
            } while (cursor);
            // ACP advertises no archive state or guarantee of archived-session inclusion.
            return { sessions: [...sessions.values()], complete: false };
          }, gate.withPermits(1)),
          ...(canRead
            ? {
                read: Effect.fn("AcpNativeSessions.read")(function* ({ nativeId, cwd }) {
                  replay = { sessionId: nativeId, updates: [] };
                  try {
                    yield* runtime
                      .readSession({
                        sessionId: nativeId,
                        cwd,
                        additionalDirectories: directories.get(nativeId) ?? [],
                      })
                      .pipe(Effect.mapError(failed("read")));
                    const at = timestamps.get(nativeId) ?? DateTime.formatIso(yield* DateTime.now);
                    return acpReplayMessages(replay.updates, at);
                  } finally {
                    replay = undefined;
                  }
                }, gate.withPermits(1)),
              }
            : {}),
          ...(canDelete
            ? {
                deletionScope: "session" as const,
                delete: ({ nativeId }) =>
                  runtime
                    .deleteSession(nativeId)
                    .pipe(Effect.asVoid, Effect.mapError(failed("delete")), gate.withPermits(1)),
              }
            : {}),
        };
        return yield* use(connected);
      }),
    );
  const read: NonNullable<ProviderNativeSessions["read"]> = (address) =>
    withConnection((connected) =>
      connected.read
        ? connected.read(address)
        : Effect.fail(
            new NativeSessionError({
              operation: "read",
              detail: "ACP session/load is not advertised.",
            }),
          ),
    );
  const remove: NonNullable<ProviderNativeSessions["delete"]> = (address) =>
    withConnection((connected) =>
      connected.delete
        ? connected.delete(address)
        : Effect.fail(
            new NativeSessionError({
              operation: "delete",
              detail: "ACP session/delete is not advertised.",
            }),
          ),
    );
  const service: { -readonly [Key in keyof ProviderNativeSessions]: ProviderNativeSessions[Key] } =
    {
      scope: "global",
      withConnection,
      list: (input) => withConnection((connected) => connected.list(input)),
    };
  return service;
}
