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
const isConversationTurn = Schema.is(
  Schema.Struct({
    turn: Schema.Struct({
      case: Schema.Literal("agentConversationTurn"),
      value: Schema.Struct({
        userMessage: Schema.optional(Schema.Struct({ text: Schema.String })),
        steps: Schema.Array(Schema.Unknown),
      }),
    }),
  }),
);
const isAssistantStep = Schema.is(
  Schema.Struct({
    message: Schema.Struct({
      case: Schema.Literal("assistantMessage"),
      value: Schema.Struct({ text: Schema.String }),
    }),
  }),
);

export function messagesFromAgentMessage(
  message: AgentMessage,
): Array<Omit<NativeSessionMessage, "createdAt">> {
  if (!isConversationTurn(message.message)) return [];
  const turn = message.message.turn.value;
  // The SDK returns whole checkpoint turns, so the outer role also covers assistant steps.
  const messages: Array<Omit<NativeSessionMessage, "createdAt">> = [];
  if (turn.userMessage?.text)
    messages.push({ id: `${message.uuid}:user`, role: "user", text: turn.userMessage.text });
  for (const [index, step] of turn.steps.entries()) {
    if (!isAssistantStep(step) || !step.message.value.text) continue;
    messages.push({
      id: `${message.uuid}:step:${index}`,
      role: "assistant",
      text: step.message.value.text,
    });
  }
  return messages;
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
        for (const message of page.flatMap(messagesFromAgentMessage)) {
          messages.push({
            ...message,
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
