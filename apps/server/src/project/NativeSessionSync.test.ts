import { expect, it } from "@effect/vitest";
import {
  EventId,
  MessageId,
  NodeId,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  ProviderThreadId,
  ProviderTurnId,
  RunAttemptId,
  RunId,
  ThreadId,
  TurnItemId,
  type OrchestrationV2AppThread,
  type OrchestrationV2ProviderThread,
  type OrchestrationV2Run,
  type Project,
} from "@t3tools/contracts";
import type { ProviderInstance } from "@t3tools/provider-core/server/driver";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import { buildServerProvider } from "@t3tools/provider-core/server/snapshotProbe";
import {
  NativeSessionError,
  type NativeSessionMessage,
  type NativeSessionState,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as SqlClient from "effect/sql/SqlClient";
import * as Stream from "effect/Stream";

import * as EventSink from "../orchestration-v2/EventSink.ts";
import * as EventStore from "../orchestration-v2/EventStore.ts";
import * as Orchestrator from "../orchestration-v2/Orchestrator.ts";
import * as ProjectionStore from "../orchestration-v2/ProjectionStore.ts";
import * as ProviderSessionManager from "../orchestration-v2/ProviderSessionManager.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import * as ProviderRegistry from "../provider/ProviderRegistry.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as NativeSessionSync from "./NativeSessionSync.ts";
import * as ProjectService from "./ProjectService.ts";

const at = "2026-11-12T10:00:00.000Z";
const now = DateTime.makeUnsafe(at);
const project: Project = {
  id: ProjectId.make("shared-project"),
  title: "Shared",
  workspaceRoot: "/workspace/shared",
  defaultModelSelection: null,
  scripts: [],
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
};
const stores = Layer.mergeAll(EventStore.layer, ProjectionStore.layer).pipe(
  Layer.provideMerge(SqlitePersistence.layerMemory),
);
const persistence = Layer.mergeAll(
  stores,
  EventSink.layer.pipe(Layer.provide(stores)),
  IdAllocator.layer,
);

const summary = (
  nativeId: string,
  patch: Partial<NativeSessionSummary> = {},
): NativeSessionSummary => ({
  nativeId,
  cwd: project.workspaceRoot,
  title: nativeId,
  createdAt: at,
  updatedAt: at,
  revision: "1",
  state: "active",
  ...patch,
});
const message = (id: string, role: "user" | "assistant", text = id): NativeSessionMessage => ({
  id,
  role,
  text,
  createdAt: at,
});

function catalog(initial: ReadonlyArray<NativeSessionSummary>) {
  const state = { sessions: initial, complete: true, listCalls: 0 };
  const histories = new Map<string, ReadonlyArray<NativeSessionMessage>>();
  const readErrors = new Map<string, NativeSessionError>();
  const reads: string[] = [];
  const operations: string[] = [];
  const capability: ProviderNativeSessions = {
    scope: "global",
    list: () =>
      Effect.sync(() => {
        state.listCalls++;
        return { sessions: state.sessions, complete: state.complete };
      }),
    read: ({ nativeId }) =>
      Effect.suspend(() => {
        reads.push(nativeId);
        const error = readErrors.get(nativeId);
        return error ? Effect.fail(error) : Effect.succeed(histories.get(nativeId) ?? []);
      }),
    setArchived: ({ nativeId, archived }) =>
      Effect.sync(() => {
        operations.push(`${nativeId}:${archived ? "archived" : "active"}`);
      }),
    delete: ({ nativeId }) =>
      Effect.sync(() => {
        operations.push(`${nativeId}:deleted`);
      }),
    deletionScope: "session",
  };
  return { state, histories, readErrors, reads, operations, capability };
}

function instance(
  id: string,
  driver: string,
  nativeSessions?: ProviderNativeSessions,
  continuationKey = id,
  installed = true,
  enabled = true,
): ProviderInstance {
  const driverKind = ProviderDriverKind.make(driver);
  return {
    instanceId: ProviderInstanceId.make(id),
    driverKind,
    displayName: id,
    enabled,
    continuationIdentity: { driverKind, continuationKey },
    ...(nativeSessions === undefined ? {} : { nativeSessions }),
    snapshot: {
      getSnapshot: Effect.succeed({
        ...buildServerProvider({
          presentation: { displayName: id },
          enabled,
          checkedAt: at,
          models: [],
          skills: [],
          probe: { installed, version: null, status: "ready", auth: { status: "unknown" } },
        }),
        instanceId: ProviderInstanceId.make(id),
        driver: driverKind,
      }),
      refresh: Effect.die("Native sync must not refresh the provider snapshot."),
      resolveMaintenance: () => Effect.die("Native sync must not run provider maintenance."),
      applyUsageLimits: () => Effect.void,
      streamChanges: Stream.empty,
    },
    get orchestrationAdapter(): never {
      throw new Error("Native sync must not start an adapter.");
    },
    get textGeneration(): never {
      throw new Error("Native sync must not generate text.");
    },
  };
}

const seedOwner = Effect.fn("NativeSessionSync.test.seedOwner")(function* (
  owners: ReadonlyArray<{ readonly instance: ProviderInstance; readonly nativeId: string }>,
  threadId = ThreadId.make("existing-liverary-owner"),
) {
  const sink = yield* EventSink.EventSinkV2;
  const providerThreads = owners.map(
    ({ instance: owner, nativeId }): OrchestrationV2ProviderThread => ({
      id: ProviderThreadId.make(`${owner.instanceId}:${nativeId}`),
      driver: owner.driverKind,
      providerInstanceId: owner.instanceId,
      providerSessionId: null,
      appThreadId: threadId,
      ownerNodeId: null,
      nativeThreadRef: { driver: owner.driverKind, nativeId, strength: "strong" },
      nativeConversationHeadRef: null,
      status: "idle",
      firstRunOrdinal: 1,
      lastRunOrdinal: 1,
      handoffIds: [],
      forkedFrom: null,
      createdAt: now,
      updatedAt: now,
    }),
  );
  const owner = owners[0]!.instance;
  const thread: OrchestrationV2AppThread = {
    id: threadId,
    createdBy: "user",
    creationSource: "web",
    projectId: project.id,
    title: "Shared conversation",
    providerInstanceId: owner.instanceId,
    modelSelection: { instanceId: owner.instanceId, model: "default" },
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    activeProviderThreadId: providerThreads[0]!.id,
    lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
    forkedFrom: null,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    deletedAt: null,
    settledOverride: null,
    settledAt: null,
    lastVisitedAt: null,
  };
  yield* sink.write({
    events: [
      {
        id: EventId.make(`${threadId}:created`),
        type: "thread.created",
        threadId,
        occurredAt: now,
        payload: thread,
      },
      ...providerThreads.map((payload) => ({
        id: EventId.make(`${payload.id}:created`),
        type: "provider-thread.updated" as const,
        threadId,
        occurredAt: now,
        payload,
      })),
    ],
  });
  return { threadId, providerThreads };
});

const makeHarness = Effect.fn("NativeSessionSync.test.makeHarness")(function* (
  instances: ReadonlyArray<ProviderInstance>,
) {
  const sink = yield* EventSink.EventSinkV2;
  const projection = yield* ProjectionStore.ProjectionStoreV2;
  const sql = yield* SqlClient.SqlClient;
  const ids = yield* IdAllocator.IdAllocatorV2;
  const commands: string[] = [];
  const errors = new Map<ProviderInstanceId, string | null>();
  const updateState = Effect.fn("NativeSessionSync.test.updateState")(function* (
    threadId: ThreadId,
    state: NativeSessionState,
  ) {
    const thread = yield* projection.getThread(threadId);
    return yield* sink.write({
      events: [
        {
          id: yield* ids.allocate.event({ threadId }),
          threadId,
          occurredAt: now,
          type:
            state === "deleted"
              ? "thread.deleted"
              : state === "archived"
                ? "thread.archived"
                : "thread.unarchived",
          payload: {
            ...thread,
            archivedAt: state === "archived" ? now : null,
            deletedAt: state === "deleted" ? now : null,
          },
        },
      ],
    });
  });
  const context = yield* Layer.build(
    NativeSessionSync.layer.pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeed(SqlClient.SqlClient, sql),
          Layer.succeed(EventSink.EventSinkV2, sink),
          Layer.succeed(ProjectionStore.ProjectionStoreV2, projection),
          Layer.succeed(IdAllocator.IdAllocatorV2, ids),
          Path.layer,
          ServerSettings.layerTest(),
          Layer.mock(ProviderInstanceRegistry.ProviderInstanceRegistry)({
            listInstances: Effect.succeed(instances),
            getInstance: (id) =>
              Effect.succeed(instances.find((candidate) => candidate.instanceId === id)),
          }),
          Layer.mock(ProviderRegistry.ProviderRegistry)({
            setNativeSessionSyncError: ({ instanceId, error }) =>
              Effect.sync(() => {
                errors.set(instanceId, error);
              }),
          }),
          Layer.mock(ProjectService.ProjectService)({
            getById: () => Effect.succeedSome(project),
            getByWorkspaceRoot: (cwd) =>
              cwd === project.workspaceRoot
                ? Effect.succeedSome(project)
                : Effect.fail(
                    new ProjectService.ProjectOperationError({
                      operation: "normalize-workspace",
                      cause: "workspace unavailable",
                    }),
                  ),
            listShells: () =>
              Effect.succeed([
                { ...project, repositoryIdentity: null, faviconPath: null, projectIcon: null },
              ]),
          }),
          Layer.mock(ProviderSessionManager.ProviderSessionManagerV2)({
            detach: () => Effect.void,
          }),
          Layer.mock(Orchestrator.OrchestratorV2)({
            dispatch: (command) =>
              Effect.gen(function* () {
                if (
                  command.type !== "thread.archive" &&
                  command.type !== "thread.unarchive" &&
                  command.type !== "thread.delete"
                )
                  return yield* Effect.die("Unexpected native lifecycle command");
                commands.push(command.type);
                const storedEvents = yield* updateState(
                  command.threadId,
                  command.type === "thread.delete"
                    ? "deleted"
                    : command.type === "thread.archive"
                      ? "archived"
                      : "active",
                );
                return { storedEvents, sequence: storedEvents.at(-1)?.sequence ?? 0 };
              }).pipe(Effect.orDie),
          }),
        ),
      ),
    ),
  );
  return {
    service: Context.get(context, NativeSessionSync.NativeSessionSync),
    projection,
    sql,
    sink,
    commands,
    errors,
    updateState,
  };
});

it.effect(
  "updates an existing cross-provider owner without duplicating local or repeated external messages",
  () =>
    Effect.gen(function* () {
      const claude = catalog([summary("native-claude")]);
      claude.histories.set("native-claude", [
        message("local-prompt", "user", "Context handoff from Codex\n\nContinue"),
        message("local-answer", "assistant", "Done"),
      ]);
      const codex = instance("codex", "codex");
      const claudeInstance = instance("claude", "claudeAgent", claude.capability);
      const owner = yield* seedOwner([
        { instance: codex, nativeId: "native-codex" },
        { instance: claudeInstance, nativeId: "native-claude" },
      ]);
      const f = yield* makeHarness([codex, claudeInstance]);
      const providerThread = owner.providerThreads[1]!;
      const localMessageId = MessageId.make("visible-answer");
      const userMessageId = MessageId.make("visible-user");
      yield* f.sink.write({
        events: [
          {
            id: EventId.make("visible-user:message"),
            type: "message.updated",
            threadId: owner.threadId,
            occurredAt: now,
            payload: {
              id: userMessageId,
              threadId: owner.threadId,
              runId: null,
              nodeId: null,
              role: "user",
              createdBy: "user",
              creationSource: "web",
              text: "Continue",
              attachments: [],
              streaming: false,
              createdAt: now,
              updatedAt: now,
            },
          },
          {
            id: EventId.make("visible-user:item"),
            type: "turn-item.updated",
            threadId: owner.threadId,
            occurredAt: now,
            payload: {
              id: TurnItemId.make("visible-user:item"),
              threadId: owner.threadId,
              runId: null,
              nodeId: null,
              providerThreadId: providerThread.id,
              providerTurnId: null,
              parentItemId: null,
              nativeItemRef: {
                driver: claudeInstance.driverKind,
                nativeId: "local-prompt",
                strength: "strong",
              },
              type: "user_message",
              messageId: userMessageId,
              text: "Continue",
              attachments: [],
              inputIntent: "turn_start",
              createdBy: "user",
              creationSource: "web",
              ordinal: 1,
              status: "completed",
              title: null,
              startedAt: now,
              completedAt: now,
              updatedAt: now,
            },
          },
          {
            id: EventId.make("visible-answer:message"),
            type: "message.updated",
            threadId: owner.threadId,
            occurredAt: now,
            payload: {
              id: localMessageId,
              threadId: owner.threadId,
              runId: null,
              nodeId: null,
              role: "assistant",
              createdBy: "agent",
              creationSource: "server",
              text: "Done",
              attachments: [],
              streaming: false,
              createdAt: now,
              updatedAt: now,
            },
          },
          {
            id: EventId.make("visible-answer:item"),
            type: "turn-item.updated",
            threadId: owner.threadId,
            occurredAt: now,
            payload: {
              id: TurnItemId.make("visible-answer:item"),
              threadId: owner.threadId,
              runId: null,
              nodeId: null,
              providerThreadId: providerThread.id,
              providerTurnId: null,
              parentItemId: null,
              nativeItemRef: {
                driver: claudeInstance.driverKind,
                nativeId: "local-answer",
                strength: "strong",
              },
              type: "assistant_message",
              messageId: localMessageId,
              text: "Done",
              streaming: false,
              ordinal: 2,
              status: "completed",
              title: null,
              startedAt: now,
              completedAt: now,
              updatedAt: now,
            },
          },
        ],
      });
      yield* f.service.sync;
      claude.histories.set("native-claude", [
        ...claude.histories.get("native-claude")!,
        message("external-repeat", "user", "Continue"),
        message("external-answer", "assistant", "External answer"),
      ]);
      claude.state.sessions = [summary("native-claude", { revision: "2" })];
      yield* f.service.sync;
      claude.histories.set("native-claude", [
        message("local-prompt", "user", "Context handoff from Codex\n\nContinue"),
        message("local-answer", "assistant", "Provider-normalized local answer"),
        message("external-repeat", "user", "Continue"),
        message("external-answer", "assistant", "External answer completed"),
      ]);
      claude.state.sessions = [summary("native-claude", { revision: "3" })];
      yield* f.service.sync;
      yield* f.service.sync;
      const current = yield* f.projection.getThreadRecords(owner.threadId, [
        "messages",
        "providerThreads",
      ]);
      expect(current.messages.map((entry) => entry.text)).toEqual([
        "Continue",
        "Done",
        "Continue",
        "External answer completed",
      ]);
      expect(current.providerThreads).toHaveLength(2);
      expect(yield* f.sql`SELECT thread_id FROM orchestration_v2_projection_threads`).toHaveLength(
        1,
      );
      expect(claude.reads).toHaveLength(3);
    }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect("remembers desktop archive, restore, rewinds, and catalog-only deletion", () =>
  Effect.gen(function* () {
    const native = catalog([summary("native", { catalogId: "local_desktop" })]);
    const provider = instance("claude", "claudeAgent", native.capability);
    const owner = yield* seedOwner([{ instance: provider, nativeId: "native" }]);
    const f = yield* makeHarness([provider]);
    yield* f.service.sync;
    native.state.sessions = [summary("native", { catalogId: "local_desktop", state: "archived" })];
    yield* f.service.sync;
    expect((yield* f.projection.getThread(owner.threadId)).archivedAt).not.toBeNull();
    native.state.sessions = [summary("native", { catalogId: "local_desktop" })];
    yield* f.service.sync;
    expect((yield* f.projection.getThread(owner.threadId)).archivedAt).toBeNull();
    native.state.sessions = [
      summary("rewound", { catalogId: "local_desktop", aliases: ["native"] }),
    ];
    native.histories.set("rewound", [message("rewound-response", "assistant")]);
    yield* f.service.sync;
    const rewound = yield* f.projection.getThreadRecords(owner.threadId, [
      "providerThreads",
      "messages",
    ]);
    expect(rewound.providerThreads[0]?.nativeThreadRef?.nativeId).toBe("rewound");
    expect(rewound.messages.map((entry) => entry.text)).toEqual(["rewound-response"]);
    native.state.sessions = [
      summary("", { catalogId: "local_desktop", cwd: "", state: "deleted" }),
    ];
    yield* f.service.sync;
    expect((yield* f.projection.getThread(owner.threadId)).deletedAt).not.toBeNull();
    expect(f.commands).toEqual(["thread.archive", "thread.unarchive", "thread.delete"]);
    expect(
      yield* f.sql`SELECT native_id AS id, native_state AS state FROM native_session_sync`,
    ).toEqual([{ id: "rewound", state: "deleted" }]);
    expect(native.reads).toEqual(["native", "rewound"]);
  }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect("confirms missing sessions through read even when the catalog is incomplete", () =>
  Effect.gen(function* () {
    const native = catalog([summary("native"), summary("other-native")]);
    const provider = instance("codex", "codex", native.capability);
    const owner = yield* seedOwner([{ instance: provider, nativeId: "native" }]);
    const other = yield* seedOwner(
      [{ instance: provider, nativeId: "other-native" }],
      ThreadId.make("other-owner"),
    );
    const f = yield* makeHarness([provider]);
    yield* f.service.sync;
    native.state.sessions = [];
    native.state.complete = false;
    yield* f.service.sync;
    expect(native.reads).toHaveLength(4);
    native.state.complete = true;
    yield* f.service.sync;
    native.readErrors.set(
      "native",
      new NativeSessionError({ operation: "read", detail: "temporarily unavailable" }),
    );
    native.readErrors.set(
      "other-native",
      new NativeSessionError({ operation: "read", detail: "session removed", notFound: true }),
    );
    yield* f.service.sync;
    expect((yield* f.projection.getThread(owner.threadId)).deletedAt).toBeNull();
    expect((yield* f.projection.getThread(other.threadId)).deletedAt).not.toBeNull();
    expect(f.commands).toEqual(["thread.delete"]);
    expect(f.errors.get(provider.instanceId)).toContain("temporarily unavailable");
    native.readErrors.set(
      "native",
      new NativeSessionError({ operation: "read", detail: "session removed", notFound: true }),
    );
    native.state.complete = false;
    yield* f.service.sync;
    expect((yield* f.projection.getThread(owner.threadId)).deletedAt).not.toBeNull();
    expect(f.commands).toEqual(["thread.delete", "thread.delete"]);
    expect(f.errors.get(provider.instanceId)).toBeNull();
  }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect.each(["new", "stored"] as const)(
  "requires catalog ownership before inferring deletion of a %s native binding",
  (bindingState) =>
    Effect.gen(function* () {
      const native = catalog([]);
      native.state.complete = false;
      native.readErrors.set(
        "native",
        new NativeSessionError({ operation: "read", detail: "removed", notFound: true }),
      );
      const provider = instance("codex", "codex", native.capability);
      const owner = yield* seedOwner([{ instance: provider, nativeId: "native" }]);
      const f = yield* makeHarness([provider]);
      if (bindingState === "stored")
        yield* f.sql`
          INSERT INTO native_session_sync (provider_thread_id, native_id, native_state, native_updated_at, native_revision)
          VALUES (${owner.providerThreads[0]!.id}, 'native', 'active', ${at}, '1')
        `;
      yield* f.service.sync;
      expect(native.reads).toEqual([]);
      const runId = RunId.make("existing-run");
      const run: OrchestrationV2Run = {
        id: runId,
        threadId: owner.threadId,
        ordinal: 1,
        providerInstanceId: provider.instanceId,
        modelSelection: { instanceId: provider.instanceId, model: "default" },
        providerThreadId: owner.providerThreads[0]!.id,
        userMessageId: MessageId.make("existing-user"),
        rootNodeId: null,
        activeAttemptId: RunAttemptId.make("existing-attempt"),
        status: "running",
        requestedAt: now,
        startedAt: now,
        completedAt: null,
        checkpointId: null,
        contextHandoffId: null,
      };
      yield* f.sink.write({
        events: [
          {
            id: EventId.make("existing-run"),
            type: "run.created",
            threadId: owner.threadId,
            occurredAt: now,
            payload: run,
          },
          {
            id: EventId.make("existing-turn"),
            type: "provider-turn.updated",
            threadId: owner.threadId,
            occurredAt: now,
            payload: {
              id: ProviderTurnId.make("existing-turn"),
              providerThreadId: owner.providerThreads[0]!.id,
              nodeId: NodeId.make("existing-node"),
              runAttemptId: run.activeAttemptId,
              nativeTurnRef: {
                driver: provider.driverKind,
                nativeId: "completed-native-turn",
                strength: "strong",
              },
              ordinal: 1,
              status: "completed",
              startedAt: now,
              completedAt: now,
            },
          },
        ],
      });
      yield* f.service.sync;
      expect(native.reads).toEqual([]);
      yield* f.sink.write({
        events: [
          {
            id: EventId.make("existing-run:completed"),
            type: "run.updated",
            threadId: owner.threadId,
            occurredAt: now,
            payload: { ...run, status: "completed", completedAt: now },
          },
        ],
      });
      yield* f.service.sync;
      expect(native.reads).toEqual([]);
      expect((yield* f.projection.getThread(owner.threadId)).deletedAt).toBeNull();
      native.state.sessions = [summary("native")];
      native.readErrors.clear();
      yield* f.service.sync;
      native.state.sessions = [];
      native.readErrors.set(
        "native",
        new NativeSessionError({ operation: "read", detail: "removed", notFound: true }),
      );
      yield* f.service.sync;
      expect(native.reads).toEqual(bindingState === "stored" ? ["native"] : ["native", "native"]);
      expect((yield* f.projection.getThread(owner.threadId)).deletedAt).not.toBeNull();
    }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect("refreshes a known worktree alongside the project workspace", () =>
  Effect.gen(function* () {
    const native = catalog([
      summary("root-native"),
      summary("native", { cwd: "/workspace/worktree" }),
    ]);
    const scanned: Array<string | undefined> = [];
    let failRoot = false;
    const provider = instance("cursor", "cursor", {
      ...native.capability,
      scope: "workspace",
      list: ({ cwd }) =>
        Effect.suspend(() => {
          scanned.push(cwd);
          if (failRoot && cwd === project.workspaceRoot)
            return Effect.fail(
              new NativeSessionError({ operation: "list", detail: "workspace unavailable" }),
            );
          return Effect.succeed({
            sessions: native.state.sessions.filter((session) => session.cwd === cwd),
            complete: true,
          });
        }),
    });
    const owner = yield* seedOwner([{ instance: provider, nativeId: "native" }]);
    const rootOwner = yield* seedOwner(
      [{ instance: provider, nativeId: "root-native" }],
      ThreadId.make("root-owner"),
    );
    const f = yield* makeHarness([provider]);
    const thread = yield* f.projection.getThread(owner.threadId);
    yield* f.sink.write({
      events: [
        {
          id: EventId.make("known-worktree"),
          type: "thread.metadata-updated",
          threadId: owner.threadId,
          occurredAt: now,
          payload: { ...thread, worktreePath: "/workspace/worktree" },
        },
      ],
    });
    yield* f.service.sync;
    failRoot = true;
    native.readErrors.set(
      "root-native",
      new NativeSessionError({ operation: "read", detail: "session unavailable", notFound: true }),
    );
    native.state.sessions = [summary("native", { cwd: "/workspace/worktree", revision: "2" })];
    native.histories.set("native", [
      message("worktree-update", "assistant", "Updated in original app"),
    ]);
    yield* f.service.sync;
    expect(scanned).toEqual([
      project.workspaceRoot,
      "/workspace/worktree",
      project.workspaceRoot,
      "/workspace/worktree",
    ]);
    expect(native.reads).toEqual(["root-native", "native", "native"]);
    expect((yield* f.projection.getThread(rootOwner.threadId)).deletedAt).toBeNull();
    expect(f.errors.get(provider.instanceId)).toContain("workspace unavailable");
    expect(
      (yield* f.projection.getThreadRecords(owner.threadId, ["messages"])).messages.map(
        (entry) => entry.text,
      ),
    ).toEqual(["Updated in original app"]);
    failRoot = false;
    native.readErrors.delete("root-native");
    yield* f.service.sync;
    expect(f.errors.get(provider.instanceId)).toBeNull();
  }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect.each(["history", "notFound", "canonical"] as const)(
  "checks native identity after an in-flight %s response",
  (response) =>
    Effect.gen(function* () {
      const native = catalog([summary("native")]);
      const readStarted = yield* Deferred.make<void>();
      const releaseRead = yield* Deferred.make<void>();
      let blockRead = false;
      const provider = instance("codex", "codex", {
        ...native.capability,
        read: (address) =>
          Effect.gen(function* () {
            const result = yield* native.capability.read!(address).pipe(Effect.result);
            if (blockRead) {
              yield* Deferred.succeed(readStarted, undefined);
              yield* Deferred.await(releaseRead);
            }
            return yield* Effect.fromResult(result);
          }),
      });
      const owner = yield* seedOwner([{ instance: provider, nativeId: "native" }]);
      const f = yield* makeHarness([provider]);
      native.histories.set("native", [message("existing-response", "assistant")]);
      yield* f.service.sync;
      const originalMessages = (yield* f.projection.getThreadRecords(owner.threadId, ["messages"]))
        .messages;
      expect(originalMessages.map((entry) => entry.text)).toEqual(["existing-response"]);
      const originalSyncState = yield* f.sql`SELECT * FROM native_session_sync`;
      const originalAcknowledgements = yield* f.sql`SELECT * FROM native_session_messages`;
      const readNativeId = response === "canonical" ? "replacement" : "native";
      native.state.sessions =
        response === "notFound"
          ? []
          : [
              summary(readNativeId, {
                revision: "2",
                ...(response === "canonical" ? { aliases: ["native"] } : {}),
              }),
            ];
      native.histories.set(readNativeId, [
        message(
          response === "canonical" ? "replacement-response" : "obsolete-response",
          "assistant",
        ),
      ]);
      if (response === "notFound")
        native.readErrors.set(
          "native",
          new NativeSessionError({
            operation: "read",
            detail: "old session removed",
            notFound: true,
          }),
        );
      blockRead = true;
      const sync = yield* f.service.sync.pipe(Effect.forkChild({ startImmediately: true }));
      yield* Deferred.await(readStarted);
      const previous = owner.providerThreads[0]!;
      yield* f.sink.write({
        events: [
          {
            id: EventId.make("replacement-during-native-read"),
            type: "provider-thread.updated",
            threadId: owner.threadId,
            occurredAt: now,
            payload: {
              ...previous,
              nativeThreadRef: {
                driver: provider.driverKind,
                nativeId: "replacement",
                strength: "strong",
              },
            },
          },
        ],
      });
      yield* Deferred.succeed(releaseRead, undefined);
      yield* Fiber.join(sync);
      const current = yield* f.projection.getThreadRecords(owner.threadId, [
        "messages",
        "providerThreads",
      ]);
      expect(current.thread.deletedAt).toBeNull();
      expect(current.providerThreads[0]?.nativeThreadRef?.nativeId).toBe("replacement");
      if (response === "canonical") {
        expect(current.messages.map((entry) => entry.text)).toEqual([
          "existing-response",
          "replacement-response",
        ]);
        expect(yield* f.sql`SELECT native_id AS id FROM native_session_sync`).toEqual([
          { id: "replacement" },
        ]);
        expect(yield* f.sql`SELECT * FROM native_session_messages`).toEqual(
          expect.arrayContaining([...originalAcknowledgements]),
        );
      } else {
        expect(current.messages).toEqual(originalMessages);
        expect(yield* f.sql`SELECT * FROM native_session_sync`).toEqual(originalSyncState);
        expect(yield* f.sql`SELECT * FROM native_session_messages`).toEqual(
          originalAcknowledgements,
        );
      }
      expect(f.commands).toEqual([]);

      blockRead = false;
      native.state.sessions = [summary("replacement")];
      native.histories.set("replacement", [message("replacement-response", "assistant")]);
      yield* f.service.sync;
      expect(
        (yield* f.projection.getThreadRecords(owner.threadId, ["messages"])).messages.map(
          (entry) => entry.text,
        ),
      ).toEqual(["existing-response", "replacement-response"]);
      expect(yield* f.sql`SELECT native_id AS id FROM native_session_sync`).toEqual([
        { id: "replacement" },
      ]);
      expect(f.errors.get(provider.instanceId)).toBeNull();
    }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect("keeps native replacement state and history on the original shared thread", () =>
  Effect.gen(function* () {
    const native = catalog([summary("native")]);
    const provider = instance("codex", "codex", native.capability);
    const f = yield* makeHarness([provider]);
    yield* f.service.sync;
    const threadId = ThreadId.make(`shared:${provider.instanceId}:native`);
    const owner = {
      threadId,
      providerThreads: (yield* f.projection.getThreadRecords(threadId, ["providerThreads"]))
        .providerThreads,
    };
    yield* f.updateState(owner.threadId, "archived");
    yield* f.service.lifecycle({ threadId: owner.threadId, state: "archived" });
    const previous = owner.providerThreads[0]!;
    yield* f.sink.write({
      events: [
        {
          id: EventId.make("replaced-provider-thread"),
          type: "provider-thread.updated",
          threadId: owner.threadId,
          occurredAt: now,
          payload: {
            ...previous,
            nativeThreadRef: {
              driver: provider.driverKind,
              nativeId: "replacement",
              strength: "strong",
            },
          },
        },
        {
          id: EventId.make("previous-native-turn"),
          type: "provider-turn.updated",
          threadId: owner.threadId,
          occurredAt: now,
          payload: {
            id: ProviderTurnId.make("previous-native-turn"),
            providerThreadId: previous.id,
            nodeId: NodeId.make("previous-node"),
            runAttemptId: null,
            nativeTurnRef: {
              driver: provider.driverKind,
              nativeId: "old-native-turn",
              strength: "strong",
            },
            ordinal: 1,
            status: "completed",
            startedAt: now,
            completedAt: now,
          },
        },
      ],
    });
    native.state.sessions = [];
    native.readErrors.set(
      "replacement",
      new NativeSessionError({ operation: "read", detail: "not materialized", notFound: true }),
    );
    yield* f.service.sync;
    expect((yield* f.projection.getThread(owner.threadId)).deletedAt).toBeNull();
    expect(native.reads).toEqual(["native"]);
    native.state.sessions = [summary("native"), summary("replacement")];
    native.readErrors.delete("replacement");
    native.histories.set("replacement", [message("replacement-response", "assistant")]);
    yield* f.service.sync;
    expect(f.errors.get(provider.instanceId)).toBeNull();
    const replaced = yield* f.projection.getThreadRecords(owner.threadId, [
      "messages",
      "providerThreads",
    ]);
    expect(replaced.thread.archivedAt).not.toBeNull();
    expect(replaced.providerThreads[0]?.nativeThreadRef?.nativeId).toBe("replacement");
    expect(replaced.messages.map((entry) => entry.text)).toEqual(["replacement-response"]);
    expect(yield* f.sql`SELECT thread_id FROM orchestration_v2_projection_threads`).toEqual([
      { thread_id: owner.threadId },
    ]);
    yield* f.service.lifecycle({ threadId: owner.threadId, state: "archived" });
    expect(native.operations).toEqual(["native:archived", "replacement:archived"]);
    expect(yield* f.sql`SELECT native_id AS id FROM native_session_sync`).toEqual([
      { id: "replacement" },
    ]);
    yield* f.updateState(owner.threadId, "deleted");
    yield* f.service.lifecycle({ threadId: owner.threadId, state: "deleted" });
    yield* f.service.sync;
    expect(f.errors.get(provider.instanceId)).toBeNull();
    expect((yield* f.projection.getThread(owner.threadId)).deletedAt).not.toBeNull();
    expect(native.operations).toEqual([
      "native:archived",
      "replacement:archived",
      "replacement:deleted",
    ]);
  }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect.each(["sync", "archived", "deleted"] as const)(
  "keeps %s operations within a native session's original provider store after reconfiguration",
  (operation) =>
    Effect.gen(function* () {
      const original = catalog([summary("native")]);
      const provider = instance("codex", "codex", original.capability, "codex:home:original");
      const owner = yield* seedOwner([{ instance: provider, nativeId: "native" }]);
      const initial = yield* makeHarness([provider]);
      if (operation !== "sync") {
        original.state.sessions = [];
        yield* initial.updateState(owner.threadId, operation);
        expect(
          Exit.isFailure(
            yield* Effect.exit(
              initial.service.lifecycle({ threadId: owner.threadId, state: operation }),
            ),
          ),
        ).toBe(true);
        expect(original.operations).toEqual([]);
        yield* initial.updateState(owner.threadId, "active");
        original.state.sessions = [summary("native")];
      }
      yield* initial.service.sync;

      const replacement = catalog(operation === "sync" ? [] : [summary("native")]);
      replacement.readErrors.set(
        "native",
        new NativeSessionError({ operation: "read", detail: "session removed", notFound: true }),
      );
      const reconfigured = yield* makeHarness([
        instance("codex", "codex", replacement.capability, "codex:home:replacement"),
      ]);
      if (operation === "sync") {
        yield* reconfigured.service.sync;
        expect((yield* reconfigured.projection.getThread(owner.threadId)).deletedAt).toBeNull();
        expect(replacement.reads).toEqual([]);
        replacement.state.sessions = [summary("native", { state: "archived", revision: "2" })];
        replacement.histories.set("native", [message("other-store", "assistant")]);
        replacement.readErrors.clear();
        yield* reconfigured.service.sync;
        const current = yield* reconfigured.projection.getThreadRecords(owner.threadId, [
          "messages",
        ]);
        expect(current.thread.archivedAt).toBeNull();
        expect(current.messages).toEqual([]);
        expect(replacement.reads).toEqual([]);
      } else {
        yield* reconfigured.updateState(owner.threadId, operation);
        yield* Effect.exit(
          reconfigured.service.lifecycle({ threadId: owner.threadId, state: operation }),
        );
        expect(replacement.operations).toEqual([]);
      }
      expect(reconfigured.errors.get(provider.instanceId)).toContain("different provider store");
      const restored = yield* makeHarness([provider]);
      if (operation === "sync") {
        original.state.sessions = [summary("native", { revision: "2" })];
        original.histories.set("native", [message("original-store", "assistant")]);
        yield* restored.service.sync;
        expect(
          (yield* restored.projection.getThreadRecords(owner.threadId, ["messages"])).messages.map(
            (entry) => entry.text,
          ),
        ).toEqual(["original-store"]);
      } else {
        yield* restored.service.lifecycle({ threadId: owner.threadId, state: operation });
        expect(original.operations).toEqual([`native:${operation}`]);
      }
    }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect.each([
  {
    label: "active owner",
    enabled: true,
    currentStore: "same-home",
    observedStore: null,
    sharedOwner: true,
  },
  {
    label: "observed disabled owner",
    enabled: false,
    currentStore: "same-home",
    observedStore: "same-home",
    sharedOwner: true,
  },
  {
    label: "disabled owner with an unresolved home",
    enabled: false,
    currentStore: "unresolved-home",
    observedStore: "same-home",
    sharedOwner: true,
  },
  {
    label: "disabled owner from another store",
    enabled: false,
    currentStore: "same-home",
    observedStore: "another-home",
    sharedOwner: false,
  },
  {
    label: "unobserved disabled owner",
    enabled: false,
    currentStore: "same-home",
    observedStore: null,
    sharedOwner: false,
  },
] as const)(
  "shares one catalog across matching instances with $label",
  ({ enabled, currentStore, observedStore, sharedOwner }) =>
    Effect.gen(function* () {
      const native = catalog([
        summary("unreadable", { cwd: "/missing/workspace" }),
        summary("native", { revision: "2" }),
        summary("new-native"),
      ]);
      const first = instance("claude-personal", "claudeAgent", native.capability, "same-home");
      const second = instance(
        "claude-work",
        "claudeAgent",
        native.capability,
        currentStore,
        true,
        enabled,
      );
      const uninstalled = catalog([]);
      const owner = yield* seedOwner([{ instance: second, nativeId: "native" }]);
      if (observedStore !== null) {
        const observed = catalog([summary("native")]);
        const initial = yield* makeHarness([
          instance("claude-work", "claudeAgent", observed.capability, observedStore),
        ]);
        yield* initial.service.sync;
      }
      const f = yield* makeHarness([
        first,
        second,
        instance("absent-cli", "acpRegistry", uninstalled.capability, "absent-cli", false),
      ]);
      native.histories.set("native", [message("external", "assistant")]);
      native.histories.set("new-native", [message("new-external", "assistant")]);
      yield* f.service.sync;
      expect(native.state.listCalls).toBe(1);
      expect(uninstalled.state.listCalls).toBe(0);
      expect({
        messages: (yield* f.projection.getThreadRecords(owner.threadId, ["messages"])).messages.map(
          (entry) => entry.text,
        ),
        threadCount: (yield* f.sql`SELECT thread_id FROM orchestration_v2_projection_threads`)
          .length,
      }).toEqual({ messages: sharedOwner ? ["external"] : [], threadCount: sharedOwner ? 2 : 3 });
    }).pipe(Effect.scoped, Effect.provide(persistence)),
);

it.effect(
  "applies local lifecycle to every participating capability and keeps unsupported archive local",
  () =>
    Effect.gen(function* () {
      const codex = catalog([summary("codex-native")]);
      const claude = catalog([summary("claude-native")]);
      codex.histories.set("codex-native", [message("external-message", "assistant")]);
      let rejectArchive = true;
      let rejectDeletion = true;
      const codexInstance = instance("codex", "codex", {
        ...codex.capability,
        setArchived: (address) =>
          rejectArchive
            ? Effect.fail(new NativeSessionError({ operation: "archive", detail: "busy session" }))
            : codex.capability.setArchived!(address),
      });
      const connectedClaude: ProviderNativeSessions = {
        scope: "global",
        list: claude.capability.list,
        read: claude.capability.read!,
        deletionScope: "transcript",
        delete: (address) =>
          rejectDeletion
            ? Effect.fail(
                new NativeSessionError({ operation: "delete", detail: "busy transcript" }),
              )
            : claude.capability.delete!(address),
      };
      const claudeInstance = instance("claude", "claudeAgent", {
        scope: "global",
        list: claude.capability.list,
        withConnection: (use) => use(connectedClaude),
      });
      const owner = yield* seedOwner([
        { instance: codexInstance, nativeId: "codex-native" },
        { instance: claudeInstance, nativeId: "claude-native" },
      ]);
      const f = yield* makeHarness([codexInstance, claudeInstance]);
      yield* f.updateState(owner.threadId, "archived");
      expect(
        Exit.isFailure(
          yield* Effect.exit(f.service.lifecycle({ threadId: owner.threadId, state: "archived" })),
        ),
      ).toBe(true);
      yield* f.service.sync;
      expect(
        (yield* f.projection.getThreadRecords(owner.threadId, ["messages"])).messages.map(
          (entry) => entry.text,
        ),
      ).toEqual(["external-message"]);
      rejectArchive = false;
      yield* f.service.lifecycle({ threadId: owner.threadId, state: "archived" });
      yield* f.updateState(owner.threadId, "active");
      yield* f.service.lifecycle({ threadId: owner.threadId, state: "active" });
      yield* f.service.lifecycle({ threadId: owner.threadId, state: "archived" });
      yield* f.updateState(owner.threadId, "deleted");
      expect(
        Exit.isFailure(
          yield* Effect.exit(f.service.lifecycle({ threadId: owner.threadId, state: "deleted" })),
        ),
      ).toBe(true);
      expect(f.errors.get(claudeInstance.instanceId)).toContain("busy transcript");
      yield* f.sql`
    INSERT INTO orchestration_v2_effect_outbox (effect_id, command_id, thread_id, effect_type, payload_json, status, available_at, created_at, updated_at, last_error)
    VALUES ('failed-native-delete', 'delete-command', ${owner.threadId}, 'native-session.lifecycle', '{}', 'failed', ${at}, ${at}, ${at}, 'busy transcript')
  `;
      yield* f.service.sync;
      expect(f.errors.get(claudeInstance.instanceId)).toContain("busy transcript");
      rejectDeletion = false;
      yield* f.service.lifecycle({ threadId: owner.threadId, state: "deleted" });
      expect(codex.operations).toEqual([
        "codex-native:archived",
        "codex-native:active",
        "codex-native:deleted",
      ]);
      expect(claude.operations).toEqual(["claude-native:deleted"]);
      yield* f.sql`UPDATE orchestration_v2_effect_outbox SET status = 'succeeded' WHERE effect_id = 'failed-native-delete'`;
      yield* f.service.sync;
      expect(f.errors.get(claudeInstance.instanceId)).toBeNull();
    }).pipe(Effect.scoped, Effect.provide(persistence)),
);
