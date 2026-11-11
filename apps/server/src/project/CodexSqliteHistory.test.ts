import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import { ProviderInstanceId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";

import { readCodexHistoryThread, readCodexThreadCatalog } from "./CodexSqliteHistory.ts";
import { writeCodexCatalog } from "./CodexSqliteHistory.testkit.ts";

it.effect("reads visible Codex turns in order from SQLite without a rollout", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const home = yield* fs.makeTempDirectoryScoped();
    const user = { type: "userMessage", content: [{ type: "text", text: "first" }] };
    writeCodexCatalog(home, [
      {
        id: "main",
        cwd: home,
        name: "Renamed thread",
        title: "Original prompt",
        model: "model",
        threadSource: null,
        items: [
          user,
          { type: "reasoning", text: "private reasoning" },
          { type: "agentMessage", text: "older reply" },
          {
            type: "userMessage",
            content: [
              { type: "text", text: "next" },
              { type: "image" },
              { type: "text", text: "question" },
            ],
          },
          { type: "agentMessage", text: "final reply" },
        ],
      },
      { id: "archived", cwd: home, archived: true, items: [user] },
      {
        id: "child",
        cwd: home,
        threadSource: null,
        source: '{"subagent":{"thread_spawn":{}}}',
        items: [user],
      },
    ]);
    const catalog = readCodexThreadCatalog(home);
    expect(catalog?.threads.map((row) => row.id)).toEqual(["main"]);
    expect(
      readCodexThreadCatalog(home, { interactiveOnly: true })?.threads.map((row) => row.id),
    ).toEqual(["main"]);
    expect(catalog?.indexedIds).toEqual(new Set(["main", "archived", "child"]));
    const thread = readCodexHistoryThread(
      home,
      catalog!.threads[0]!,
      ProviderInstanceId.make("codex"),
      3,
      32 * 1024,
    );
    expect(thread).toMatchObject({
      providerSessionId: "main",
      model: "model",
      title: "Renamed thread",
      omittedMessageCount: 1,
      messages: [
        { role: "user", text: "first", createdAt: "2026-01-01T00:00:00.000Z" },
        { role: "user", text: "next\nquestion", createdAt: "2026-01-01T00:00:00.003Z" },
        { role: "assistant", text: "final reply", createdAt: "2026-01-01T00:00:00.004Z" },
      ],
    });
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);
