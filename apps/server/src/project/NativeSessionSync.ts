import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  MessageId,
  ProviderThreadId,
  ThreadId,
  TurnItemId,
  type OrchestrationV2AppThread,
  type OrchestrationV2DomainEvent,
  type OrchestrationV2ProviderThread,
  type ProviderInstanceId,
} from "@t3tools/contracts";
import type { ProviderInstance } from "@t3tools/provider-core/server/driver";
import {
  NativeSessionError,
  type NativeSessionMessage,
  type NativeSessionState,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import { normalizeProjectPathForComparison } from "@t3tools/shared/path";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Semaphore from "effect/Semaphore";
import * as SqlClient from "effect/sql/SqlClient";

import * as EventSink from "../orchestration-v2/EventSink.ts";
import * as EffectOutbox from "../orchestration-v2/EffectOutbox.ts";
import * as Orchestrator from "../orchestration-v2/Orchestrator.ts";
import * as ProjectionStore from "../orchestration-v2/ProjectionStore.ts";
import * as ProviderSessionManager from "../orchestration-v2/ProviderSessionManager.ts";
import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import * as ProviderRegistry from "../provider/ProviderRegistry.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as ProjectService from "./ProjectService.ts";
import {
  nativeLifecycleChange,
  reconcileNativeMessages,
  type NativeMessageAcknowledgement,
} from "./nativeSessionReconciliation.ts";

type Binding = {
  readonly threadId: ThreadId;
  readonly providerThreadId: ProviderThreadId;
  readonly nativeId: string;
  readonly syncedNativeId: string | null;
  readonly catalogId: string | null;
  readonly state: NativeSessionState | null;
  readonly updatedAt: string | null;
  readonly revision: string | null;
  readonly continuationKey: string | null;
  readonly excluded: number;
};

const continuationKeyFor = (instance: ProviderInstance) =>
  `${instance.driverKind}:${instance.continuationIdentity.continuationKey}`;
const stateOf = (thread: OrchestrationV2AppThread): NativeSessionState =>
  thread.deletedAt !== null ? "deleted" : thread.archivedAt !== null ? "archived" : "active";
const messageIdFor = (providerThreadId: ProviderThreadId, nativeId: string) =>
  MessageId.make(`native-session:${providerThreadId}:${nativeId}`);

function messageEvents(
  threadId: ThreadId,
  thread: OrchestrationV2ProviderThread,
  message: NativeSessionMessage,
  ordinal: number,
  updatedAt?: DateTime.Utc,
): ReadonlyArray<OrchestrationV2DomainEvent> {
  const id = messageIdFor(thread.id, message.id);
  const at = DateTime.makeUnsafe(message.createdAt);
  const common = {
    id: TurnItemId.make(id),
    threadId,
    runId: null,
    nodeId: null,
    providerThreadId: thread.id,
    providerTurnId: null,
    nativeItemRef: { driver: thread.driver, nativeId: message.id, strength: "strong" as const },
    parentItemId: null,
    ordinal,
    status: "completed" as const,
    title: null,
    startedAt: at,
    completedAt: at,
    updatedAt: updatedAt ?? at,
  };
  return [
    {
      id: EventId.make(`${id}:message`),
      type: "message.updated",
      threadId,
      driver: thread.driver,
      providerInstanceId: thread.providerInstanceId,
      occurredAt: updatedAt ?? at,
      payload: {
        id,
        threadId,
        runId: null,
        nodeId: null,
        createdBy: message.role === "user" ? "user" : "agent",
        creationSource: "server",
        role: message.role,
        text: message.text,
        attachments: [],
        streaming: false,
        createdAt: at,
        updatedAt: updatedAt ?? at,
      },
    },
    {
      id: EventId.make(`${id}:item`),
      type: "turn-item.updated",
      threadId,
      driver: thread.driver,
      providerInstanceId: thread.providerInstanceId,
      occurredAt: updatedAt ?? at,
      payload:
        message.role === "user"
          ? {
              ...common,
              type: "user_message",
              messageId: id,
              text: message.text,
              attachments: [],
              inputIntent: "turn_start",
              createdBy: "user",
              creationSource: "server",
            }
          : {
              ...common,
              type: "assistant_message",
              messageId: id,
              text: message.text,
              streaming: false,
            },
    },
  ];
}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const registry = yield* ProviderInstanceRegistry.ProviderInstanceRegistry;
  const providers = yield* ProviderRegistry.ProviderRegistry;
  const projects = yield* ProjectService.ProjectService;
  const projection = yield* ProjectionStore.ProjectionStoreV2;
  const orchestrator = yield* Orchestrator.OrchestratorV2;
  const sink = yield* EventSink.EventSinkV2;
  const ids = yield* IdAllocator.IdAllocatorV2;
  const settings = yield* ServerSettings.ServerSettingsService;
  const sessions = yield* ProviderSessionManager.ProviderSessionManagerV2;
  const outbox = yield* EffectOutbox.EffectOutboxV2;
  const path = yield* Path.Path;
  const gate = yield* Semaphore.make(1);

  const bindingsFor = (
    instanceIds: ReadonlyArray<ProviderInstanceId>,
    identity: string,
  ) => sql<Binding>`
    SELECT p.thread_id AS threadId, p.provider_thread_id AS providerThreadId,
      json_extract(p.payload_json, '$.nativeThreadRef.nativeId') AS nativeId,
      s.catalog_id AS catalogId, s.native_id AS syncedNativeId,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.catalog_excluded ELSE 0 END AS excluded,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.continuation_key END AS continuationKey,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.native_state END AS state,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.native_updated_at END AS updatedAt,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.native_revision END AS revision
    FROM orchestration_v2_projection_provider_threads p
    LEFT JOIN native_session_sync s ON s.provider_thread_id = p.provider_thread_id
    WHERE (
      ${sql.in("p.provider_instance_id", instanceIds)}
      OR (s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') AND s.continuation_key = ${identity})
    )
      AND json_extract(p.payload_json, '$.ownerNodeId') IS NULL
      AND json_extract(p.payload_json, '$.nativeThreadRef.nativeId') IS NOT NULL
  `;

  const remember = (
    providerThreadId: ProviderThreadId,
    summary: NativeSessionSummary,
    continuationKey: string,
  ) =>
    sql`
    INSERT INTO native_session_sync (provider_thread_id, catalog_id, native_id, native_state, native_updated_at, native_revision, continuation_key)
    VALUES (${providerThreadId}, ${summary.catalogId ?? null}, ${summary.nativeId}, ${summary.state}, ${summary.updatedAt}, ${summary.revision ?? null}, ${continuationKey})
    ON CONFLICT(provider_thread_id) DO UPDATE SET
      catalog_id = COALESCE(excluded.catalog_id, native_session_sync.catalog_id),
      native_id = excluded.native_id, native_state = excluded.native_state,
      native_updated_at = excluded.native_updated_at, native_revision = excluded.native_revision,
      continuation_key = excluded.continuation_key, catalog_excluded = 0
  `.pipe(Effect.asVoid);

  const unresolvedLifecycle = (threadId: ThreadId) =>
    sql`
    SELECT 1 FROM orchestration_v2_effect_outbox e
    WHERE e.thread_id = ${threadId} AND e.effect_type = 'native-session.lifecycle'
      AND (e.status IN ('pending', 'running') OR (e.status = 'failed' AND e.rowid = (
        SELECT MAX(newer.rowid) FROM orchestration_v2_effect_outbox newer
        WHERE newer.thread_id = e.thread_id AND newer.effect_type = 'native-session.lifecycle'
      ))) LIMIT 1
  `.pipe(Effect.map((rows) => rows.length > 0));

  const hasUnresolvedLifecycle = (
    instanceIds: ReadonlyArray<ProviderInstanceId>,
    identity: string,
  ) =>
    sql`
    SELECT 1 FROM orchestration_v2_effect_outbox e
    JOIN orchestration_v2_projection_provider_threads p ON p.thread_id = e.thread_id
    LEFT JOIN native_session_sync s ON s.provider_thread_id = p.provider_thread_id
    WHERE (
      ${sql.in("p.provider_instance_id", instanceIds)}
      OR (s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') AND s.continuation_key = ${identity})
    )
      AND e.effect_type = 'native-session.lifecycle' AND e.status IN ('pending', 'running', 'failed')
      AND e.rowid = (
        SELECT MAX(newer.rowid) FROM orchestration_v2_effect_outbox newer
        WHERE newer.thread_id = e.thread_id AND newer.effect_type = 'native-session.lifecycle'
      ) LIMIT 1
  `.pipe(Effect.map((rows) => rows.length > 0));

  const findProject = Effect.fn("NativeSessionSync.findProject")(function* (
    summary: NativeSessionSummary,
  ) {
    if (!summary.cwd || !path.isAbsolute(summary.cwd)) return null;
    return yield* projects
      .registerNativeWorkspace({
        projectId: yield* ids.allocate.project({ fixtureName: "native-session-sync" }),
        commandId: yield* ids.allocate.command({
          fixtureName: "native-session-sync",
          commandName: "project.create",
        }),
        workspaceRoot: summary.cwd,
        title: path.basename(summary.cwd) || summary.cwd,
      })
      .pipe(
        Effect.catchTags({
          ProjectConflictError: (error) =>
            projects
              .getById(error.conflictingProjectId, { includeDeleted: true })
              .pipe(Effect.map(Option.getOrNull)),
        }),
      );
  });

  const createThread = Effect.fn("NativeSessionSync.createThread")(function* (
    instance: ProviderInstance,
    summary: NativeSessionSummary,
  ) {
    if (summary.state === "deleted" || summary.nativeId === "") return null;
    const threadId = ThreadId.make(`shared:${instance.instanceId}:${summary.nativeId}`);
    // A replacement native session keeps its shared thread ID, including after deletion.
    const existing = yield* projection
      .getThread(threadId)
      .pipe(Effect.catchTags({ ProjectionStoreThreadNotFoundError: () => Effect.succeed(null) }));
    if (existing !== null) return null;
    const project = yield* findProject(summary);
    if (!project || project.deletedAt || project.archivedAt) return null;
    const resolved = resolveProjectSettings(
      yield* settings.getSettings,
      project.id,
      project,
    ).settings;
    const providerThreadId = ids.derive.providerThread({
      driver: instance.driverKind,
      providerInstanceId: instance.instanceId,
      nativeThreadId: summary.nativeId,
    });
    const createdAt = DateTime.makeUnsafe(summary.createdAt);
    const updatedAt = DateTime.makeUnsafe(summary.updatedAt);
    const providerThread: OrchestrationV2ProviderThread = {
      id: providerThreadId,
      driver: instance.driverKind,
      providerInstanceId: instance.instanceId,
      providerSessionId: null,
      appThreadId: threadId,
      ownerNodeId: null,
      nativeThreadRef: {
        driver: instance.driverKind,
        nativeId: summary.nativeId,
        strength: "strong",
      },
      nativeConversationHeadRef: null,
      status: "idle",
      firstRunOrdinal: null,
      lastRunOrdinal: null,
      handoffIds: [],
      forkedFrom: null,
      pendingBackgroundTasks: [],
      createdAt,
      updatedAt,
    };
    const thread: OrchestrationV2AppThread = {
      id: threadId,
      createdBy: "system",
      creationSource: "server",
      projectId: project.id,
      title: summary.title.trim() || "Untitled thread",
      providerInstanceId: instance.instanceId,
      modelSelection: {
        instanceId: instance.instanceId,
        model: summary.model ?? DEFAULT_MODEL_BY_PROVIDER[instance.driverKind] ?? DEFAULT_MODEL,
      },
      runtimeMode: resolved.defaultRuntimeMode,
      interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
      branch: null,
      worktreePath: null,
      linkedPullRequest: null,
      branchPullRequest: null,
      activeProviderThreadId: providerThreadId,
      historyOrigin: "v1_import",
      lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
      forkedFrom: null,
      createdAt,
      updatedAt,
      archivedAt: summary.state === "archived" ? updatedAt : null,
      settledOverride: "settled",
      settledAt: updatedAt,
      unsettledAt: null,
      snoozedUntil: null,
      snoozedAt: null,
      pinnedAt: null,
      pinOrderKey: null,
      activeOrderKey: null,
      lastVisitedAt: null,
      deletedAt: null,
    };
    const committed = yield* sink.write({
      unlessNativeThreadOwned: providerThread,
      events: [
        {
          id: EventId.make(`native-session:${threadId}:created`),
          type: "thread.created",
          threadId,
          providerInstanceId: instance.instanceId,
          occurredAt: createdAt,
          payload: thread,
        },
        {
          id: EventId.make(`native-session:${providerThreadId}:created`),
          type: "provider-thread.updated",
          threadId,
          driver: instance.driverKind,
          providerInstanceId: instance.instanceId,
          occurredAt: updatedAt,
          payload: providerThread,
        },
      ],
    });
    return committed.length === 0
      ? null
      : ({
          threadId,
          providerThreadId,
          nativeId: summary.nativeId,
          syncedNativeId: null,
          catalogId: summary.catalogId ?? null,
          state: null,
          updatedAt: null,
          revision: null,
          continuationKey: null,
          excluded: 0,
        } satisfies Binding);
  });

  const setCatalogExcluded = Effect.fn("NativeSessionSync.setCatalogExcluded")(function* (
    binding: Binding,
    excluded: boolean,
    continuationKey: string,
  ) {
    if (binding.excluded === Number(excluded)) return;
    yield* sink.withProviderBatch(
      Effect.gen(function* () {
        const current = yield* projection.getThreadRecords(binding.threadId, [
          "providerThreads",
          "runs",
          "runtimeRequests",
        ]);
        const thread = current.thread;
        const providerThread = current.providerThreads.find(
          (entry) => entry.id === binding.providerThreadId,
        );
        if (
          !providerThread ||
          providerThread.nativeThreadRef?.nativeId !== binding.nativeId ||
          thread.activeProviderThreadId !== binding.providerThreadId ||
          thread.deletedAt !== null ||
          (excluded &&
            (thread.createdBy !== "system" ||
              thread.creationSource !== "server" ||
              thread.historyOrigin !== "v1_import")) ||
          current.runs.some((run) =>
            ["preparing", "queued", "starting", "running", "waiting"].includes(run.status),
          ) ||
          current.runtimeRequests.some((request) => request.status === "pending") ||
          (yield* unresolvedLifecycle(binding.threadId))
        )
          return;
        yield* sql`
          INSERT INTO native_session_sync (provider_thread_id, native_id, native_state, native_updated_at, continuation_key, catalog_excluded)
          VALUES (${binding.providerThreadId}, ${binding.nativeId}, ${stateOf(thread)}, ${DateTime.formatIso(thread.updatedAt)}, ${continuationKey}, ${Number(excluded)})
          ON CONFLICT(provider_thread_id) DO UPDATE SET
            native_id = excluded.native_id, continuation_key = excluded.continuation_key,
            catalog_excluded = excluded.catalog_excluded
        `;
        yield* sink.write({
          events: [
            {
              id: yield* ids.allocate.event({ threadId: binding.threadId }),
              type: "provider-thread.updated",
              threadId: binding.threadId,
              driver: providerThread.driver,
              providerInstanceId: providerThread.providerInstanceId,
              occurredAt: yield* DateTime.now,
              payload: providerThread,
            },
          ],
        });
      }),
    );
  });

  const appendHistory = Effect.fn("NativeSessionSync.appendHistory")(function* (
    binding: Binding,
    messages: ReadonlyArray<NativeSessionMessage>,
    summary: NativeSessionSummary,
    continuationKey: string,
  ) {
    yield* sink.withProviderBatch(
      Effect.gen(function* () {
        const current = yield* projection.getThreadRecords(binding.threadId, [
          "messages",
          "turnItems",
          "providerTurns",
          "providerThreads",
          "runs",
          "runtimeRequests",
        ]);
        if (
          current.thread.deletedAt !== null ||
          current.runs.some((run) =>
            ["preparing", "queued", "starting", "running", "waiting"].includes(run.status),
          ) ||
          current.runtimeRequests.some((request) => request.status === "pending")
        )
          return;
        const providerThread = current.providerThreads.find(
          (entry) => entry.id === binding.providerThreadId,
        );
        if (!providerThread) return;
        // Reads can finish after a replacement; an unchanged binding may still adopt a catalog alias.
        const nativeId = providerThread.nativeThreadRef?.nativeId;
        if (nativeId !== binding.nativeId && nativeId !== summary.nativeId) return;
        const seen = yield* sql<NativeMessageAcknowledgement>`
        SELECT native_id AS nativeId, message_id AS messageId FROM native_session_messages
        WHERE provider_thread_id = ${binding.providerThreadId}
      `;
        const result = reconcileNativeMessages({
          messages,
          existing: current.messages,
          seen,
          nativeItems: current.turnItems.flatMap((item) =>
            item.nativeItemRef?.nativeId != null &&
            item.nativeItemRef.driver === providerThread.driver &&
            (item.providerThreadId === providerThread.id || item.providerThreadId === null)
              ? [
                  {
                    nativeId: item.nativeItemRef.nativeId,
                    messageId: "messageId" in item ? (item.messageId ?? null) : null,
                  },
                ]
              : [],
          ),
          nativeTurns: current.providerTurns.flatMap((turn) =>
            turn.providerThreadId === providerThread.id &&
            turn.nativeTurnRef?.nativeId != null &&
            turn.status !== "pending" &&
            turn.status !== "running"
              ? [
                  {
                    nativeId: turn.nativeTurnRef.nativeId,
                    userMessageId:
                      current.runs.find((run) => run.activeAttemptId === turn.runAttemptId)
                        ?.userMessageId ?? null,
                  },
                ]
              : [],
          ),
        });
        const at = DateTime.makeUnsafe(summary.updatedAt);
        const updatedProvider =
          providerThread.nativeThreadRef?.nativeId === summary.nativeId
            ? providerThread
            : {
                ...providerThread,
                nativeThreadRef: {
                  driver: providerThread.driver,
                  nativeId: summary.nativeId,
                  strength: "strong" as const,
                },
                updatedAt: at,
              };
        const imports = messages.filter(
          (message) =>
            result.append.includes(message) ||
            current.messages.some(
              (entry) => entry.id === messageIdFor(providerThread.id, message.id),
            ),
        );
        const lastOrdinals = new Map<number, number>();
        for (const item of current.turnItems) {
          const base = Math.floor(item.ordinal / 1_000_000) * 1_000_000;
          lastOrdinals.set(base, Math.max(lastOrdinals.get(base) ?? base, item.ordinal));
        }
        const ordinals = new Map<MessageId, number>();
        const moved: Array<MessageId> = [];
        for (const message of imports) {
          const id = messageIdFor(providerThread.id, message.id);
          const previous = current.turnItems.find((item) => item.id === TurnItemId.make(id));
          // Replay-only providers timestamp old history with each catalog refresh.
          const createdAt = DateTime.toEpochMillis(
            previous?.startedAt ?? DateTime.makeUnsafe(message.createdAt),
          );
          const base = current.runs.reduce(
            (previous, run) =>
              DateTime.toEpochMillis(run.requestedAt) <= createdAt
                ? Math.max(previous, run.ordinal * 1_000_000)
                : previous,
            0,
          );
          const ordinal =
            previous && previous.ordinal > base && previous.ordinal < base + 1_000_000
              ? previous.ordinal
              : (lastOrdinals.get(base) ?? base) + 1;
          lastOrdinals.set(base, Math.max(lastOrdinals.get(base) ?? base, ordinal));
          ordinals.set(id, ordinal);
          if (previous?.ordinal !== ordinal) moved.push(id);
        }
        // Imported turns share the preceding run's range without becoming app-owned runs.
        for (const id of moved)
          yield* sql`DELETE FROM orchestration_v2_turn_item_positions
            WHERE thread_id = ${binding.threadId} AND turn_item_id = ${id}`;
        for (const id of moved)
          yield* sql`INSERT INTO orchestration_v2_turn_item_positions (thread_id, turn_item_id, ordinal)
            VALUES (${binding.threadId}, ${id}, ${ordinals.get(id)!})`;
        const events: Array<OrchestrationV2DomainEvent> = result.append.flatMap((message) =>
          messageEvents(
            binding.threadId,
            updatedProvider,
            message,
            ordinals.get(messageIdFor(providerThread.id, message.id))!,
          ),
        );
        for (const message of messages) {
          const id = messageIdFor(providerThread.id, message.id);
          const previous = current.messages.find((candidate) => candidate.id === id);
          if (!previous || (previous.text === message.text && !moved.includes(id))) continue;
          const item = current.turnItems.find((candidate) => candidate.id === TurnItemId.make(id));
          if (!item) continue;
          if (previous.text === message.text) {
            events.push({
              id: yield* ids.allocate.event({ threadId: binding.threadId }),
              type: "turn-item.updated",
              threadId: binding.threadId,
              driver: providerThread.driver,
              providerInstanceId: providerThread.providerInstanceId,
              occurredAt: at,
              payload: { ...item, ordinal: ordinals.get(id)! },
            });
            continue;
          }
          for (const event of messageEvents(
            binding.threadId,
            updatedProvider,
            { ...message, createdAt: DateTime.formatIso(previous.createdAt) },
            ordinals.get(id)!,
            at,
          )) {
            events.push({
              ...event,
              id: yield* ids.allocate.event({ threadId: binding.threadId }),
            });
          }
        }
        if (updatedProvider !== providerThread)
          events.push({
            id: yield* ids.allocate.event({ threadId: binding.threadId }),
            type: "provider-thread.updated",
            threadId: binding.threadId,
            driver: providerThread.driver,
            providerInstanceId: providerThread.providerInstanceId,
            occurredAt: at,
            payload: updatedProvider,
          });
        if (events.length > 0) yield* sink.write({ events });
        const acknowledgements = [
          ...result.acknowledgements,
          ...result.append.map((message) => ({
            nativeId: message.id,
            messageId: messageIdFor(providerThread.id, message.id),
          })),
        ];
        yield* sql.withTransaction(
          Effect.gen(function* () {
            for (const ack of acknowledgements)
              yield* sql`
          INSERT OR IGNORE INTO native_session_messages (provider_thread_id, native_id, message_id)
          VALUES (${providerThread.id}, ${ack.nativeId}, ${ack.messageId})
        `;
            yield* remember(providerThread.id, summary, continuationKey);
          }),
        );
      }),
    );
  });

  const reconcile = Effect.fn("NativeSessionSync.reconcile")(function* (
    capability: ProviderNativeSessions,
    binding: Binding,
    summary: NativeSessionSummary,
    continuationKey: string,
  ) {
    if (binding.continuationKey === null && summary.state === "deleted") return;
    // A missing old transcript must not delete the session that replaced it during the read.
    const current = yield* projection.getThreadRecords(binding.threadId, ["providerThreads"]);
    const nativeId = current.providerThreads.find((entry) => entry.id === binding.providerThreadId)
      ?.nativeThreadRef?.nativeId;
    if (nativeId !== binding.nativeId && nativeId !== summary.nativeId) return;
    const thread = current.thread;
    const pending = yield* unresolvedLifecycle(binding.threadId);
    if (pending || thread.deletedAt !== null) return;
    const change = nativeLifecycleChange(
      stateOf(thread),
      binding.state ?? undefined,
      summary.state,
      pending,
    );
    if (change !== undefined) {
      yield* orchestrator.dispatch({
        type:
          change === "deleted"
            ? "thread.delete"
            : change === "archived"
              ? "thread.archive"
              : "thread.unarchive",
        commandId: yield* ids.allocate.command({
          fixtureName: binding.threadId,
          commandName: `native-session.${change}`,
        }),
        threadId: binding.threadId,
      });
    }
    if (summary.state === "deleted") {
      yield* remember(
        binding.providerThreadId,
        { ...summary, nativeId: binding.nativeId },
        continuationKey,
      );
      return;
    }
    if (!capability.read) {
      yield* remember(binding.providerThreadId, summary, continuationKey);
      return;
    }
    if (
      binding.updatedAt === summary.updatedAt &&
      binding.nativeId === summary.nativeId &&
      binding.revision === (summary.revision ?? null)
    ) {
      if (
        binding.state !== summary.state ||
        binding.continuationKey !== continuationKey ||
        (summary.catalogId !== undefined && binding.catalogId !== summary.catalogId)
      )
        yield* remember(binding.providerThreadId, summary, continuationKey);
      const misplaced = yield* sql`
        SELECT 1 FROM orchestration_v2_projection_turn_items AS item
        WHERE item.thread_id = ${binding.threadId}
          AND item.provider_thread_id = ${binding.providerThreadId}
          AND item.run_id IS NULL AND item.turn_item_id LIKE 'native-session:%'
          AND EXISTS (
            SELECT 1 FROM orchestration_v2_projection_runs AS run
            WHERE run.thread_id = item.thread_id
              AND run.requested_at <= json_extract(item.payload_json, '$.startedAt')
              AND item.ordinal < run.ordinal * 1000000
          )
        LIMIT 1
      `;
      if (misplaced.length === 0) return;
    }
    const messages = yield* capability.read({ nativeId: summary.nativeId, cwd: summary.cwd });
    yield* appendHistory(binding, messages, summary, continuationKey);
  });

  const sync = Effect.gen(function* () {
    const allInstances = yield* registry.listInstances;
    const instances = allInstances.filter(
      (instance) => instance.enabled && instance.nativeSessions !== undefined,
    );
    const visited = new Set<string>();
    for (const instance of instances) {
      if (!(yield* instance.snapshot.getSnapshot).installed) continue;
      const identity = continuationKeyFor(instance);
      if (visited.has(identity)) continue;
      visited.add(identity);
      const peers = instances.filter(
        (other) =>
          other.driverKind === instance.driverKind &&
          other.continuationIdentity.continuationKey ===
            instance.continuationIdentity.continuationKey,
      );
      let failed = false;
      const reportFailure = Effect.fn("NativeSessionSync.reportFailure")(function* (
        error: unknown,
      ) {
        failed = true;
        yield* Effect.forEach(
          peers,
          (peer) =>
            providers.setNativeSessionSyncError({
              instanceId: peer.instanceId,
              error: String(error),
            }),
          { discard: true },
        );
        yield* Effect.logWarning("Could not synchronize native sessions", {
          instanceId: instance.instanceId,
          error,
        });
      });
      const refresh = Effect.fn("NativeSessionSync.refresh")(function* (
        capability: ProviderNativeSessions,
      ) {
        const bindings = yield* bindingsFor(
          peers.map((peer) => peer.instanceId),
          identity,
        );
        if (
          bindings.some(
            (binding) => binding.continuationKey !== null && binding.continuationKey !== identity,
          )
        )
          yield* reportFailure(
            new NativeSessionError({
              operation: "sync",
              detail: "The native session belongs to a different provider store.",
            }),
          );
        const workspaces: Array<string | undefined> = [];
        if (capability.scope === "global") workspaces.push(undefined);
        else {
          const roots = new Map(
            (yield* projects.listShells()).map((project) => [
              normalizeProjectPathForComparison(project.workspaceRoot),
              project.workspaceRoot,
            ]),
          );
          for (const threadId of new Set(bindings.map((binding) => binding.threadId))) {
            const thread = yield* projection.getThread(threadId);
            if (thread.deletedAt === null && thread.worktreePath !== null)
              roots.set(
                normalizeProjectPathForComparison(thread.worktreePath),
                thread.worktreePath,
              );
          }
          workspaces.push(...roots.values());
        }
        for (const cwd of workspaces) {
          const catalog = yield* capability
            .list(cwd === undefined ? {} : { cwd })
            .pipe(Effect.result);
          if (catalog._tag === "Failure") {
            yield* reportFailure(catalog.failure);
            continue;
          }
          const encountered = new Set<ProviderThreadId>();
          for (const summary of catalog.success.sessions) {
            yield* Effect.gen(function* () {
              const nativeIds = new Set([summary.nativeId, ...(summary.aliases ?? [])]);
              let binding =
                bindings.find((candidate) => candidate.nativeId === summary.nativeId) ??
                bindings.find(
                  (candidate) =>
                    summary.catalogId !== undefined && candidate.catalogId === summary.catalogId,
                ) ??
                bindings.find((candidate) => nativeIds.has(candidate.nativeId));
              if (binding?.continuationKey != null && binding.continuationKey !== identity) return;
              if (!binding) binding = (yield* createThread(instance, summary)) ?? undefined;
              if (!binding) return;
              encountered.add(binding.providerThreadId);
              yield* setCatalogExcluded(binding, false, identity);
              yield* reconcile(capability, binding, summary, identity);
            }).pipe(Effect.catch(reportFailure));
          }
          const excludedIds = new Set(catalog.success.excludedNativeIds ?? []);
          for (const binding of bindings) {
            if (
              encountered.has(binding.providerThreadId) ||
              !excludedIds.has(binding.nativeId) ||
              (binding.continuationKey !== null && binding.continuationKey !== identity)
            )
              continue;
            encountered.add(binding.providerThreadId);
            yield* setCatalogExcluded(binding, true, identity).pipe(Effect.catch(reportFailure));
          }
          if (capability.read === undefined) continue;
          for (const binding of bindings) {
            if (
              encountered.has(binding.providerThreadId) ||
              binding.continuationKey !== identity ||
              binding.state === "deleted" ||
              (binding.syncedNativeId !== null && binding.syncedNativeId !== binding.nativeId)
            )
              continue;
            const current = yield* projection.getThreadRecords(binding.threadId, [
              "runs",
              "runtimeRequests",
            ]);
            const thread = current.thread;
            if (
              thread.deletedAt !== null ||
              (yield* unresolvedLifecycle(binding.threadId)) ||
              current.runs.some((run) =>
                ["preparing", "queued", "starting", "running", "waiting"].includes(run.status),
              ) ||
              current.runtimeRequests.some((request) => request.status === "pending")
            )
              continue;
            const project = yield* projects.getById(thread.projectId, { includeDeleted: true });
            if (Option.isNone(project)) continue;
            const workspace = thread.worktreePath ?? project.value.workspaceRoot;
            if (
              cwd !== undefined &&
              normalizeProjectPathForComparison(cwd) !==
                normalizeProjectPathForComparison(workspace)
            )
              continue;
            // Pagination can race an archive/unarchive. Confirm a missing native ID directly.
            const history = yield* capability
              .read({ nativeId: binding.nativeId, cwd: workspace })
              .pipe(Effect.result);
            if (history._tag === "Success") continue;
            if (history.failure.notFound !== true) {
              yield* reportFailure(history.failure);
              continue;
            }
            yield* reconcile(
              capability,
              binding,
              {
                nativeId: binding.nativeId,
                cwd: workspace,
                title: thread.title,
                createdAt: DateTime.formatIso(thread.createdAt),
                updatedAt: binding.updatedAt ?? DateTime.formatIso(thread.updatedAt),
                state: "deleted",
              },
              identity,
            );
          }
        }
      });
      const capability = instance.nativeSessions!;
      yield* (
        capability.withConnection ? capability.withConnection(refresh) : refresh(capability)
      ).pipe(Effect.catch(reportFailure));
      if (
        !failed &&
        !(yield* hasUnresolvedLifecycle(
          peers.map((peer) => peer.instanceId),
          identity,
        ))
      ) {
        yield* Effect.forEach(
          peers,
          (peer) =>
            providers.setNativeSessionSyncError({ instanceId: peer.instanceId, error: null }),
          { discard: true },
        );
      }
    }
  }).pipe(gate.withPermits(1));

  const lifecycleRoute = Effect.fn("NativeSessionSync.lifecycleRoute")(function* (
    providerThread: OrchestrationV2ProviderThread,
    state: NativeSessionState,
    instances: ReadonlyArray<ProviderInstance>,
  ) {
    const nativeId = providerThread.nativeThreadRef?.nativeId;
    if (providerThread.ownerNodeId !== null || nativeId == null)
      return { status: "complete" as const };
    const previous = yield* sql<{
      readonly state: NativeSessionState;
      readonly nativeId: string;
      readonly continuationKey: string | null;
    }>`
      SELECT native_state AS state, native_id AS nativeId, continuation_key AS continuationKey
      FROM native_session_sync WHERE provider_thread_id = ${providerThread.id}
    `;
    const owned = previous[0]?.nativeId === nativeId ? previous[0] : undefined;
    if (owned?.continuationKey != null && owned.state === state)
      return { status: "complete" as const };
    const owner = instances.find(
      (instance) => instance.instanceId === providerThread.providerInstanceId,
    );
    if (owned?.continuationKey == null && owner?.enabled && owner.nativeSessions === undefined)
      return { status: "complete" as const };
    // Disabled configuration omits secrets; only observed ownership can select another instance.
    const instance = instances.find(
      (candidate) =>
        candidate.enabled &&
        candidate.nativeSessions !== undefined &&
        candidate.driverKind === providerThread.driver &&
        (owned?.continuationKey != null
          ? continuationKeyFor(candidate) === owned.continuationKey
          : candidate.instanceId === providerThread.providerInstanceId),
    );
    if (instance === undefined)
      return {
        status: "unavailable" as const,
        detail:
          owned?.continuationKey != null &&
          owner?.enabled &&
          continuationKeyFor(owner) !== owned.continuationKey
            ? "The native session belongs to a different provider store."
            : "No enabled provider instance can access the native session's store.",
      };
    return { status: "ready" as const, instance, observed: owned?.continuationKey != null };
  });

  const requeueFailedLifecycle = Effect.gen(function* () {
    const failed = yield* sql<{
      readonly effectId: string;
      readonly threadId: ThreadId;
      readonly state: NativeSessionState;
    }>`
      SELECT e.effect_id AS effectId, e.thread_id AS threadId, json_extract(e.payload_json, '$.state') AS state
      FROM orchestration_v2_effect_outbox e
      WHERE e.effect_type = 'native-session.lifecycle' AND e.status = 'failed'
        AND json_extract(e.payload_json, '$.state') IN ('active', 'archived', 'deleted')
        AND e.rowid = (
          SELECT MAX(newer.rowid) FROM orchestration_v2_effect_outbox newer
          WHERE newer.thread_id = e.thread_id AND newer.effect_type = 'native-session.lifecycle'
        )
    `;
    const instances = yield* registry.listInstances;
    const ready: string[] = [];
    for (const effect of failed) {
      const current = yield* projection.getThreadRecords(effect.threadId, ["providerThreads"]);
      if (stateOf(current.thread) !== effect.state) continue;
      let available = false;
      let complete = true;
      for (const providerThread of current.providerThreads) {
        const route = yield* lifecycleRoute(providerThread, effect.state, instances);
        if (route.status === "ready") available = true;
        if (route.status !== "complete") complete = false;
      }
      if (available || complete) ready.push(effect.effectId);
    }
    yield* outbox.retryFailedNativeLifecycles(ready);
  }).pipe(gate.withPermits(1));

  const retryFailedLifecycle = Effect.gen(function* () {
    const running = yield* sql<{ readonly effectId: string }>`
      SELECT effect_id AS effectId FROM orchestration_v2_effect_outbox
      WHERE effect_type = 'native-session.lifecycle' AND status = 'running'
    `;
    // A provider change can arrive between lifecycle failure and its outbox settlement.
    yield* Effect.forEach(running, ({ effectId }) => outbox.awaitSettled(effectId), {
      discard: true,
    });
    yield* requeueFailedLifecycle;
  });

  const lifecycle = Effect.fn("NativeSessionSync.lifecycle")(function* (input: {
    readonly threadId: ThreadId;
    readonly state: NativeSessionState;
  }) {
    const current = yield* projection.getThreadRecords(input.threadId, ["providerThreads"]);
    // A newer local command wins over an older queued lifecycle effect.
    if (stateOf(current.thread) !== input.state) return;
    const project = yield* projects.getById(current.thread.projectId, { includeDeleted: true });
    if (Option.isNone(project)) return;
    const cwd = current.thread.worktreePath ?? project.value.workspaceRoot;
    const failures: Array<NativeSessionError> = [];
    const instances = yield* registry.listInstances;
    const reportFailure = Effect.fn("NativeSessionSync.reportLifecycleFailure")(function* (
      providerThread: OrchestrationV2ProviderThread,
      cause: unknown,
      executor?: ProviderInstance,
    ) {
      const owner = instances.find(
        (instance) => instance.instanceId === providerThread.providerInstanceId,
      );
      const error = new NativeSessionError({
        operation: input.state,
        detail: `${owner?.displayName ?? providerThread.driver}: ${String(cause)}`,
        cause,
      });
      failures.push(error);
      const instanceIds = new Set([providerThread.providerInstanceId]);
      if (executor) instanceIds.add(executor.instanceId);
      yield* Effect.forEach(
        instanceIds,
        (instanceId) => providers.setNativeSessionSyncError({ instanceId, error: error.message }),
        { discard: true },
      );
    });
    const groups = new Map<
      ProviderInstance,
      Array<{ readonly providerThread: OrchestrationV2ProviderThread; readonly observed: boolean }>
    >();
    for (const providerThread of current.providerThreads) {
      const route = yield* lifecycleRoute(providerThread, input.state, instances);
      if (route.status === "complete") continue;
      if (route.status === "unavailable") {
        yield* reportFailure(
          providerThread,
          new NativeSessionError({ operation: input.state, detail: route.detail }),
        );
        continue;
      }
      const group = groups.get(route.instance) ?? [];
      group.push({ providerThread, observed: route.observed });
      groups.set(route.instance, group);
    }
    for (const [instance, threads] of groups) {
      const capability = instance.nativeSessions!;
      const identity = continuationKeyFor(instance);
      const apply = Effect.fn("NativeSessionSync.applyLifecycle")(function* (
        connected: ProviderNativeSessions,
      ) {
        for (const { providerThread, observed } of threads) {
          const address = { nativeId: providerThread.nativeThreadRef!.nativeId!, cwd };
          const operation =
            input.state === "deleted"
              ? connected.delete?.(address)
              : connected.setArchived?.({ ...address, archived: input.state === "archived" });
          if (operation === undefined) continue;
          yield* Effect.gen(function* () {
            if (!observed) {
              const catalog = yield* connected.list(connected.scope === "global" ? {} : { cwd });
              const summary = catalog.sessions.find(
                (session) => session.nativeId === address.nativeId && session.state !== "deleted",
              );
              if (!summary)
                return yield* new NativeSessionError({
                  operation: input.state,
                  detail: "The native session has not been observed in this provider store.",
                });
              // Ownership discovery has not consumed this session's message history.
              yield* remember(providerThread.id, { ...summary, updatedAt: "" }, identity);
            }
            if (providerThread.providerSessionId !== null)
              yield* sessions.detach({
                providerSessionId: providerThread.providerSessionId,
                threadId: input.threadId,
              });
            yield* operation;
            yield* sql`
              INSERT INTO native_session_sync (provider_thread_id, catalog_id, native_id, native_state, native_updated_at, continuation_key)
              VALUES (${providerThread.id}, NULL, ${address.nativeId}, ${input.state}, '', ${identity})
              ON CONFLICT(provider_thread_id) DO UPDATE SET native_id = excluded.native_id, native_state = excluded.native_state, native_updated_at = '', continuation_key = excluded.continuation_key
            `;
          }).pipe(Effect.catch((cause) => reportFailure(providerThread, cause, instance)));
        }
      });
      yield* (
        capability.withConnection ? capability.withConnection(apply) : apply(capability)
      ).pipe(
        Effect.catch((cause) =>
          Effect.forEach(
            threads,
            ({ providerThread }) => reportFailure(providerThread, cause, instance),
            { discard: true },
          ),
        ),
      );
    }
    if (failures[0]) return yield* failures[0];
  }, gate.withPermits(1));

  return {
    sync: sync.pipe(Effect.asVoid),
    retryFailedLifecycle,
    lifecycle: (input: { readonly threadId: ThreadId; readonly state: NativeSessionState }) =>
      lifecycle(input).pipe(Effect.asVoid),
  };
});

export class NativeSessionSync extends Context.Service<
  NativeSessionSync,
  Effect.Success<typeof make>
>()("t3/project/NativeSessionSync") {}
export const layer = Layer.effect(NativeSessionSync, make);
