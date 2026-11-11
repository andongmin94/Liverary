// @effect-diagnostics nodeBuiltinImport:off - The native SQLite fixtures use host filesystem paths.
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";

interface CatalogFixtureThread {
  readonly id: string;
  readonly cwd: string;
  readonly rolloutPath?: string;
  readonly name?: string;
  readonly title?: string;
  readonly model?: string;
  readonly createdAtMs?: number;
  readonly updatedAtMs?: number;
  readonly archived?: boolean;
  readonly source?: string;
  readonly threadSource?: string | null;
  readonly items?: ReadonlyArray<{
    readonly type: string;
    readonly text?: string;
    readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
  }>;
}

export function writeCodexCatalog(homePath: string, threads: ReadonlyArray<CatalogFixtureThread>) {
  using catalog = new NodeSqlite.DatabaseSync(NodePath.join(homePath, "state_5.sqlite"));
  using history = new NodeSqlite.DatabaseSync(NodePath.join(homePath, "thread_history_1.sqlite"));
  catalog.exec(`CREATE TABLE threads (
    id TEXT PRIMARY KEY, cwd TEXT, rollout_path TEXT, name TEXT, title TEXT, model TEXT,
    created_at_ms INTEGER, updated_at_ms INTEGER, created_at INTEGER, updated_at INTEGER,
    archived INTEGER, source TEXT, thread_source TEXT)`);
  history.exec(`CREATE TABLE thread_items (
    thread_id TEXT, rollout_ordinal INTEGER, item_type TEXT, created_at_ms INTEGER, item_json TEXT,
    PRIMARY KEY (thread_id, rollout_ordinal))`);
  const insertThread = catalog.prepare(
    "INSERT INTO threads VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertItem = history.prepare("INSERT INTO thread_items VALUES (?, ?, ?, ?, ?)");
  for (const thread of threads) {
    const createdAt = thread.createdAtMs ?? Date.parse("2026-01-01T00:00:00Z");
    const updatedAt = thread.updatedAtMs ?? createdAt;
    insertThread.run(
      thread.id,
      thread.cwd,
      thread.rolloutPath ?? NodePath.join(homePath, "sessions", `${thread.id}.jsonl`),
      thread.name ?? null,
      thread.title ?? thread.id,
      thread.model ?? null,
      createdAt,
      updatedAt,
      Math.floor(createdAt / 1000),
      Math.floor(updatedAt / 1000),
      Number(thread.archived ?? false),
      thread.source ?? "vscode",
      thread.threadSource === undefined ? "user" : thread.threadSource,
    );
    for (const [ordinal, item] of (thread.items ?? []).entries()) {
      insertItem.run(thread.id, ordinal, item.type, createdAt + ordinal, JSON.stringify(item));
    }
  }
}
