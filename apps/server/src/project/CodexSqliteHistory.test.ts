// @effect-diagnostics nodeBuiltinImport:off -- SQLite fixtures use temporary host paths.
import * as NodeSqlite from "node:sqlite";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { readCodexSessionRevisions } from "./CodexSqliteHistory.ts";

it.effect(
  "reads batch revisions from native history and rollout files without creating a database",
  () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const home = yield* fs.makeTempDirectoryScoped();
      const historyPath = path.join(home, "thread_history_1.sqlite");
      expect(readCodexSessionRevisions(home, [{ id: "main", historyMode: "paginated" }]).size).toBe(
        0,
      );
      expect(yield* fs.exists(historyPath)).toBe(false);

      using history = new NodeSqlite.DatabaseSync(historyPath);
      history.exec(`CREATE TABLE thread_items (
      thread_id TEXT, rollout_ordinal INTEGER, item_type TEXT, created_at_ms INTEGER, item_json TEXT,
      PRIMARY KEY (thread_id, rollout_ordinal))`);
      const insert = history.prepare("INSERT INTO thread_items VALUES (?, ?, ?, ?, ?)");
      const user = { type: "userMessage", content: [{ type: "text", text: "first" }] };
      const reply = { type: "agentMessage", text: "final reply" };
      insert.run("main", 0, user.type, 1767225600000, JSON.stringify(user));
      insert.run("main", 1, reply.type, 1767225600001, JSON.stringify(reply));
      insert.run("main", 2, "reasoning", 1767225600002, "{}");
      insert.run("archived", 0, user.type, 1767225600000, JSON.stringify(user));
      const revisions = readCodexSessionRevisions(home, [
        { id: "main", historyMode: "paginated" },
        { id: "archived", historyMode: "paginated" },
        { id: "missing", historyMode: "paginated" },
      ]);
      expect(revisions.get("main")).toBe(`1:1767225600001:${JSON.stringify(reply).length}`);
      expect(revisions.get("archived")).toBe(`0:1767225600000:${JSON.stringify(user).length}`);
      expect(revisions.has("missing")).toBe(false);

      const rollout = path.join(home, "legacy.jsonl");
      yield* fs.writeFileString(rollout, "first message");
      const original = readCodexSessionRevisions(home, [{ id: "legacy", path: rollout }]);
      yield* fs.writeFileString(rollout, "first message\nsecond message");
      const changed = readCodexSessionRevisions(home, [{ id: "legacy", path: rollout }]);
      expect(original.get("legacy")).toBeDefined();
      expect(changed.get("legacy")).not.toBe(original.get("legacy"));
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
);
