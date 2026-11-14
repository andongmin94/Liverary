import {
  NativeSessionError,
  type NativeSessionAddress,
  type NativeSessionMessage,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import type * as CodexClient from "effect-codex-app-server/client";
import * as CodexErrors from "effect-codex-app-server/errors";
import type * as CodexSchema from "effect-codex-app-server/schema";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";

import { readCodexSessionRevisions } from "../project/CodexSqliteHistory.ts";
import { readCodexDesktopExcludedNativeIds } from "./CodexDesktopSessionVisibility.ts";

const isRequestError = Schema.is(CodexErrors.CodexAppServerRequestError);

function isMissingThread(cause: unknown, nativeId: string | undefined) {
  return (
    nativeId !== undefined &&
    isRequestError(cause) &&
    cause.code === -32600 &&
    (cause.errorMessage === `thread not found: ${nativeId}` ||
      cause.errorMessage === `no rollout found for thread id ${nativeId}` ||
      (cause.method === "thread/read" && cause.errorMessage === `thread not loaded: ${nativeId}`))
  );
}

function sessionError(operation: string, cause: unknown, nativeId?: string) {
  return new NativeSessionError({
    operation,
    detail: cause instanceof Error ? cause.message : String(cause),
    ...(isMissingThread(cause, nativeId) ? { notFound: true } : {}),
    cause,
  });
}

function timestamp(milliseconds: number) {
  return DateTime.formatIso(DateTime.makeUnsafe(milliseconds));
}

function messageFromItem(
  item: CodexSchema.V2ThreadItemsListResponse__ThreadItem,
  turnId: string,
  createdAtMs: number,
): NativeSessionMessage | undefined {
  if (item.type !== "userMessage" && item.type !== "agentMessage") return undefined;
  const text =
    item.type === "agentMessage"
      ? item.text
      : item.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
  if (!text.trim()) return undefined;
  return {
    id: item.id,
    turnId,
    role: item.type === "userMessage" ? "user" : "assistant",
    text,
    createdAt: timestamp(createdAtMs),
  };
}

export function makeCodexNativeSessions<E>(input: {
  readonly homePath: string;
  readonly openClient: (
    cwd: string | undefined,
  ) => Effect.Effect<CodexClient.CodexAppServerClient["Service"], E, Scope.Scope>;
}) {
  const withConnection: NonNullable<ProviderNativeSessions["withConnection"]> = Effect.fn(
    "CodexNativeSessions.withConnection",
  )(function* <A, UseError, R>(
    use: (sessions: ProviderNativeSessions) => Effect.Effect<A, UseError, R>,
  ) {
    const client = yield* input
      .openClient(undefined)
      .pipe(Effect.mapError((cause) => sessionError("connect", cause)));
    return yield* use(
      makeCodexNativeSessions({
        homePath: input.homePath,
        openClient: () => Effect.succeed(client),
      }),
    );
  }, Effect.scoped);
  return {
    scope: "global",
    watchPaths: [input.homePath],
    deletionScope: "session",
    withConnection,
    list: Effect.fn("CodexNativeSessions.list")(
      function* (request: { readonly cwd?: string }) {
        const client = yield* input.openClient(request.cwd);
        const sessions = new Map<string, NativeSessionSummary>();
        const excludedNativeIds = new Set<string>();
        const desktopExcluded = readCodexDesktopExcludedNativeIds(input.homePath);
        const nativeThreads = new Map<string, CodexSchema.V2ThreadListResponse__Thread>();
        for (const sourceKinds of [undefined, ["exec"] as const]) {
          for (const archived of [false, true]) {
            let cursor: string | undefined;
            do {
              const page = yield* client.request("thread/list", {
                archived,
                ...(request.cwd === undefined ? {} : { cwd: request.cwd }),
                modelProviders: [],
                useStateDbOnly: true,
                ...(sourceKinds === undefined ? {} : { sourceKinds }),
                ...(cursor === undefined ? {} : { cursor }),
              });
              for (const thread of page.data) {
                if (
                  thread.ephemeral ||
                  thread.parentThreadId != null ||
                  (typeof thread.source === "object" && "subAgent" in thread.source)
                )
                  continue;
                if (sourceKinds !== undefined || (!archived && desktopExcluded.has(thread.id))) {
                  excludedNativeIds.add(thread.id);
                  continue;
                }
                nativeThreads.set(thread.id, thread);
                sessions.set(thread.id, {
                  nativeId: thread.id,
                  cwd: thread.cwd,
                  title: thread.name?.trim() || thread.preview.split("\n", 1)[0] || "Codex",
                  ...(thread.model == null ? {} : { model: thread.model }),
                  createdAt: timestamp(thread.createdAt * 1000),
                  updatedAt: timestamp(thread.updatedAt * 1000),
                  state: archived ? "archived" : "active",
                });
              }
              cursor = page.nextCursor ?? undefined;
            } while (cursor !== undefined);
          }
        }
        const revisions = readCodexSessionRevisions(
          input.homePath,
          Array.from(nativeThreads.values()),
        );
        return {
          sessions: Array.from(sessions.values(), (session) => {
            const revision = revisions.get(session.nativeId);
            return revision === undefined ? session : { ...session, revision };
          }),
          excludedNativeIds: [...excludedNativeIds].filter((nativeId) => !sessions.has(nativeId)),
          complete: true,
        };
      },
      Effect.scoped,
      Effect.mapError((cause) => sessionError("list", cause)),
    ),
    read: Effect.fn("CodexNativeSessions.read")(
      function* ({ nativeId, cwd }: NativeSessionAddress) {
        const client = yield* input.openClient(cwd);
        const { thread } = yield* client.request("thread/read", {
          threadId: nativeId,
          includeTurns: false,
        });
        const messages: NativeSessionMessage[] = [];
        if (thread.historyMode === "paginated") {
          let cursor: string | undefined;
          do {
            const page = yield* client.request("thread/items/list", {
              threadId: nativeId,
              sortDirection: "asc",
              ...(cursor === undefined ? {} : { cursor }),
            });
            for (const entry of page.data) {
              const message = messageFromItem(
                entry.item,
                entry.turnId,
                entry.startedAtMs ?? entry.completedAtMs ?? thread.createdAt * 1000,
              );
              if (message) messages.push(message);
            }
            cursor = page.nextCursor ?? undefined;
          } while (cursor !== undefined);
        } else {
          const history = yield* client.request("thread/read", {
            threadId: nativeId,
            includeTurns: true,
          });
          for (const turn of history.thread.turns) {
            for (const item of turn.items) {
              const message = messageFromItem(
                item,
                turn.id,
                (turn.startedAt ?? turn.completedAt ?? thread.createdAt) * 1000,
              );
              if (message) messages.push(message);
            }
          }
        }
        return messages;
      },
      Effect.scoped,
      (effect, request) =>
        effect.pipe(Effect.mapError((cause) => sessionError("read", cause, request.nativeId))),
    ),
    setArchived: Effect.fn("CodexNativeSessions.setArchived")(
      function* ({
        nativeId,
        cwd,
        archived,
      }: NativeSessionAddress & { readonly archived: boolean }) {
        const client = yield* input.openClient(cwd);
        yield* client.request(archived ? "thread/archive" : "thread/unarchive", {
          threadId: nativeId,
        });
      },
      Effect.scoped,
      (effect, request) =>
        effect.pipe(
          Effect.mapError((cause) =>
            sessionError(request.archived ? "archive" : "unarchive", cause, request.nativeId),
          ),
        ),
    ),
    delete: Effect.fn("CodexNativeSessions.delete")(
      function* ({ nativeId, cwd }: NativeSessionAddress) {
        const client = yield* input.openClient(cwd);
        yield* client.request("thread/delete", { threadId: nativeId }).pipe(
          Effect.catchIf(
            (cause) => isMissingThread(cause, nativeId),
            () => Effect.void,
          ),
        );
      },
      Effect.scoped,
      (effect, request) =>
        effect.pipe(Effect.mapError((cause) => sessionError("delete", cause, request.nativeId))),
    ),
  } satisfies ProviderNativeSessions;
}
