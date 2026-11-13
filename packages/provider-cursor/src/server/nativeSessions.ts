import type { Agent, AgentMessage } from "@cursor/sdk";
import * as Effect from "effect/Effect";
import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";
import {
  NativeSessionError,
  type NativeSessionMessage,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";

type CursorSessionApi = Pick<
  typeof Agent,
  "list" | "get" | "messages" | "archive" | "unarchive" | "delete"
>;
const isAgentNotFound = Schema.is(Schema.Struct({ code: Schema.Literal("agent_not_found") }));

export function textFromAgentMessage(message: AgentMessage): string {
  const value = message.message;
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return "";
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  for (const key of ["message", "userMessage", "assistantMessage"]) {
    const nested = record[key];
    if (
      typeof nested === "object" &&
      nested !== null &&
      "text" in nested &&
      typeof nested.text === "string"
    ) {
      return nested.text;
    }
  }
  if (!Array.isArray(record.content)) return "";
  return record.content
    .flatMap((part: unknown) =>
      typeof part === "object" && part !== null && "text" in part && typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("");
}

export function makeCursorNativeSessions(load: () => CursorSessionApi): ProviderNativeSessions {
  const call = <A>(operation: string, run: (api: CursorSessionApi) => Promise<A>) =>
    Effect.tryPromise({
      try: () => run(load()),
      catch: (cause) =>
        new NativeSessionError({
          operation,
          detail: "Cursor SDK session operation failed.",
          ...(operation === "read" && isAgentNotFound(cause) ? { notFound: true } : {}),
          cause,
        }),
    });
  const local = (nativeId: string) => !nativeId.startsWith("bc-");
  const refuseCloud = (operation: string) =>
    new NativeSessionError({
      operation,
      detail: "Only local Cursor SDK sessions belong to this provider.",
    });

  return {
    scope: "workspace",
    isolatedStore: true,
    deletionScope: "session",
    list: Effect.fn("CursorNativeSessions.list")(function* ({ cwd }) {
      if (!cwd)
        return yield* new NativeSessionError({
          operation: "list",
          detail: "A Cursor workspace is required.",
        });
      const sessions: NativeSessionSummary[] = [];
      let cursor: string | undefined;
      do {
        const page = yield* call("list", (api) =>
          api.list({ runtime: "local", cwd, limit: 100, ...(cursor ? { cursor } : {}) }),
        );
        for (const agent of page.items) {
          sessions.push({
            nativeId: agent.agentId,
            cwd: agent.runtime === "local" ? (agent.cwd ?? cwd) : cwd,
            title: agent.name || agent.summary || agent.agentId,
            createdAt: DateTime.formatIso(
              DateTime.makeUnsafe(agent.createdAt ?? agent.lastModified),
            ),
            updatedAt: DateTime.formatIso(DateTime.makeUnsafe(agent.lastModified)),
            state: agent.archived ? "archived" : "active",
          });
        }
        cursor = page.nextCursor;
      } while (cursor);
      // The SDK's local list has no status filter and includes archived agents.
      return { sessions, complete: true };
    }),
    read: Effect.fn("CursorNativeSessions.read")(function* ({ nativeId, cwd }) {
      if (!local(nativeId)) return yield* refuseCloud("read");
      const agent = yield* call("read", (api) => api.get(nativeId, { cwd }));
      const messages: NativeSessionMessage[] = [];
      let offset = 0;
      while (true) {
        const page = yield* call("read", (api) =>
          api.messages.list(nativeId, { runtime: "local", cwd, offset, limit: 1000 }),
        );
        if (page.length === 0) break;
        for (const message of page) {
          const text = textFromAgentMessage(message);
          if (text.length === 0) continue;
          messages.push({
            id: message.uuid,
            role: message.type,
            text,
            createdAt: DateTime.formatIso(DateTime.makeUnsafe(agent.createdAt ?? 0)),
          });
        }
        offset += page.length;
      }
      return messages;
    }),
    setArchived: ({ nativeId, cwd, archived }) =>
      local(nativeId)
        ? call("archive", (api) =>
            archived ? api.archive(nativeId, { cwd }) : api.unarchive(nativeId, { cwd }),
          )
        : Effect.fail(refuseCloud("archive")),
    delete: ({ nativeId, cwd }) =>
      local(nativeId)
        ? call("delete", (api) => api.delete(nativeId, { cwd }))
        : Effect.fail(refuseCloud("delete")),
  };
}
