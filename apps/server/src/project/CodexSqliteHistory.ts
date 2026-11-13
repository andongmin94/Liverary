// @effect-diagnostics nodeBuiltinImport:off -- read Codex's native SQLite catalogs without opening them for writes.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";

function readDatabase<A>(filePath: string, read: (db: NodeSqlite.DatabaseSync) => A) {
  try {
    using db = new NodeSqlite.DatabaseSync(filePath, { readOnly: true });
    return read(db);
  } catch {
    return null;
  }
}

// Codex stores canonicalized Windows paths, including the extended UNC prefix for network shares.
function normalizeCodexHistoryPath(value: string): string {
  return value.replace(/^\\\\\?\\UNC\\/i, "\\\\").replace(/^\\\\\?\\(?=[a-z]:\\)/i, "");
}

export function readCodexSessionRevisions(
  homePath: string,
  threads: ReadonlyArray<{
    readonly id: string;
    readonly historyMode?: "legacy" | "paginated";
    readonly path?: string | null;
  }>,
) {
  const revisions = new Map<string, string>();
  const paginated = threads.filter((thread) => thread.historyMode === "paginated");
  if (paginated.length > 0) {
    readDatabase(NodePath.join(homePath, "thread_history_1.sqlite"), (db) => {
      db.exec("BEGIN");
      const latest = db.prepare(`
        SELECT rollout_ordinal, created_at_ms, length(item_json) AS bytes FROM thread_items
        WHERE thread_id = ? AND item_type IN ('userMessage', 'agentMessage')
        ORDER BY rollout_ordinal DESC LIMIT 1
      `);
      for (const thread of paginated) {
        const row = latest.get(thread.id);
        if (row)
          revisions.set(thread.id, `${row.rollout_ordinal}:${row.created_at_ms}:${row.bytes}`);
      }
    });
  }
  for (const thread of threads) {
    if (thread.historyMode === "paginated" || !thread.path) continue;
    try {
      const file = NodeFS.statSync(normalizeCodexHistoryPath(thread.path));
      revisions.set(thread.id, `${file.size}:${file.mtimeMs}`);
    } catch {
      continue;
    }
  }
  return revisions;
}
