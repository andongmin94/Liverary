import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import { Session, type OpenCodeClient } from "@opencode/client/effect";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import {
  NativeSessionError,
  type NativeSessionMessage,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import type { OpenCodeRuntimeError } from "./OpenCodeRuntime.ts";
import { paginate } from "./v2/OpenCode2Client.ts";

export interface OpenCodeNativeSessionClients {
  readonly cwd: string;
  readonly generation: Effect.Effect<"v1" | "v2", OpenCodeRuntimeError>;
  readonly v1: <A, E>(
    cwd: string,
    use: (client: OpencodeClient) => Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | OpenCodeRuntimeError>;
  readonly v2: <A, E>(
    use: (client: OpenCodeClient) => Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | OpenCodeRuntimeError>;
}

const iso = (milliseconds: number) => DateTime.formatIso(DateTime.makeUnsafe(milliseconds));
const isNativeSessionError = Schema.is(NativeSessionError);
const isSessionNotFound = Schema.is(
  Schema.Union([
    Schema.TaggedStruct("SessionNotFoundError", {}),
    Schema.Struct({
      name: Schema.Literal("NotFoundError"),
      data: Schema.Struct({ message: Schema.String }),
    }),
  ]),
);
const failure = (operation: string) => (cause: unknown) =>
  isNativeSessionError(cause)
    ? cause
    : new NativeSessionError({
        operation,
        detail: "OpenCode native session operation failed.",
        ...(operation === "read" && isSessionNotFound(cause) ? { notFound: true } : {}),
        cause,
      });
const request = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({ try: run, catch: failure(operation) });

export function makeOpenCodeNativeSessions(
  clients: OpenCodeNativeSessionClients,
): ProviderNativeSessions {
  return {
    scope: "global",
    deletionScope: "session",
    list: Effect.fn("OpenCodeNativeSessions.list")(
      function* () {
        const generation = yield* clients.generation;
        if (generation === "v2") {
          return yield* clients.v2((client) => {
            const input: NonNullable<Parameters<OpenCodeClient["session"]["list"]>[0]> = {
              limit: 100,
              order: "asc",
            };
            return paginate(input, client.session.list).pipe(
              Stream.filter((row) => row.parentID == null),
              Stream.runCollect,
              Effect.map((rows) => ({
                sessions: rows.map((row): NativeSessionSummary => ({
                  nativeId: row.id,
                  cwd: row.location.directory,
                  title: row.title || row.id,
                  ...(row.model ? { model: row.model.id } : {}),
                  createdAt: DateTime.formatIso(row.time.created),
                  updatedAt: DateTime.formatIso(row.time.updated),
                  state: row.time.archived ? "archived" : "active",
                })),
                // The 2.x SDK does not expose an option that guarantees archived-session inclusion.
                complete: false,
              })),
            );
          });
        }
        return yield* clients.v1(
          clients.cwd,
          Effect.fn("OpenCodeNativeSessions.listV1")(function* (client) {
            const sessions = new Map<string, NativeSessionSummary>();
            let cursor: number | undefined;
            while (true) {
              const { data } = yield* request("list", () =>
                client.experimental.session.list(
                  { archived: true, limit: 100, ...(cursor === undefined ? {} : { cursor }) },
                  { throwOnError: true },
                ),
              );
              if (data.length === 0) break;
              for (const row of data) {
                if (row.parentID != null) continue;
                sessions.set(row.id, {
                  nativeId: row.id,
                  cwd: row.directory,
                  title: row.title,
                  ...(row.model ? { model: row.model.id } : {}),
                  createdAt: iso(row.time.created),
                  updatedAt: iso(row.time.updated),
                  state: row.time.archived ? "archived" : "active",
                });
              }
              const next = Math.min(...data.map((row) => row.time.updated));
              if (next === cursor) break;
              cursor = next;
            }
            // Timestamp cursors cannot establish completeness when a page boundary has equal timestamps.
            return { sessions: [...sessions.values()], complete: false };
          }),
        );
      },
      Effect.mapError(failure("list")),
    ),
    read: Effect.fn("OpenCodeNativeSessions.read")(
      function* ({ nativeId, cwd }) {
        if ((yield* clients.generation) === "v2") {
          return yield* clients.v2((client) =>
            paginate(
              { sessionID: Session.ID.make(nativeId), order: "asc" as const, limit: 100 },
              client.message.list,
            ).pipe(
              Stream.runCollect,
              Effect.map((rows) =>
                rows.flatMap((row): NativeSessionMessage[] => {
                  const text =
                    row.type === "user"
                      ? row.text
                      : row.type === "assistant"
                        ? row.content
                            .flatMap((part) => (part.type === "text" ? [part.text] : []))
                            .join("\n")
                        : "";
                  return text && (row.type === "user" || row.type === "assistant")
                    ? [
                        {
                          id: row.id,
                          role: row.type,
                          text,
                          createdAt: DateTime.formatIso(row.time.created),
                        },
                      ]
                    : [];
                }),
              ),
            ),
          );
        }
        return yield* clients.v1(
          cwd,
          Effect.fn("OpenCodeNativeSessions.readV1")(function* (client) {
            const native = yield* request("read", () =>
              client.session.get({ sessionID: nativeId }, { throwOnError: true }),
            );
            const { data } = yield* request("read", () =>
              client.session.messages({ sessionID: nativeId }, { throwOnError: true }),
            );
            const messages: NativeSessionMessage[] = [];
            for (const { info, parts } of data) {
              if (info.id === native.data.revert?.messageID) break;
              const text = parts
                .flatMap((part) =>
                  part.type === "text" && part.ignored !== true && part.synthetic !== true
                    ? [part.text]
                    : [],
                )
                .join("\n");
              if (text)
                messages.push({
                  id: info.id,
                  role: info.role,
                  text,
                  createdAt: iso(info.time.created),
                });
            }
            return messages;
          }),
        );
      },
      Effect.mapError(failure("read")),
    ),
    delete: Effect.fn("OpenCodeNativeSessions.delete")(
      function* ({ nativeId, cwd }) {
        if ((yield* clients.generation) === "v2")
          return yield* clients.v2((client) =>
            client.session.remove({ sessionID: Session.ID.make(nativeId) }),
          );
        const removed = yield* clients.v1(cwd, (client) =>
          request("delete", () =>
            client.session.delete({ sessionID: nativeId }, { throwOnError: true }),
          ),
        );
        if (!removed.data)
          return yield* new NativeSessionError({
            operation: "delete",
            detail: "OpenCode did not confirm session deletion.",
          });
      },
      Effect.mapError(failure("delete")),
    ),
  };
}
