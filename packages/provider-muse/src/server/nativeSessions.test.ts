import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe, expect, vi } from "vite-plus/test";
import { makeMuseNativeSessions } from "./nativeSessions.ts";
import type { MuseSdkHost } from "./sdk.ts";

const session = {
  sessionId: "muse-one",
  workspaceRoot: "/project",
  name: "Saved work",
  modelId: "muse",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};
const item = {
  itemId: "message-one",
  kind: "userMessage",
  revision: 1,
  status: "completed",
  turnId: "turn-one",
  text: "Question",
  recordedAt: session.createdAt,
};

describe("Muse native sessions", () => {
  it.effect("confirms a missing native session without treating a host failure as deletion", () =>
    Effect.gen(function* () {
      const request = vi
        .fn<MuseSdkHost["connection"]["request"]>()
        .mockRejectedValueOnce(
          Object.assign(new Error("Missing session"), { kind: "sessionNotFound" }),
        )
        .mockRejectedValueOnce(new Error("Host unavailable"));
      const native = makeMuseNativeSessions({ binaryPath: "muse" }, () =>
        Effect.succeed({
          connection: { request },
          close: async () => {},
        } as unknown as MuseSdkHost),
      );
      expect(
        yield* native.read!({ nativeId: "one", cwd: "/project" }).pipe(Effect.flip),
      ).toMatchObject({ notFound: true });
      expect(
        (yield* native.read!({ nativeId: "one", cwd: "/project" }).pipe(Effect.flip)).notFound,
      ).toBeUndefined();
    }),
  );

  it.effect(
    "reads the persistent catalog and snapshot without creating or resuming a session",
    () =>
      Effect.gen(function* () {
        const request = vi
          .fn<MuseSdkHost["connection"]["request"]>()
          .mockResolvedValueOnce({ sessions: [session], nextCursor: "next" })
          .mockResolvedValueOnce({
            sessions: [{ ...session, sessionId: "muse-two" }],
            nextCursor: null,
          })
          .mockResolvedValueOnce({
            session,
            history: {
              items: null,
              snapshot: {
                state: {
                  items: [
                    item,
                    { ...item, itemId: "removed", retracted: true },
                    { ...item, itemId: "assistant-one", kind: "agentMessage", text: "Answer" },
                  ],
                },
              },
            },
          });
        const close = vi.fn(async () => {});
        const createHost = vi.fn(() =>
          Effect.succeed({ connection: { request }, close } as unknown as MuseSdkHost),
        );
        const sessions = makeMuseNativeSessions({ binaryPath: "muse" }, createHost);
        yield* sessions.withConnection!((connected) =>
          Effect.gen(function* () {
            const catalog = yield* connected.list({});
            expect(catalog.complete).toBe(true);
            expect(catalog.sessions.map((row) => row.nativeId)).toEqual(["muse-one", "muse-two"]);
            const messages = yield* connected.read!({ nativeId: "muse-one", cwd: "/project" });
            expect(
              messages.map((message) => [message.id, message.turnId, message.role, message.text]),
            ).toEqual([
              ["message-one", "turn-one", "user", "Question"],
              ["assistant-one", "turn-one", "assistant", "Answer"],
            ]);
          }),
        );
        expect(request.mock.calls.map(([method]) => method)).toEqual([
          "session/list",
          "session/list",
          "session/read",
        ]);
        expect(createHost).toHaveBeenCalledOnce();
        expect(close).toHaveBeenCalledOnce();
        expect(sessions).not.toHaveProperty("delete");
        expect(sessions).not.toHaveProperty("setArchived");
      }),
  );

  it.effect("fails incomplete catalog reads and releases the native host", () =>
    Effect.gen(function* () {
      const request = vi
        .fn<MuseSdkHost["connection"]["request"]>()
        .mockResolvedValueOnce({ sessions: [session], nextCursor: "next" })
        .mockRejectedValueOnce(new Error("unavailable"));
      const close = vi.fn(async () => {});
      const sessions = makeMuseNativeSessions({ binaryPath: "muse" }, () =>
        Effect.succeed({ connection: { request }, close } as unknown as MuseSdkHost),
      );
      expect((yield* sessions.list({}).pipe(Effect.exit))._tag).toBe("Failure");
      expect(close).toHaveBeenCalledOnce();
    }),
  );
});
