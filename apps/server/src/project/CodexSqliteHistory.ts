// @effect-diagnostics nodeBuiltinImport:off -- read Codex's native SQLite catalogs without opening them for writes.
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";

import type { ProviderInstanceId } from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";

import type { AgentSessionThread, AgentSessionThreadMessage } from "./AgentSessionScanner.ts";

export interface CodexCatalogThread {
  readonly id: string;
  readonly cwd: string;
  readonly rolloutPath: string;
  readonly title: string;
  readonly model: string | null;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

function readDatabase<A>(filePath: string, read: (db: NodeSqlite.DatabaseSync) => A) {
  try {
    using db = new NodeSqlite.DatabaseSync(filePath, { readOnly: true });
    return read(db);
  } catch {
    return null;
  }
}

// Codex stores canonicalized Windows paths, including the extended UNC prefix for network shares.
export function normalizeCodexHistoryPath(value: string): string {
  return value.replace(/^\\\\\?\\UNC\\/i, "\\\\").replace(/^\\\\\?\\(?=[a-z]:\\)/i, "");
}

export function readCodexThreadCatalog(homePath: string) {
  return readDatabase(NodePath.join(homePath, "state_5.sqlite"), (db) => {
    // Both queries must see the same rows when Codex adds or archives a thread during the scan.
    db.exec("BEGIN");
    const indexedIds = new Set<string>();
    const indexedRolloutPaths = new Set<string>();
    for (const row of db.prepare("SELECT id, rollout_path FROM threads").iterate()) {
      if (typeof row.id === "string") indexedIds.add(row.id);
      if (typeof row.rollout_path === "string" && row.rollout_path.length > 0) {
        indexedRolloutPaths.add(normalizeCodexHistoryPath(row.rollout_path));
      }
    }
    const threads: CodexCatalogThread[] = [];
    const visible = db.prepare(`
      SELECT id, cwd, rollout_path, COALESCE(NULLIF(name, ''), title) AS title, model,
             COALESCE(created_at_ms, created_at * 1000) AS created,
             COALESCE(updated_at_ms, updated_at * 1000) AS updated
      FROM threads
      WHERE archived = 0 AND COALESCE(thread_source, 'user') = 'user'
        AND CASE WHEN json_valid(source)
                 THEN json_type(source, '$.subagent') IS NULL AND json_type(source, '$.subAgent') IS NULL
                 ELSE 1 END
    `);
    for (const row of visible.iterate()) {
      if (
        typeof row.id !== "string" ||
        typeof row.cwd !== "string" ||
        typeof row.created !== "number" ||
        typeof row.updated !== "number"
      ) {
        continue;
      }
      threads.push({
        id: row.id,
        cwd: normalizeCodexHistoryPath(row.cwd),
        rolloutPath:
          typeof row.rollout_path === "string" ? normalizeCodexHistoryPath(row.rollout_path) : "",
        title: typeof row.title === "string" ? row.title : "",
        model: typeof row.model === "string" ? row.model : null,
        createdAtMs: row.created,
        updatedAtMs: row.updated,
      });
    }
    return { threads, indexedIds, indexedRolloutPaths };
  });
}

export function readCodexHistoryThread(
  homePath: string,
  entry: CodexCatalogThread,
  providerInstanceId: ProviderInstanceId,
  maxMessages: number,
  maxHistoryBytes: number,
): AgentSessionThread | null {
  return readDatabase(NodePath.join(homePath, "thread_history_1.sqlite"), (db) => {
    const visible = db.prepare(`
      SELECT item_type, created_at_ms,
             CASE item_type
               WHEN 'agentMessage' THEN json_extract(item_json, '$.text')
               WHEN 'userMessage' THEN (
                 SELECT group_concat(json_extract(value, '$.text'), char(10) ORDER BY key)
                 FROM json_each(item_json, '$.content') WHERE json_extract(value, '$.type') = 'text'
               )
             END AS text
      FROM thread_items
      WHERE thread_id = ? AND item_type IN ('userMessage', 'agentMessage')
      ORDER BY rollout_ordinal
    `);
    const messages: AgentSessionThreadMessage[] = [];
    let firstUser: AgentSessionThreadMessage | undefined;
    let count = 0;
    let bytes = 0;
    for (const row of visible.iterate(entry.id)) {
      if (typeof row.text !== "string" || !row.text.trim()) continue;
      bytes += Buffer.byteLength(row.text);
      if (bytes > maxHistoryBytes) return null;
      const message: AgentSessionThreadMessage = {
        role: row.item_type === "userMessage" ? "user" : "assistant",
        text: row.text,
        createdAt: DateTime.formatIso(
          DateTime.makeUnsafe(
            typeof row.created_at_ms === "number" ? row.created_at_ms : entry.createdAtMs,
          ),
        ),
      };
      if (message.role === "user") firstUser ??= message;
      messages.push(message);
      if (messages.length > maxMessages) messages.shift();
      count++;
    }
    if (!firstUser) return null;
    if (!messages.includes(firstUser)) messages.splice(0, 1, firstUser);
    return {
      source: "codex",
      providerInstanceId,
      providerSessionId: entry.id,
      title: entry.title || firstUser.text.split("\n", 1)[0]!.slice(0, 100),
      model: entry.model,
      createdAt: DateTime.formatIso(DateTime.makeUnsafe(entry.createdAtMs)),
      updatedAt: DateTime.formatIso(DateTime.makeUnsafe(entry.updatedAtMs)),
      messages,
      omittedMessageCount: count - messages.length,
    };
  });
}
