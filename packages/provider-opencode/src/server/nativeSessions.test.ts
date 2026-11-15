import type { OpencodeClient } from "@opencode-ai/sdk/v2";
import { Session, SessionMessage, type OpenCodeClient } from "@opencode/client/effect";
import { it } from "@effect/vitest";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { describe, expect, vi } from "vite-plus/test";
import { makeOpenCodeNativeSessions } from "./nativeSessions.ts";

const decodeSessionInfo = Schema.decodeUnknownSync(Session.Info);

describe("OpenCode native sessions", () => {
  it.effect("recognizes native missing-session errors in both SDK generations", () =>
    Effect.gen(function* () {
      for (const generation of ["v1", "v2"] as const) {
        for (const missing of [true, false]) {
          const error = !missing
            ? new Error("Server unavailable")
            : generation === "v1"
              ? { name: "NotFoundError", data: { message: "Missing session" } }
              : { _tag: "SessionNotFoundError", sessionID: "ses-one", message: "Missing session" };
          const native = makeOpenCodeNativeSessions({
            cwd: "/project",
            generation: Effect.succeed(generation),
            v1: (_cwd, use) =>
              use({
                session: { get: vi.fn().mockRejectedValue(error) },
              } as unknown as OpencodeClient),
            v2: (use) =>
              use({
                session: { get: () => Effect.fail(error) },
                message: { list: () => Effect.fail(error) },
              } as unknown as OpenCodeClient),
          });
          expect(
            (yield* native.read!({ nativeId: "ses-one", cwd: "/project" }).pipe(Effect.flip))
              .notFound,
          ).toBe(missing ? true : undefined);
        }
      }
    }),
  );

  it.effect(
    "keeps archived 1.x roots and forks, excludes children, and respects native reverts and deletion confirmation",
    () =>
      Effect.gen(function* () {
        const list = vi
          .fn()
          .mockResolvedValueOnce({
            data: [
              {
                id: "session",
                directory: "/project",
                title: "Native",
                time: { created: 1, updated: 2, archived: 3 },
              },
              {
                id: "child",
                parentID: "session",
                directory: "/project",
                title: "Subagent",
                time: { created: 1, updated: 2 },
              },
            ],
          })
          .mockResolvedValueOnce({
            data: [
              {
                id: "fork",
                directory: "/project",
                title: "Native (fork #1)",
                time: { created: 1, updated: 1 },
              },
            ],
          })
          .mockResolvedValueOnce({ data: [] });
        const remove = vi.fn().mockResolvedValue({ data: false });
        const client = {
          experimental: { session: { list } },
          session: {
            get: async () => ({ data: { revert: { messageID: "reverted" } } }),
            messages: async () => ({
              data: [
                {
                  info: { id: "kept", role: "user", time: { created: 1 } },
                  parts: [
                    { type: "text", text: "Visible" },
                    { type: "text", text: "Injected", synthetic: true },
                  ],
                },
                {
                  info: { id: "reverted", role: "assistant", time: { created: 2 } },
                  parts: [{ type: "text", text: "Discarded" }],
                },
              ],
            }),
            delete: remove,
          },
        } as unknown as OpencodeClient;
        const native = makeOpenCodeNativeSessions({
          cwd: "/project",
          generation: Effect.succeed("v1"),
          v1: (_cwd, use) => use(client),
          v2: () => Effect.die("Unexpected 2.x request"),
        });
        const found = yield* native.list({});
        expect(found.sessions.map((session) => session.nativeId)).toEqual(["session", "fork"]);
        expect(found.sessions[0]?.state).toBe("archived");
        expect(found.complete).toBe(false);
        expect(list.mock.calls[0]?.[0]?.archived).toBe(true);
        expect(
          (yield* native.read!({ nativeId: "session", cwd: "/project" })).map((message) => [
            message.id,
            message.text,
          ]),
        ).toEqual([["kept", "Visible"]]);
        expect(
          (yield* native.delete!({ nativeId: "session", cwd: "/project" }).pipe(Effect.exit))._tag,
        ).toBe("Failure");
      }),
  );

  it.effect(
    "pages 2.x roots, forks, and visible messages without importing children or inferring absence",
    () =>
      Effect.gen(function* () {
        const created = DateTime.makeUnsafe(1);
        const row = decodeSessionInfo({
          id: "session",
          projectID: "project",
          location: { directory: "/project" },
          title: "Native",
          time: { created: 1, updated: 1 },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        });
        let revert: Session.Info["revert"];
        const get = vi
          .fn<OpenCodeClient["session"]["get"]>()
          .mockImplementation(() => Effect.succeed({ ...row, revert }));
        const list = vi.fn().mockImplementation((input) =>
          Effect.succeed(
            input.cursor
              ? {
                  data: [
                    {
                      ...row,
                      id: "fork",
                      fork: {
                        sessionID: row.id,
                        boundary: { type: "through", messageID: "question" },
                      },
                    },
                  ],
                  cursor: {},
                }
              : {
                  data: [row, { ...row, id: "child", parentID: row.id }],
                  cursor: { next: "next" },
                },
          ),
        );
        const messages = vi.fn().mockImplementation((input) =>
          Effect.succeed(
            input.cursor
              ? {
                  data: [
                    {
                      type: "user",
                      id: "msg_follow_up",
                      text: "Follow-up question",
                      time: { created },
                    },
                    {
                      type: "assistant",
                      id: "msg_follow_up_answer",
                      content: [
                        { type: "reasoning", text: "Hidden" },
                        { type: "text", text: "Follow-up answer" },
                      ],
                      time: { created },
                    },
                  ],
                  cursor: {},
                }
              : {
                  data: [
                    { type: "user", id: "question", text: "Question", time: { created } },
                    {
                      type: "assistant",
                      id: "answer",
                      content: [{ type: "text", text: "Answer" }],
                      time: { created },
                    },
                  ],
                  cursor: { next: "next" },
                },
          ),
        );
        const client = {
          session: { get, list, remove: () => Effect.void },
          message: { list: messages },
        } as unknown as OpenCodeClient;
        const native = makeOpenCodeNativeSessions({
          cwd: "/project",
          generation: Effect.succeed("v2"),
          v1: () => Effect.die("Unexpected 1.x request"),
          v2: (use) => use(client),
        });
        const found = yield* native.list({});
        expect(found.complete).toBe(false);
        expect(found.sessions.map((session) => session.nativeId)).toEqual(["session", "fork"]);
        const history = yield* native.read!({ nativeId: "session", cwd: "/project" });
        expect(history.map((message) => [message.id, message.text])).toEqual([
          ["question", "Question"],
          ["answer", "Answer"],
          ["msg_follow_up", "Follow-up question"],
          ["msg_follow_up_answer", "Follow-up answer"],
        ]);
        revert = { messageID: SessionMessage.ID.make("msg_follow_up") };
        expect(yield* native.read!({ nativeId: "session", cwd: "/project" })).toEqual(
          history.slice(0, 2),
        );
        revert = undefined;
        expect(yield* native.read!({ nativeId: "session", cwd: "/project" })).toEqual(history);
        expect(list.mock.calls[1]?.[0]?.order).toBeUndefined();
        expect(native).not.toHaveProperty("setArchived");
      }),
  );
});
