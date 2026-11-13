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
};

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
  const path = yield* Path.Path;
  const gate = yield* Semaphore.make(1);

  const bindingsFor = (instanceIds: ReadonlyArray<ProviderInstanceId>) => sql<Binding>`
    SELECT p.thread_id AS threadId, p.provider_thread_id AS providerThreadId,
      json_extract(p.payload_json, '$.nativeThreadRef.nativeId') AS nativeId,
      s.catalog_id AS catalogId, s.native_id AS syncedNativeId,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.native_state END AS state,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.native_updated_at END AS updatedAt,
      CASE WHEN s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId') THEN s.native_revision END AS revision
    FROM orchestration_v2_projection_provider_threads p
    LEFT JOIN native_session_sync s ON s.provider_thread_id = p.provider_thread_id
    WHERE ${sql.in("p.provider_instance_id", instanceIds)}
      AND json_extract(p.payload_json, '$.ownerNodeId') IS NULL
      AND json_extract(p.payload_json, '$.nativeThreadRef.nativeId') IS NOT NULL
  `;

  const remember = (providerThreadId: ProviderThreadId, summary: NativeSessionSummary) =>
    sql`
    INSERT INTO native_session_sync (provider_thread_id, catalog_id, native_id, native_state, native_updated_at, native_revision)
    VALUES (${providerThreadId}, ${summary.catalogId ?? null}, ${summary.nativeId}, ${summary.state}, ${summary.updatedAt}, ${summary.revision ?? null})
    ON CONFLICT(provider_thread_id) DO UPDATE SET
      catalog_id = COALESCE(excluded.catalog_id, native_session_sync.catalog_id),
      native_id = excluded.native_id, native_state = excluded.native_state,
      native_updated_at = excluded.native_updated_at, native_revision = excluded.native_revision
  `.pipe(Effect.asVoid);

  const pendingLifecycle = (threadId: ThreadId) =>
    sql`
    SELECT 1 FROM orchestration_v2_effect_outbox
    WHERE thread_id = ${threadId} AND effect_type = 'native-session.lifecycle'
      AND status IN ('pending', 'running') LIMIT 1
  `.pipe(Effect.map((rows) => rows.length > 0));

  const hasUnresolvedLifecycle = (instanceIds: ReadonlyArray<ProviderInstanceId>) =>
    sql`
    SELECT 1 FROM orchestration_v2_effect_outbox e
    JOIN orchestration_v2_projection_provider_threads p ON p.thread_id = e.thread_id
    WHERE ${sql.in("p.provider_instance_id", instanceIds)}
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
    const existing = yield* projects.getByWorkspaceRoot(summary.cwd, { includeDeleted: true });
    if (Option.isSome(existing)) return existing.value;
    return yield* projects
      .create({
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
    const project = yield* findProject(summary);
    if (!project || project.deletedAt || project.archivedAt) return null;
    const resolved = resolveProjectSettings(
      yield* settings.getSettings,
      project.id,
      project,
    ).settings;
    const threadId = ThreadId.make(`shared:${instance.instanceId}:${summary.nativeId}`);
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
        } satisfies Binding);
  });

  const appendHistory = Effect.fn("NativeSessionSync.appendHistory")(function* (
    binding: Binding,
    messages: ReadonlyArray<NativeSessionMessage>,
    summary: NativeSessionSummary,
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
        const ordinal = yield* projection.getNextTurnItemOrdinal(binding.threadId);
        const events: Array<OrchestrationV2DomainEvent> = result.append.flatMap((message, index) =>
          messageEvents(binding.threadId, updatedProvider, message, ordinal + index),
        );
        for (const message of messages) {
          const id = messageIdFor(providerThread.id, message.id);
          const previous = current.messages.find((candidate) => candidate.id === id);
          if (!previous || previous.text === message.text) continue;
          const item = current.turnItems.find((candidate) => candidate.id === TurnItemId.make(id));
          if (!item) continue;
          for (const event of messageEvents(
            binding.threadId,
            updatedProvider,
            message,
            item.ordinal,
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
            yield* remember(providerThread.id, summary);
          }),
        );
      }),
    );
  });

  const reconcile = Effect.fn("NativeSessionSync.reconcile")(function* (
    capability: ProviderNativeSessions,
    binding: Binding,
    summary: NativeSessionSummary,
  ) {
    const thread = yield* projection.getThread(binding.threadId);
    const pending = yield* pendingLifecycle(binding.threadId);
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
      yield* remember(binding.providerThreadId, { ...summary, nativeId: binding.nativeId });
      return;
    }
    if (!capability.read) {
      yield* remember(binding.providerThreadId, summary);
      return;
    }
    if (
      binding.updatedAt === summary.updatedAt &&
      binding.nativeId === summary.nativeId &&
      binding.revision === (summary.revision ?? null)
    ) {
      if (
        binding.state !== summary.state ||
        (summary.catalogId !== undefined && binding.catalogId !== summary.catalogId)
      )
        yield* remember(binding.providerThreadId, summary);
      return;
    }
    const messages = yield* capability.read({ nativeId: summary.nativeId, cwd: summary.cwd });
    yield* appendHistory(binding, messages, summary);
  });

  const sync = Effect.gen(function* () {
    const instances = (yield* registry.listInstances).filter(
      (instance) => instance.enabled && instance.nativeSessions !== undefined,
    );
    const visited = new Set<string>();
    for (const instance of instances) {
      if (!(yield* instance.snapshot.getSnapshot).installed) continue;
      const identity = `${instance.driverKind}:${instance.continuationIdentity.continuationKey}`;
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
        const bindings = yield* bindingsFor(peers.map((peer) => peer.instanceId));
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
          const catalog = yield* capability.list(cwd === undefined ? {} : { cwd });
          const encountered = new Set<ProviderThreadId>();
          for (const summary of catalog.sessions) {
            yield* Effect.gen(function* () {
              const nativeIds = new Set([summary.nativeId, ...(summary.aliases ?? [])]);
              let binding = bindings.find(
                (candidate) =>
                  nativeIds.has(candidate.nativeId) ||
                  (summary.catalogId !== undefined && candidate.catalogId === summary.catalogId),
              );
              if (!binding) binding = (yield* createThread(instance, summary)) ?? undefined;
              if (!binding) return;
              encountered.add(binding.providerThreadId);
              yield* reconcile(capability, binding, summary);
            }).pipe(Effect.catch(reportFailure));
          }
          if (capability.read === undefined) continue;
          for (const binding of bindings) {
            if (
              encountered.has(binding.providerThreadId) ||
              binding.state === "deleted" ||
              (binding.syncedNativeId !== null && binding.syncedNativeId !== binding.nativeId)
            )
              continue;
            const current = yield* projection.getThreadRecords(binding.threadId, [
              "runs",
              "runtimeRequests",
              "providerTurns",
            ]);
            const thread = current.thread;
            if (
              thread.deletedAt !== null ||
              (yield* pendingLifecycle(binding.threadId)) ||
              current.runs.some((run) =>
                ["preparing", "queued", "starting", "running", "waiting"].includes(run.status),
              ) ||
              current.runtimeRequests.some((request) => request.status === "pending")
            )
              continue;
            if (
              binding.state === null &&
              !current.providerTurns.some(
                (turn) =>
                  turn.providerThreadId === binding.providerThreadId &&
                  turn.status === "completed" &&
                  turn.nativeTurnRef !== null,
              )
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
            const missing = yield* capability
              .read({ nativeId: binding.nativeId, cwd: workspace })
              .pipe(
                Effect.as(false),
                Effect.catchIf(
                  (error) => error.notFound === true,
                  () => Effect.succeed(true),
                ),
              );
            if (missing)
              yield* reconcile(capability, binding, {
                nativeId: binding.nativeId,
                cwd: workspace,
                title: thread.title,
                createdAt: DateTime.formatIso(thread.createdAt),
                updatedAt: binding.updatedAt ?? DateTime.formatIso(thread.updatedAt),
                state: "deleted",
              });
          }
        }
      });
      const capability = instance.nativeSessions!;
      yield* (
        capability.withConnection ? capability.withConnection(refresh) : refresh(capability)
      ).pipe(Effect.catch(reportFailure));
      if (!failed && !(yield* hasUnresolvedLifecycle(peers.map((peer) => peer.instanceId)))) {
        yield* Effect.forEach(
          peers,
          (peer) =>
            providers.setNativeSessionSyncError({ instanceId: peer.instanceId, error: null }),
          { discard: true },
        );
      }
    }
  }).pipe(gate.withPermits(1));

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
    const groups = new Map<ProviderInstanceId, Array<OrchestrationV2ProviderThread>>();
    for (const providerThread of current.providerThreads) {
      if (providerThread.ownerNodeId !== null || providerThread.nativeThreadRef?.nativeId == null)
        continue;
      const group = groups.get(providerThread.providerInstanceId) ?? [];
      group.push(providerThread);
      groups.set(providerThread.providerInstanceId, group);
    }
    for (const [instanceId, threads] of groups) {
      const instance = yield* registry.getInstance(instanceId);
      const capability = instance?.nativeSessions;
      if (!instance || !instance.enabled || capability === undefined) continue;
      const reportFailure = Effect.fn("NativeSessionSync.reportLifecycleFailure")(function* (
        cause: unknown,
      ) {
        const error = new NativeSessionError({
          operation: input.state,
          detail: `${instance.displayName ?? instance.driverKind}: ${String(cause)}`,
          cause,
        });
        failures.push(error);
        yield* providers.setNativeSessionSyncError({ instanceId, error: error.message });
      });
      const apply = Effect.fn("NativeSessionSync.applyLifecycle")(function* (
        connected: ProviderNativeSessions,
      ) {
        for (const providerThread of threads) {
          const address = { nativeId: providerThread.nativeThreadRef!.nativeId!, cwd };
          const previous = yield* sql<{
            readonly state: NativeSessionState;
            readonly nativeId: string;
          }>`
            SELECT native_state AS state, native_id AS nativeId FROM native_session_sync WHERE provider_thread_id = ${providerThread.id}
          `;
          if (previous[0]?.state === input.state && previous[0].nativeId === address.nativeId)
            continue;
          const operation =
            input.state === "deleted"
              ? connected.delete?.(address)
              : connected.setArchived?.({ ...address, archived: input.state === "archived" });
          if (operation === undefined) continue;
          yield* Effect.gen(function* () {
            if (providerThread.providerSessionId !== null)
              yield* sessions.detach({
                providerSessionId: providerThread.providerSessionId,
                threadId: input.threadId,
              });
            yield* operation;
            yield* sql`
              INSERT INTO native_session_sync (provider_thread_id, catalog_id, native_id, native_state, native_updated_at)
              VALUES (${providerThread.id}, NULL, ${address.nativeId}, ${input.state}, '')
              ON CONFLICT(provider_thread_id) DO UPDATE SET native_id = excluded.native_id, native_state = excluded.native_state, native_updated_at = ''
            `;
          }).pipe(Effect.catch(reportFailure));
        }
      });
      yield* (
        capability.withConnection ? capability.withConnection(apply) : apply(capability)
      ).pipe(Effect.catch(reportFailure));
    }
    if (failures[0]) return yield* failures[0];
  }, gate.withPermits(1));

  return {
    sync: sync.pipe(Effect.asVoid),
    lifecycle: (input: { readonly threadId: ThreadId; readonly state: NativeSessionState }) =>
      lifecycle(input).pipe(Effect.asVoid),
  };
});

export class NativeSessionSync extends Context.Service<
  NativeSessionSync,
  Effect.Success<typeof make>
>()("t3/project/NativeSessionSync") {}
export const layer = Layer.effect(NativeSessionSync, make);
