// @effect-diagnostics nodeBuiltinImport:off -- read Codex's native SQLite catalogs without opening them for writes.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";

import type { ProviderInstanceId } from "@t3tools/contracts";
import { normalizeProjectPathForComparison } from "@t3tools/shared/path";
import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";

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

const TextMap = Schema.Record(Schema.String, Schema.String);
const hasSidebarSections = Schema.is(
  Schema.Struct({
    "sidebar-custom-sections-v3": Schema.Record(
      Schema.String,
      Schema.Struct({
        sections: Schema.Array(Schema.Struct({ itemKeys: Schema.Array(Schema.String) })),
      }),
    ),
  }),
);
const decodeSidebar = Schema.decodeUnknownSync(
  Schema.Struct({
    "local-projects": Schema.Record(
      Schema.String,
      Schema.Struct({ rootPaths: Schema.Array(Schema.String) }),
    ),
    "thread-project-assignments": Schema.Record(
      Schema.String,
      Schema.Struct({
        projectKind: Schema.String,
        projectId: Schema.String,
      }),
    ),
    "projectless-thread-ids": Schema.optional(Schema.Array(Schema.String)),
    "pinned-thread-ids": Schema.optional(Schema.Array(Schema.String)),
    "app-server-project-id-by-legacy-project-id-by-host": Schema.optional(
      Schema.Record(Schema.String, TextMap),
    ),
  }),
);
const projectKey = (value: string) =>
  normalizeProjectPathForComparison(normalizeCodexHistoryPath(value)).replaceAll("\\", "/");

function desktopThreadVisibility(homePath: string, db: NodeSqlite.DatabaseSync) {
  let values: Record<string, unknown>;
  let sidebar: ReturnType<typeof decodeSidebar>;
  try {
    values = JSON.parse(
      NodeFS.readFileSync(NodePath.join(homePath, ".codex-global-state.json"), "utf8"),
    );
    sidebar = decodeSidebar(values);
  } catch {
    return null;
  }
  const projects = sidebar["local-projects"];
  const projectIds = new Set(Object.keys(projects));
  const roots = new Set(Object.values(projects).flatMap((p) => p.rootPaths.map(projectKey)));
  const hasProjectTables =
    db
      .prepare(
        "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('projects', 'project_roots')",
      )
      .get()?.n === 2;
  if (hasProjectTables) {
    for (const row of db
      .prepare(
        "SELECT p.id, r.path FROM projects p LEFT JOIN project_roots r ON r.project_id = p.id",
      )
      .iterate()) {
      if (typeof row.id === "string") projectIds.add(row.id);
      if (typeof row.path === "string") roots.add(projectKey(row.path));
    }
  }
  const remapped =
    sidebar["app-server-project-id-by-legacy-project-id-by-host"]?.[`local:${homePath}`];
  for (const [legacy, current] of Object.entries(remapped ?? {})) {
    if (projectIds.has(current)) projectIds.add(legacy);
  }
  const standalone = new Set([
    ...(sidebar["projectless-thread-ids"] ?? []),
    ...(sidebar["pinned-thread-ids"] ?? []),
  ]);
  for (const [key, atoms] of Object.entries(values)) {
    if (!key.startsWith("electron-owner-atoms:") || !hasSidebarSections(atoms)) continue;
    const keys = Object.values(atoms["sidebar-custom-sections-v3"]).flatMap(({ sections }) =>
      sections.flatMap(({ itemKeys }) => itemKeys),
    );
    for (const item of keys) {
      if (item.startsWith("codex:thread:local:"))
        standalone.add(item.slice("codex:thread:local:".length));
    }
  }
  const rootHints = Object.entries(values)
    .filter(
      ([key]) =>
        key === "thread-workspace-root-hints" ||
        key.startsWith("electron-owner-value:thread-workspace-root-hints:"),
    )
    .map(([, hints]) => hints)
    .filter(Schema.is(TextMap));
  const inProject = (value: string) => {
    const cwd = projectKey(value);
    return Array.from(roots).some(
      (root) => cwd === root || cwd.startsWith(`${root.replace(/\/$/, "")}/`),
    );
  };
  // Desktop infers projectless chats from its dated scratch directory even before membership is saved.
  const scratch =
    /(?:^|[\\/])Documents[\\/]+Codex[\\/]+\d{4}-\d{2}-\d{2}(?:-|[\\/]+)[a-z0-9][a-z0-9-]*[\\/]*$/;
  return (row: Record<string, NodeSqlite.SQLOutputValue>, id: string, cwd: string) => {
    const assignment = sidebar["thread-project-assignments"][id];
    return (
      assignment?.projectKind !== "local" ||
      projectIds.has(assignment.projectId) ||
      (typeof row.project_id === "string" && projectIds.has(row.project_id)) ||
      standalone.has(id) ||
      row.is_pinned === 1 ||
      typeof row.thread_section_id === "string" ||
      scratch.test(cwd) ||
      inProject(cwd) ||
      rootHints.some((hints) => hints[id] && inProject(hints[id]))
    );
  };
}

export function readCodexThreadCatalog(
  homePath: string,
  { interactiveOnly = false, requireDesktopVisibility = false } = {},
) {
  return readDatabase(NodePath.join(homePath, "state_5.sqlite"), (db) => {
    // Both queries must see the same rows when Codex adds or archives a thread during the scan.
    db.exec("BEGIN");
    const indexedIds = new Set<string>();
    const hiddenIds = new Set<string>();
    const indexedRolloutPaths = new Set<string>();
    for (const row of db.prepare("SELECT id, rollout_path, archived FROM threads").iterate()) {
      if (typeof row.id === "string") {
        indexedIds.add(row.id);
        if (row.archived === 1) hiddenIds.add(row.id);
      }
      if (typeof row.rollout_path === "string" && row.rollout_path.length > 0) {
        indexedRolloutPaths.add(normalizeCodexHistoryPath(row.rollout_path));
      }
    }
    const threads: CodexCatalogThread[] = [];
    const isVisible = interactiveOnly ? desktopThreadVisibility(homePath, db) : null;
    if (requireDesktopVisibility && isVisible === null) return null;
    const placementColumns =
      isVisible === null
        ? ""
        : db
            .prepare(
              "SELECT name FROM pragma_table_info('threads') WHERE name IN ('is_pinned', 'thread_section_id', 'project_id')",
            )
            .all()
            .map((col) => `, ${col.name}`)
            .join("");
    const visible = db.prepare(`
      SELECT id, cwd, rollout_path, COALESCE(NULLIF(name, ''), title) AS title, model,
             COALESCE(created_at_ms, created_at * 1000) AS created,
             COALESCE(updated_at_ms, updated_at * 1000) AS updated ${placementColumns}
      FROM threads
      WHERE archived = 0 AND COALESCE(thread_source, 'user') = 'user'
        AND (? = 0 OR source IN ('cli', 'vscode'))
        AND CASE WHEN json_valid(source)
                 THEN json_type(source, '$.subagent') IS NULL AND json_type(source, '$.subAgent') IS NULL
                 ELSE 1 END
    `);
    for (const row of visible.iterate(Number(interactiveOnly))) {
      if (
        typeof row.id !== "string" ||
        typeof row.cwd !== "string" ||
        typeof row.created !== "number" ||
        typeof row.updated !== "number"
      ) {
        continue;
      }
      if (isVisible !== null && !isVisible(row, row.id, row.cwd)) {
        hiddenIds.add(row.id);
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
    return { threads, indexedIds, indexedRolloutPaths, hiddenIds };
  });
}

export function readCodexHistoryRevision(historyPath: string, id: string) {
  return readDatabase(historyPath, (db) => {
    const row = db
      .prepare(`
      SELECT rollout_ordinal, created_at_ms, length(item_json) AS bytes FROM thread_items
      WHERE thread_id = ? AND item_type IN ('userMessage', 'agentMessage')
      ORDER BY rollout_ordinal DESC LIMIT 1
    `)
      .get(id);
    return row ? `${row.rollout_ordinal}:${row.created_at_ms}:${row.bytes}` : null;
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
