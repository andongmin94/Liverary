import type { Agent, AgentMessage, SDKAgentInfo } from "@cursor/sdk";
import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe, expect, vi } from "vite-plus/test";
import { makeCursorNativeSessions } from "./nativeSessions.ts";

const info = (agentId: string, archived = false): SDKAgentInfo => ({
  agentId,
  name: agentId,
  summary: "",
  runtime: "local",
  cwd: "/project",
  createdAt: 1000,
  lastModified: 2000,
  archived,
});

describe("Cursor native sessions", () => {
  it.effect("confirms native absence separately from an SDK outage", () =>
    Effect.gen(function* () {
      const get = vi
        .fn<typeof Agent.get>()
        .mockRejectedValueOnce(
          Object.assign(new Error("Missing agent"), { code: "agent_not_found" }),
        )
        .mockRejectedValueOnce(new Error("SDK unavailable"));
      const native = makeCursorNativeSessions(() => ({
        get,
        list: vi.fn(),
        messages: { list: vi.fn() },
        archive: vi.fn(),
        unarchive: vi.fn(),
        delete: vi.fn(),
      }));
      expect(
        yield* native.read!({ nativeId: "one", cwd: "/project" }).pipe(Effect.flip),
      ).toMatchObject({ notFound: true });
      expect(
        (yield* native.read!({ nativeId: "one", cwd: "/project" }).pipe(Effect.flip)).notFound,
      ).toBeUndefined();
    }),
  );

  it.effect("keeps archived sessions through pagination and stable message IDs across reads", () =>
    Effect.gen(function* () {
      const list = vi
        .fn<typeof Agent.list>()
        .mockResolvedValueOnce({ items: [info("one")], nextCursor: "page-2" })
        .mockResolvedValueOnce({ items: [info("two", true)] });
      const transcript: AgentMessage[] = [
        {
          type: "user",
          uuid: "user-1",
          agent_id: "one",
          message: { userMessage: { text: "Question" } },
        },
        {
          type: "assistant",
          uuid: "assistant-1",
          agent_id: "one",
          message: { content: [{ type: "text", text: "Answer" }] },
        },
      ];
      const messages = vi
        .fn<typeof Agent.messages.list>()
        .mockImplementation(async (_id, options) => (options?.offset === 0 ? transcript : []));
      const remove = vi.fn<typeof Agent.delete>().mockResolvedValue(undefined);
      const archive = vi.fn<typeof Agent.archive>().mockResolvedValue(undefined);
      const unarchive = vi.fn<typeof Agent.unarchive>().mockResolvedValue(undefined);
      const sessions = makeCursorNativeSessions(() => ({
        list,
        get: async () => info("one"),
        messages: { list: messages },
        archive,
        unarchive,
        delete: remove,
      }));
      const found = yield* sessions.list({ cwd: "/project" });
      expect(found.complete).toBe(true);
      expect(found.sessions.map((session) => [session.nativeId, session.state])).toEqual([
        ["one", "active"],
        ["two", "archived"],
      ]);
      expect(list.mock.calls[1]?.[0]?.cursor).toBe("page-2");
      const first = yield* sessions.read!({ nativeId: "one", cwd: "/project" });
      expect(yield* sessions.read!({ nativeId: "one", cwd: "/project" })).toEqual(first);
      expect(first.map((message) => [message.id, message.text])).toEqual([
        ["user-1", "Question"],
        ["assistant-1", "Answer"],
      ]);
      yield* sessions.setArchived!({ nativeId: "one", cwd: "/project", archived: true });
      yield* sessions.setArchived!({ nativeId: "one", cwd: "/project", archived: false });
      yield* sessions.delete!({ nativeId: "one", cwd: "/project" });
      expect(archive).toHaveBeenCalledWith("one", { cwd: "/project" });
      expect(unarchive).toHaveBeenCalledWith("one", { cwd: "/project" });
      expect(remove).toHaveBeenCalledWith("one", { cwd: "/project" });
    }),
  );

  it.effect("rejects a failed catalog page and never routes local deletion to a cloud ID", () =>
    Effect.gen(function* () {
      const list = vi
        .fn<typeof Agent.list>()
        .mockResolvedValueOnce({ items: [info("one")], nextCursor: "page-2" })
        .mockRejectedValueOnce(new Error("read failed"));
      const remove = vi.fn<typeof Agent.delete>();
      const sessions = makeCursorNativeSessions(() => ({
        list,
        get: vi.fn(),
        messages: { list: vi.fn() },
        archive: vi.fn(),
        unarchive: vi.fn(),
        delete: remove,
      }));
      expect((yield* sessions.list({ cwd: "/project" }).pipe(Effect.exit))._tag).toBe("Failure");
      expect(
        (yield* sessions.delete!({ nativeId: "bc-cloud", cwd: "/project" }).pipe(Effect.exit))._tag,
      ).toBe("Failure");
      expect(remove).not.toHaveBeenCalled();
    }),
  );
});
