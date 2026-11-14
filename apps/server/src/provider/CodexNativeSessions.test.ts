import { assert, it } from "@effect/vitest";
import * as CodexClient from "effect-codex-app-server/client";
import * as CodexReplay from "effect-codex-app-server/replay";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { makeCodexNativeSessions } from "./CodexNativeSessions.ts";

const createdAt = 1_800_000_000;
const updatedAt = createdAt + 10;
const cwd = "/workspace/project";

function thread(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    sessionId: id,
    cliVersion: "0.156.1",
    createdAt,
    updatedAt,
    cwd,
    ephemeral: false,
    modelProvider: "openai",
    model: "test-model",
    preview: "First prompt",
    name: `Title ${id}`,
    projectId: null,
    source: "appServer",
    status: { type: "notLoaded" },
    turns: [],
    ...extra,
  };
}

function exchange(
  id: number,
  method: string,
  params: unknown,
  response: { readonly result: unknown } | { readonly error: { code: number; message: string } },
): ReadonlyArray<CodexReplay.CodexAppServerReplayEntry> {
  return [
    { type: "expect_outbound", frame: { id, method, params } },
    { type: "emit_inbound", frame: { id, ...response } },
  ];
}

function sessions(
  entries: ReadonlyArray<CodexReplay.CodexAppServerReplayEntry>,
  lifetime?: Array<"opened" | "closed">,
) {
  return makeCodexNativeSessions({
    homePath: "/native/codex",
    openClient: () =>
      Effect.gen(function* () {
        lifetime?.push("opened");
        yield* Effect.addFinalizer(() => Effect.sync(() => lifetime?.push("closed")));
        const context = yield* Layer.build(
          CodexReplay.layerReplay({
            provider: "codex",
            protocol: "codex.app-server",
            version: "1",
            scenario: "native-session-sharing",
            entries,
          }),
        );
        return yield* Effect.service(CodexClient.CodexAppServerClient).pipe(
          Effect.provide(context),
        );
      }),
  });
}

it.effect(
  "reads interactive state-backed pages without importing internal or ephemeral threads",
  () =>
    Effect.gen(function* () {
      const native = sessions([
        ...exchange(
          1,
          "thread/list",
          { archived: false, cwd, modelProviders: [], useStateDbOnly: true },
          {
            result: {
              data: [
                thread("a", { source: "vscode", historyMode: "paginated", path: null }),
                thread("child", { parentThreadId: "a" }),
              ],
              nextCursor: "active-next",
            },
          },
        ),
        ...exchange(
          2,
          "thread/list",
          {
            archived: false,
            cwd,
            modelProviders: [],
            useStateDbOnly: true,
            cursor: "active-next",
          },
          {
            result: {
              data: [thread("b", { name: null }), thread("temporary", { ephemeral: true })],
              nextCursor: null,
            },
          },
        ),
        ...exchange(
          3,
          "thread/list",
          { archived: true, cwd, modelProviders: [], useStateDbOnly: true },
          {
            result: { data: [thread("c")], nextCursor: "archive-next" },
          },
        ),
        ...exchange(
          4,
          "thread/list",
          {
            archived: true,
            cwd,
            modelProviders: [],
            useStateDbOnly: true,
            cursor: "archive-next",
          },
          {
            result: {
              data: [thread("d"), thread("internal", { source: { subAgent: "review" } })],
              nextCursor: null,
            },
          },
        ),
        ...exchange(
          5,
          "thread/list",
          { archived: false, cwd, modelProviders: [], useStateDbOnly: true, sourceKinds: ["exec"] },
          {
            result: {
              data: [thread("headless-a", { source: "exec" })],
              nextCursor: "exec-next",
            },
          },
        ),
        ...exchange(
          6,
          "thread/list",
          {
            archived: false,
            cwd,
            modelProviders: [],
            useStateDbOnly: true,
            sourceKinds: ["exec"],
            cursor: "exec-next",
          },
          {
            result: {
              data: [thread("headless-b", { source: "exec" })],
              nextCursor: null,
            },
          },
        ),
        ...exchange(
          7,
          "thread/list",
          { archived: true, cwd, modelProviders: [], useStateDbOnly: true, sourceKinds: ["exec"] },
          {
            result: {
              data: [thread("headless-archived", { source: "exec" })],
              nextCursor: null,
            },
          },
        ),
      ]);
      const result = yield* native.list({ cwd });
      assert.isTrue(result.complete);
      assert.deepStrictEqual(
        result.sessions.map(({ nativeId, state }) => [nativeId, state]),
        [
          ["a", "active"],
          ["b", "active"],
          ["c", "archived"],
          ["d", "archived"],
        ],
      );
      assert.deepStrictEqual(result.excludedNativeIds, [
        "headless-a",
        "headless-b",
        "headless-archived",
      ]);
      assert.deepStrictEqual(result.sessions[1], {
        nativeId: "b",
        cwd,
        title: "First prompt",
        model: "test-model",
        createdAt: DateTime.formatIso(DateTime.makeUnsafe(createdAt * 1000)),
        updatedAt: DateTime.formatIso(DateTime.makeUnsafe(updatedAt * 1000)),
        state: "active",
      });
    }),
);

it.effect("fails an incomplete catalog instead of reporting missing sessions as deleted", () =>
  Effect.gen(function* () {
    const native = sessions([
      ...exchange(
        1,
        "thread/list",
        { archived: false, modelProviders: [], useStateDbOnly: true },
        {
          result: { data: [thread("kept")], nextCursor: null },
        },
      ),
      ...exchange(
        2,
        "thread/list",
        { archived: true, modelProviders: [], useStateDbOnly: true },
        {
          result: { data: [], nextCursor: "archive-next" },
        },
      ),
      ...exchange(
        3,
        "thread/list",
        {
          archived: true,
          modelProviders: [],
          useStateDbOnly: true,
          cursor: "archive-next",
        },
        { error: { code: -32603, message: "Could not read archive database" } },
      ),
    ]);
    const error = yield* native.list({}).pipe(Effect.flip);
    assert.strictEqual(error._tag, "NativeSessionError");
    assert.strictEqual(error.operation, "list");
    assert.isNotTrue(error.notFound);
    assert.include(error.detail, "Could not read archive database");
  }),
);

it.effect("reads paginated history with native item identities and recorded timestamps", () =>
  Effect.gen(function* () {
    const native = sessions([
      ...exchange(
        1,
        "thread/read",
        { threadId: "a", includeTurns: false },
        {
          result: { thread: thread("a", { historyMode: "paginated", path: null }) },
        },
      ),
      ...exchange(
        2,
        "thread/items/list",
        { threadId: "a", sortDirection: "asc" },
        {
          result: {
            data: [
              {
                turnId: "turn-1",
                startedAtMs: createdAt * 1000 + 25,
                item: {
                  type: "userMessage",
                  id: "user-1",
                  content: [
                    { type: "text", text: "First" },
                    { type: "text", text: "request" },
                  ],
                },
              },
            ],
            nextCursor: "items-next",
          },
        },
      ),
      ...exchange(
        3,
        "thread/items/list",
        {
          threadId: "a",
          sortDirection: "asc",
          cursor: "items-next",
        },
        {
          result: {
            data: [
              {
                turnId: "turn-1",
                completedAtMs: updatedAt * 1000,
                item: { type: "agentMessage", id: "answer-1", text: "Answer from the native app" },
              },
              {
                turnId: "turn-1",
                item: { type: "reasoning", id: "reasoning-1", summary: ["Internal reasoning"] },
              },
            ],
            nextCursor: null,
          },
        },
      ),
    ]);
    assert.deepStrictEqual(yield* native.read({ nativeId: "a", cwd }), [
      {
        id: "user-1",
        turnId: "turn-1",
        role: "user",
        text: "First\nrequest",
        createdAt: DateTime.formatIso(DateTime.makeUnsafe(createdAt * 1000 + 25)),
      },
      {
        id: "answer-1",
        turnId: "turn-1",
        role: "assistant",
        text: "Answer from the native app",
        createdAt: DateTime.formatIso(DateTime.makeUnsafe(updatedAt * 1000)),
      },
    ]);
  }),
);

it.effect("reads a native legacy history using its stored turn and item identities", () =>
  Effect.gen(function* () {
    const native = sessions([
      ...exchange(
        1,
        "thread/read",
        { threadId: "legacy", includeTurns: false },
        {
          result: { thread: thread("legacy", { historyMode: "legacy" }) },
        },
      ),
      ...exchange(
        2,
        "thread/read",
        { threadId: "legacy", includeTurns: true },
        {
          result: {
            thread: thread("legacy", {
              historyMode: "legacy",
              turns: [
                {
                  id: "native-turn",
                  startedAt: createdAt,
                  status: "completed",
                  items: [{ type: "agentMessage", id: "native-answer", text: "Stored answer" }],
                },
              ],
            }),
          },
        },
      ),
    ]);
    assert.deepStrictEqual(yield* native.read({ nativeId: "legacy", cwd }), [
      {
        id: "native-answer",
        turnId: "native-turn",
        role: "assistant",
        text: "Stored answer",
        createdAt: DateTime.formatIso(DateTime.makeUnsafe(createdAt * 1000)),
      },
    ]);
  }),
);

it.effect.each([
  { code: -32600, message: "thread not found: missing", notFound: true },
  { code: -32600, message: "no rollout found for thread id missing", notFound: true },
  { code: -32600, message: "thread not loaded: missing", notFound: true },
  { code: -32600, message: "thread not found: another-thread", notFound: false },
  { code: -32603, message: "thread not found: missing", notFound: false },
  { code: -32600, message: "Permission denied", notFound: false },
  {
    code: -32600,
    message:
      "thread missing is not materialized yet; includeTurns is unavailable before first user message",
    notFound: false,
  },
])(
  "marks only a confirmed native not-found error ($code, $message)",
  ({ code, message, notFound }) =>
    Effect.gen(function* () {
      const native = sessions(
        exchange(
          1,
          "thread/read",
          {
            threadId: "missing",
            includeTurns: false,
          },
          { error: { code, message } },
        ),
      );
      const error = yield* native.read({ nativeId: "missing", cwd }).pipe(Effect.flip);
      assert.strictEqual(error.notFound === true, notFound);
    }),
);

it.effect.each([
  { code: -32600, message: "thread not found: deleted", succeeds: true },
  { code: -32600, message: "no rollout found for thread id deleted", succeeds: true },
  { code: -32600, message: "thread not found: another-thread", succeeds: false },
  { code: -32600, message: "thread not loaded: deleted", succeeds: false },
  { code: -32601, message: "Method not found: thread/delete", succeeds: false },
  { code: -32600, message: "Permission denied", succeeds: false },
])(
  "keeps deletion idempotent only for a confirmed missing thread ($message)",
  ({ code, message, succeeds }) =>
    Effect.gen(function* () {
      const native = sessions(
        exchange(
          1,
          "thread/delete",
          { threadId: "deleted" },
          {
            error: { code, message },
          },
        ),
      );
      const outcome = yield* native.delete({ nativeId: "deleted", cwd }).pipe(Effect.result);
      assert.strictEqual(outcome._tag, succeeds ? "Success" : "Failure");
    }),
);

it.effect("shares one management connection until the catalog and histories finish", () =>
  Effect.gen(function* () {
    const lifetime: Array<"opened" | "closed"> = [];
    const native = sessions(
      [
        ...exchange(
          1,
          "thread/list",
          { archived: false, modelProviders: [], useStateDbOnly: true },
          {
            result: { data: [thread("shared")], nextCursor: null },
          },
        ),
        ...exchange(
          2,
          "thread/list",
          { archived: true, modelProviders: [], useStateDbOnly: true },
          {
            result: { data: [], nextCursor: null },
          },
        ),
        ...exchange(
          3,
          "thread/list",
          { archived: false, modelProviders: [], useStateDbOnly: true, sourceKinds: ["exec"] },
          {
            result: { data: [], nextCursor: null },
          },
        ),
        ...exchange(
          4,
          "thread/list",
          { archived: true, modelProviders: [], useStateDbOnly: true, sourceKinds: ["exec"] },
          {
            result: { data: [], nextCursor: null },
          },
        ),
        ...exchange(
          5,
          "thread/read",
          { threadId: "shared", includeTurns: false },
          {
            result: { thread: thread("shared", { historyMode: "paginated" }) },
          },
        ),
        ...exchange(
          6,
          "thread/items/list",
          { threadId: "shared", sortDirection: "asc" },
          {
            result: { data: [], nextCursor: null },
          },
        ),
      ],
      lifetime,
    );
    yield* native.withConnection((connected) =>
      Effect.gen(function* () {
        const listed = yield* connected.list({});
        assert.isTrue(listed.complete);
        assert.strictEqual(listed.sessions.length, 1);
        yield* connected.read!({ nativeId: "shared", cwd });
        assert.deepStrictEqual(lifetime, ["opened"]);
      }),
    );
    assert.deepStrictEqual(lifetime, ["opened", "closed"]);
  }),
);

it.effect.each([true, false])("surfaces archive-operation failures (archived: %s)", (archived) =>
  Effect.gen(function* () {
    const method = archived ? "thread/archive" : "thread/unarchive";
    const native = sessions(
      exchange(
        1,
        method,
        { threadId: "busy" },
        {
          error: { code: -32600, message: "Thread has an active writer" },
        },
      ),
    );
    const error = yield* native.setArchived({ nativeId: "busy", cwd, archived }).pipe(Effect.flip);
    assert.strictEqual(error.operation, archived ? "archive" : "unarchive");
    assert.isNotTrue(error.notFound);
    assert.strictEqual(error.detail, "Thread has an active writer");
  }),
);
