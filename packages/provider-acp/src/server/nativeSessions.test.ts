import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as TestClock from "effect/testing/TestClock";
import type * as AcpSchema from "effect-acp/compat";
import * as AcpErrors from "effect-acp/errors";
import { describe, expect, vi } from "vite-plus/test";
import type { AcpSessionRuntime } from "./AcpSessionRuntime.ts";
import { acpReplayMessages, makeAcpNativeSessions } from "./nativeSessions.ts";

describe("ACP native sessions", () => {
  it.effect(
    "refreshes undated histories and gives replay messages the catalog observation time",
    () =>
      Effect.gen(function* () {
        yield* TestClock.setTime(Date.parse("2026-01-01T00:00:00Z"));
        let handler: Parameters<AcpSessionRuntime["Service"]["handleSessionUpdate"]>[0] | undefined;
        const native = makeAcpNativeSessions(
          Effect.succeed({
            initialize: () =>
              Effect.succeed({
                protocolVersion: 2,
                agentCapabilities: { loadSession: true, sessionCapabilities: { list: {} } },
              }),
            listSessions: () =>
              Effect.succeed({ sessions: [{ sessionId: "undated", cwd: "/project" }] }),
            readSession: () =>
              handler!({
                sessionId: "undated",
                update: {
                  sessionUpdate: "user_message",
                  messageId: "question",
                  content: [{ type: "text", text: "Question" }],
                },
              }),
            deleteSession: () => Effect.succeed({}),
            handleSessionUpdate: (callback) =>
              Effect.sync(() => {
                handler = callback;
              }),
          }),
        );
        const refresh = () =>
          native.withConnection!((connected) =>
            Effect.gen(function* () {
              const catalog = yield* connected.list({});
              const messages = yield* connected.read!({ nativeId: "undated", cwd: "/project" });
              expect(messages[0]?.createdAt).toBe(catalog.sessions[0]?.updatedAt);
              return catalog.sessions[0]!.updatedAt;
            }),
          );
        expect(yield* refresh()).toBe("2026-01-01T00:00:00.000Z");
        yield* TestClock.adjust("30 seconds");
        expect(yield* refresh()).toBe("2026-01-01T00:00:30.000Z");
      }),
  );

  it.effect("shares one scoped connection for pagination, replay and advertised deletion", () =>
    Effect.gen(function* () {
      let acquired = 0;
      let closed = 0;
      let handler: Parameters<AcpSessionRuntime["Service"]["handleSessionUpdate"]>[0] | undefined;
      const list = vi.fn().mockImplementation((input) =>
        Effect.succeed({
          sessions: [
            {
              sessionId: input.cursor ? "second" : "first",
              cwd: "/project",
              title: "Native",
              updatedAt: "2026-01-01T00:00:00Z",
              additionalDirectories: ["/attachments"],
            },
          ],
          ...(input.cursor ? {} : { nextCursor: "next" }),
        }),
      );
      const remove = vi.fn().mockReturnValue(Effect.succeed({}));
      const read = vi.fn().mockImplementation(({ sessionId }) =>
        Effect.gen(function* () {
          yield* handler!({
            sessionId,
            update: {
              sessionUpdate: "user_message_chunk",
              messageId: "question",
              content: { type: "text", text: "Question" },
            },
          });
          yield* handler!({
            sessionId,
            update: {
              sessionUpdate: "agent_message",
              messageId: "answer",
              content: [{ type: "text", text: "Answer" }],
            },
          });
        }),
      );
      const runtime = {
        initialize: () =>
          Effect.succeed({
            protocolVersion: 2,
            agentCapabilities: { loadSession: true, sessionCapabilities: { list: {}, delete: {} } },
          }),
        listSessions: list,
        readSession: read,
        deleteSession: remove,
        handleSessionUpdate: (callback) =>
          Effect.sync(() => {
            handler = callback;
          }),
      } satisfies Pick<
        AcpSessionRuntime["Service"],
        "initialize" | "listSessions" | "readSession" | "deleteSession" | "handleSessionUpdate"
      >;
      const native = makeAcpNativeSessions(
        Effect.acquireRelease(
          Effect.sync(() => {
            acquired++;
            return runtime;
          }),
          () =>
            Effect.sync(() => {
              closed++;
            }),
        ),
      );
      expect(native.delete).toBeUndefined();
      yield* native.withConnection!((connected) =>
        Effect.gen(function* () {
          const catalog = yield* connected.list({});
          expect(catalog.sessions.map((session) => session.nativeId)).toEqual(["first", "second"]);
          expect(catalog.complete).toBe(false);
          const first = yield* connected.read!({ nativeId: "first", cwd: "/project" });
          expect(first.map((message) => [message.id, message.text])).toEqual([
            ["question", "Question"],
            ["answer", "Answer"],
          ]);
          expect(yield* connected.read!({ nativeId: "first", cwd: "/project" })).toEqual(first);
          yield* connected.delete!({ nativeId: "first", cwd: "/project" });
        }),
      );
      expect(acquired).toBe(1);
      expect(closed).toBe(1);
      expect(list.mock.calls[0]?.[0]).toEqual({});
      expect(read.mock.calls[0]?.[0]).toEqual({
        sessionId: "first",
        cwd: "/project",
        additionalDirectories: ["/attachments"],
      });
      expect(remove).toHaveBeenCalledWith("first");
      expect(native.delete).toBeTypeOf("function");
      expect(native.setArchived).toBeUndefined();
    }),
  );

  it.effect("does not call or expose unadvertised list, load, or delete operations", () =>
    Effect.gen(function* () {
      const unexpected = () => Effect.die("Unadvertised native operation was called");
      const native = makeAcpNativeSessions(
        Effect.succeed({
          initialize: () => Effect.succeed({ protocolVersion: 2, agentCapabilities: {} }),
          listSessions: unexpected,
          readSession: unexpected,
          deleteSession: unexpected,
          handleSessionUpdate: () => Effect.void,
        }),
      );
      expect(yield* native.list({})).toEqual({ sessions: [], complete: false });
      expect(native.read).toBeUndefined();
      expect(native.delete).toBeUndefined();
    }),
  );

  it.effect("closes a failed paginated refresh without returning a partial complete catalog", () =>
    Effect.gen(function* () {
      let closed = false;
      const native = makeAcpNativeSessions(
        Effect.acquireRelease(
          Effect.succeed({
            initialize: () =>
              Effect.succeed({
                protocolVersion: 2,
                agentCapabilities: { sessionCapabilities: { list: {} } },
              }),
            listSessions: ({
              cursor,
            }: NonNullable<Parameters<AcpSessionRuntime["Service"]["listSessions"]>[0]> = {}) =>
              cursor
                ? Effect.fail(AcpErrors.AcpRequestError.internalError("fixture page failure"))
                : Effect.succeed({ sessions: [], nextCursor: "next" }),
            readSession: () => Effect.void,
            deleteSession: () => Effect.succeed({}),
            handleSessionUpdate: () => Effect.void,
          }),
          () =>
            Effect.sync(() => {
              closed = true;
            }),
        ),
      );
      expect((yield* native.list({}).pipe(Effect.exit))._tag).toBe("Failure");
      expect(closed).toBe(true);
    }),
  );

  it("uses full replay messages authoritatively and keeps ID-less replay IDs stable on append", () => {
    const updates: AcpSchema.SessionUpdate[] = [
      {
        sessionUpdate: "user_message_chunk",
        messageId: "retracted",
        content: { type: "text", text: "Old user text" },
      },
      { sessionUpdate: "user_message", messageId: "retracted", content: null },
      {
        sessionUpdate: "agent_message_chunk",
        messageId: "answer",
        content: { type: "text", text: "Partial" },
      },
      {
        sessionUpdate: "agent_message",
        messageId: "answer",
        content: [{ type: "text", text: "Complete" }],
      },
      { sessionUpdate: "agent_message", messageId: "answer" },
      { sessionUpdate: "user_message_chunk", content: { type: "text", text: "Next" } },
      { sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "Hidden" } },
      { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Before" } },
      {
        sessionUpdate: "agent_message_chunk",
        content: { type: "image", data: "AA==", mimeType: "image/png" },
      },
      { sessionUpdate: "agent_message_chunk", content: { type: "text", text: " image" } },
      {
        sessionUpdate: "user_message_chunk",
        content: { type: "image", data: "AA==", mimeType: "image/png" },
      },
    ];
    const observedAt = "2026-01-01T00:00:00.000Z";
    const messages = acpReplayMessages(updates, observedAt);
    expect(messages.map((message) => message.text)).toEqual(["Complete", "Next", "Before image"]);
    const appended = acpReplayMessages(
      [
        ...updates,
        { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Later" } },
      ],
      observedAt,
    );
    expect(appended.slice(0, 3)).toEqual(messages);
    expect(appended.map((message) => message.text)).toEqual([
      "Complete",
      "Next",
      "Before image",
      "Later",
    ]);
  });
});
