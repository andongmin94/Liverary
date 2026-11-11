import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  DEFAULT_RUNTIME_MODE,
  isRuntimeModeAbove,
  AgentSessionImportProjectChangedError,
  AgentSessionImportProjectNotFoundError,
  AgentSessionImportSource,
  AgentSessionScanError,
  AgentSessionSource,
  EventId,
  MessageId,
  ProjectId,
  ProviderDriverKind,
  ThreadId,
  TurnItemId,
  type AgentSessionImportInput,
  type AgentSessionImportResult,
  type OrchestrationV2AppThread,
  type OrchestrationV2ConversationMessage,
  type OrchestrationV2DomainEvent,
  type OrchestrationV2ProviderThread,
  type OrchestrationV2TurnItem,
} from "@t3tools/contracts";
import { normalizeProjectPathForComparison } from "@t3tools/shared/path";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as SqlClient from "effect/sql/SqlClient";

import * as EventSink from "../orchestration-v2/EventSink.ts";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import * as Orchestrator from "../orchestration-v2/Orchestrator.ts";
import * as ProviderSessionRuntime from "../persistence/ProviderSessionRuntime.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as AgentSessionScanner from "./AgentSessionScanner.ts";
import * as ProjectService from "./ProjectService.ts";

const IMPORT_EVENT_PREFIX = "agent-session-import:v2";
const CLAUDE_SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decodeImportedTranscriptPayload = Schema.decodeUnknownOption(
  Schema.Struct({
    cwd: Schema.optional(Schema.String),
    importedTranscripts: Schema.optional(Schema.Array(AgentSessionImportSource)),
  }),
);

class AgentSessionUnresumableSessionError extends Schema.TaggedError<AgentSessionUnresumableSessionError>()(
  "AgentSessionUnresumableSessionError",
  {
    source: AgentSessionSource,
    providerSessionId: Schema.String,
  },
) {
  override get message(): string {
    return `Session '${this.providerSessionId}' from '${this.source}' cannot be resumed.`;
  }
}

class AgentSessionThreadProjectConflictError extends Schema.TaggedError<AgentSessionThreadProjectConflictError>()(
  "AgentSessionThreadProjectConflictError",
  {
    threadId: ThreadId,
    expectedProjectId: ProjectId,
    actualProjectId: ProjectId,
  },
) {
  override get message(): string {
    return `Imported thread '${this.threadId}' belongs to project '${this.actualProjectId}', not '${this.expectedProjectId}'.`;
  }
}

class AgentSessionThreadModifiedError extends Schema.TaggedError<AgentSessionThreadModifiedError>()(
  "AgentSessionThreadModifiedError",
  { threadId: ThreadId },
) {
  override get message(): string {
    return `Imported thread '${this.threadId}' already contains non-imported activity.`;
  }
}

function dateTime(value: string): DateTime.Utc {
  return DateTime.makeUnsafe(value);
}

function messageEvents(input: {
  readonly threadId: ThreadId;
  readonly index: number;
  readonly message: AgentSessionScanner.AgentSessionThreadMessage;
}): ReadonlyArray<OrchestrationV2DomainEvent> {
  const ordinal = input.index + 1;
  const suffix = String(input.index).padStart(6, "0");
  const messageId = MessageId.make(`${input.threadId}:${suffix}`);
  const turnItemId = TurnItemId.make(
    `${IMPORT_EVENT_PREFIX}:turn-item:${input.threadId}:${suffix}`,
  );
  const at = dateTime(input.message.createdAt);
  const message: OrchestrationV2ConversationMessage = {
    createdBy: input.message.role === "user" ? "user" : "agent",
    creationSource: "server",
    id: messageId,
    threadId: input.threadId,
    runId: null,
    nodeId: null,
    role: input.message.role,
    text: input.message.text,
    attachments: [],
    streaming: false,
    createdAt: at,
    updatedAt: at,
  };
  const common = {
    id: turnItemId,
    threadId: input.threadId,
    runId: null,
    nodeId: null,
    providerThreadId: null,
    providerTurnId: null,
    nativeItemRef: null,
    parentItemId: null,
    ordinal,
    status: "completed" as const,
    title: null,
    startedAt: at,
    completedAt: at,
    updatedAt: at,
  };
  const turnItem: OrchestrationV2TurnItem =
    input.message.role === "user"
      ? {
          ...common,
          createdBy: "user",
          creationSource: "server",
          type: "user_message",
          messageId,
          inputIntent: "turn_start",
          text: input.message.text,
          attachments: [],
        }
      : {
          ...common,
          type: "assistant_message",
          messageId,
          text: input.message.text,
          streaming: false,
        };
  return [
    {
      id: EventId.make(`${IMPORT_EVENT_PREFIX}:message:${input.threadId}:${suffix}`),
      type: "message.updated",
      threadId: input.threadId,
      occurredAt: at,
      payload: message,
    },
    {
      id: EventId.make(`${IMPORT_EVENT_PREFIX}:turn-item:${input.threadId}:${suffix}`),
      type: "turn-item.updated",
      threadId: input.threadId,
      occurredAt: at,
      payload: turnItem,
    },
  ];
}

function importedMessageIndex(index: number, omitted: number) {
  return index === 0 ? 0 : index + omitted;
}

function appendedMessageEvents(
  threadId: ThreadId,
  thread: AgentSessionScanner.AgentSessionThread,
  previous: ReadonlyArray<OrchestrationV2ConversationMessage>,
) {
  let savedIndex = -1;
  let latest: OrchestrationV2ConversationMessage | undefined;
  for (const message of previous) {
    if (!message.id.startsWith(`${threadId}:`)) return [];
    const index = Number(message.id.slice(threadId.length + 1));
    if (!Number.isSafeInteger(index)) return [];
    if (index > savedIndex) {
      savedIndex = index;
      latest = message;
    }
  }
  if (!latest) return [];
  const saved = latest;
  const savedAt = DateTime.toEpochMillis(saved.createdAt);
  const matches = (message: AgentSessionScanner.AgentSessionThreadMessage | undefined) =>
    message?.role === saved.role &&
    message.text === saved.text &&
    Date.parse(message.createdAt) === savedAt;
  const expected = savedIndex === 0 ? 0 : savedIndex - thread.omittedMessageCount;
  // Older imports numbered retained messages from zero even when the middle was omitted.
  const anchor = matches(thread.messages[expected])
    ? expected
    : thread.messages.findLastIndex(matches);
  return thread.messages.flatMap((message, index) => {
    const absoluteIndex = importedMessageIndex(index, thread.omittedMessageCount);
    if (absoluteIndex <= savedIndex) return [];
    if (anchor >= 0 ? index <= anchor : Date.parse(message.createdAt) <= savedAt) return [];
    return messageEvents({ threadId, index: absoluteIndex, message });
  });
}

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const scanner = yield* AgentSessionScanner.AgentSessionScanner;
  const orchestrator = yield* Orchestrator.OrchestratorV2;
  const projects = yield* ProjectService.ProjectService;
  const eventSink = yield* EventSink.EventSinkV2;
  const idAllocator = yield* IdAllocator.IdAllocatorV2;
  const runtimes = yield* ProviderSessionRuntime.ProviderSessionRuntimeRepository;
  const settingsService = yield* ServerSettings.ServerSettingsService;
  const ceiling = settingsService.managedPolicy?.limits?.maxRuntimeMode;
  const importRecentAgentThreads = Effect.fn("importRecentAgentThreadsV2")(function* (
    input: AgentSessionImportInput,
    readThreads: AgentSessionScanner.AgentSessionScanner["Service"]["recentThreads"] = scanner.recentThreads,
  ) {
    const project = yield* projects.getById(input.projectId).pipe(
      Effect.mapError((cause) => new AgentSessionScanError({ operation: "read-projects", cause })),
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(new AgentSessionImportProjectNotFoundError({ projectId: input.projectId })),
          onSome: Effect.succeed,
        }),
      ),
    );
    if (
      input.expectedWorkspaceRoot !== undefined &&
      normalizeProjectPathForComparison(project.workspaceRoot) !==
        normalizeProjectPathForComparison(input.expectedWorkspaceRoot)
    ) {
      return yield* new AgentSessionImportProjectChangedError({ projectId: input.projectId });
    }
    // Imports run in full access, except under a policy ceiling: then in the project's default,
    // which the policy keeps under it, so imported threads never sit above the ceiling.
    const runtimeMode =
      ceiling === undefined
        ? DEFAULT_RUNTIME_MODE
        : yield* settingsService.getSettings.pipe(
            Effect.mapError(
              (cause) => new AgentSessionScanError({ operation: "read-settings", cause }),
            ),
            Effect.map((settings) => {
              const mode = resolveProjectSettings(settings, input.projectId, project).settings
                .defaultRuntimeMode;
              return isRuntimeModeAbove(mode, ceiling) ? ceiling : mode;
            }),
          );
    const runtimeRows = yield* runtimes
      .list()
      .pipe(
        Effect.mapError(
          (cause) => new AgentSessionScanError({ operation: "read-projects", cause }),
        ),
      );
    const completedSources = runtimeRows.flatMap((runtime) => {
      const payload = decodeImportedTranscriptPayload(runtime.runtimePayload);
      if (
        Option.isNone(payload) ||
        payload.value.cwd === undefined ||
        normalizeProjectPathForComparison(payload.value.cwd) !==
          normalizeProjectPathForComparison(project.workspaceRoot)
      ) {
        return [];
      }
      return payload.value.importedTranscripts ?? [];
    });
    const outcomes = readThreads(project.workspaceRoot, completedSources);
    const importedThreadIds = new Set<ThreadId>();
    let importedCount = 0;
    let skippedCount = 0;

    yield* Stream.runForEach(outcomes, (outcome) =>
      Effect.gen(function* () {
        if (outcome._tag === "Skipped") {
          skippedCount += 1;
          return;
        }
        const source = outcome.source;
        const threadId = AgentSessionScanner.importedThreadId(
          source.providerInstanceId,
          source.providerSessionId,
        );
        if (outcome._tag === "AlreadyImported") {
          importedThreadIds.add(threadId);
          importedCount += 1;
          return;
        }
        if (outcome._tag === "Duplicate") {
          if (importedThreadIds.has(threadId)) {
            yield* runtimes.recordImportedTranscript({ threadId, source }).pipe(Effect.ignore);
          }
          return;
        }

        const imported = yield* Effect.gen(function* () {
          const thread = outcome.thread;
          if (
            thread.source === "claudeAgent" &&
            !CLAUDE_SESSION_ID_PATTERN.test(thread.providerSessionId)
          ) {
            return yield* new AgentSessionUnresumableSessionError({
              source: thread.source,
              providerSessionId: thread.providerSessionId,
            });
          }
          const driver = ProviderDriverKind.make(thread.source);
          // Pi resumes by session file path; its session UUID only names the thread.
          const nativeThreadId =
            thread.source === "pi" ? source.filePath : thread.providerSessionId;
          const persistRuntime = runtimes.upsert(
            {
              threadId,
              providerName: driver,
              providerInstanceId: thread.providerInstanceId,
              adapterKey: driver,
              runtimeMode,
              status: "stopped",
              lastSeenAt: thread.updatedAt,
              resumeCursor:
                thread.source === "claudeAgent"
                  ? { threadId, resume: thread.providerSessionId }
                  : { threadId: nativeThreadId },
              runtimePayload: { cwd: project.workspaceRoot },
            },
            { onConflict: "ignore" },
          );
          const existing = yield* Effect.option(
            orchestrator.getThreadRecords(threadId, ["messages", "runs"]),
          );
          if (Option.isSome(existing)) {
            if (existing.value.thread.projectId !== input.projectId) {
              return yield* new AgentSessionThreadProjectConflictError({
                threadId,
                expectedProjectId: input.projectId,
                actualProjectId: existing.value.thread.projectId,
              });
            }
            if (existing.value.thread.historyOrigin !== "v1_import") {
              return yield* new AgentSessionThreadModifiedError({ threadId });
            }
            const records = existing.value;
            if (
              !records.thread.archivedAt &&
              !records.thread.deletedAt &&
              records.runs.length === 0
            ) {
              const appended = appendedMessageEvents(threadId, thread, records.messages);
              if (appended.length > 0) yield* eventSink.write({ events: appended });
            }
            yield* persistRuntime;
            yield* runtimes.recordImportedTranscript({ threadId, source });
            return true;
          }

          const model = thread.model ?? DEFAULT_MODEL_BY_PROVIDER[driver] ?? DEFAULT_MODEL;
          const providerThreadId = idAllocator.derive.providerThread({
            driver,
            providerInstanceId: thread.providerInstanceId,
            nativeThreadId,
          });
          const createdAt = dateTime(thread.createdAt);
          const updatedAt = dateTime(thread.updatedAt);
          const appThread: OrchestrationV2AppThread = {
            createdBy: "system",
            creationSource: "server",
            id: threadId,
            projectId: input.projectId,
            title: thread.title.trim() === "" ? "Untitled thread" : thread.title,
            providerInstanceId: thread.providerInstanceId,
            modelSelection: { instanceId: thread.providerInstanceId, model },
            runtimeMode,
            interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
            branch: null,
            worktreePath: null,
            linkedPullRequest: null,
            branchPullRequest: null,
            activeProviderThreadId: providerThreadId,
            historyOrigin: "v1_import",
            lineage: {
              parentThreadId: null,
              relationshipToParent: null,
              rootThreadId: threadId,
            },
            forkedFrom: null,
            createdAt,
            updatedAt,
            archivedAt: null,
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
          const providerThread: OrchestrationV2ProviderThread = {
            id: providerThreadId,
            driver,
            providerInstanceId: thread.providerInstanceId,
            providerSessionId: null,
            appThreadId: threadId,
            ownerNodeId: null,
            nativeThreadRef: {
              driver,
              nativeId: nativeThreadId,
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

          const committed = yield* eventSink.write({
            unlessNativeThreadOwned: providerThread,
            events: [
              {
                id: EventId.make(`${IMPORT_EVENT_PREFIX}:thread:${threadId}:created`),
                type: "thread.created",
                threadId,
                providerInstanceId: thread.providerInstanceId,
                occurredAt: createdAt,
                payload: appThread,
              },
              ...(thread.omittedMessageCount > 0
                ? [
                    {
                      id: EventId.make(`${IMPORT_EVENT_PREFIX}:history-truncated:${threadId}`),
                      type: "turn-item.updated" as const,
                      threadId,
                      occurredAt: createdAt,
                      payload: {
                        id: TurnItemId.make(`${IMPORT_EVENT_PREFIX}:history-truncated:${threadId}`),
                        threadId,
                        runId: null,
                        nodeId: null,
                        providerThreadId: null,
                        providerTurnId: null,
                        nativeItemRef: null,
                        parentItemId: null,
                        ordinal: 0,
                        status: "completed" as const,
                        title: null,
                        startedAt: createdAt,
                        completedAt: createdAt,
                        updatedAt: createdAt,
                        type: "system_notice" as const,
                        message: `${thread.omittedMessageCount} earlier ${thread.omittedMessageCount === 1 ? "message was" : "messages were"} not imported. This thread keeps the first user message and the most recent history. The original session transcript is unchanged.`,
                      },
                    },
                  ]
                : []),
              ...thread.messages.flatMap((message, index) =>
                messageEvents({
                  threadId,
                  index: importedMessageIndex(index, thread.omittedMessageCount),
                  message,
                }),
              ),
              {
                id: EventId.make(`${IMPORT_EVENT_PREFIX}:provider-thread:${providerThreadId}`),
                type: "provider-thread.updated",
                threadId,
                driver,
                providerInstanceId: thread.providerInstanceId,
                occurredAt: updatedAt,
                payload: providerThread,
              },
            ],
          });
          if (committed.length === 0) return null;
          yield* persistRuntime;
          yield* runtimes.recordImportedTranscript({ threadId, source });
          return true;
        }).pipe(
          Effect.catch((cause) =>
            Effect.logWarning("Could not import an agent session", {
              provider: outcome.thread.source,
              sessionId: outcome.thread.providerSessionId,
              cause,
            }).pipe(Effect.as(false)),
          ),
        );
        if (imported === true) {
          importedThreadIds.add(threadId);
          importedCount += 1;
        } else if (imported === false) {
          skippedCount += 1;
        }
      }),
    );

    return { importedCount, skippedCount } satisfies AgentSessionImportResult;
  });

  const syncVisibility = Effect.fn("AgentSessionImporter.syncDesktopVisibility")(function* (
    visibility: ReadonlyMap<ThreadId, boolean>,
  ) {
    if (!visibility.size) return;
    const rows = yield* sql<{ threadId: ThreadId; archivedAt: string | null }>`
      SELECT thread_id AS threadId, archived_at AS archivedAt
      FROM orchestration_v2_projection_threads
      WHERE thread_id GLOB 'import:*' AND deleted_at IS NULL
    `;
    for (const { threadId, archivedAt } of rows) {
      const visible = visibility.get(threadId);
      if (visible === undefined || visible === (archivedAt === null)) continue;
      yield* eventSink.withProviderBatch(
        Effect.gen(function* () {
          // Keep a local archive, edit, or continued turn authoritative, even if it races this scan.
          const [history] = yield* sql<{ sequence: number }>`
          SELECT MAX(sequence) AS sequence FROM orchestration_events
          WHERE stream_id = ${threadId} AND aggregate_kind = 'thread' AND application_event_version = 2
          HAVING COUNT(*) > 0 AND MIN(event_id GLOB ${IMPORT_EVENT_PREFIX + ":*"} OR event_type = 'thread.visited') = 1
        `;
          if (!history) return;
          const { thread } = yield* orchestrator.getThreadRecords(threadId, []);
          if (
            thread.historyOrigin !== "v1_import" ||
            thread.deletedAt ||
            visible === (thread.archivedAt === null)
          )
            return;
          const now = yield* DateTime.now;
          yield* eventSink.write({
            events: [
              {
                id: EventId.make(
                  `${IMPORT_EVENT_PREFIX}:visibility:${threadId}:${history.sequence}`,
                ),
                type: visible ? "thread.unarchived" : "thread.archived",
                threadId,
                occurredAt: now,
                payload: { ...thread, archivedAt: visible ? null : now },
              },
            ],
          });
        }),
      );
    }
  });
  const syncDesktopSessions = Effect.gen(function* () {
    const desktop = yield* scanner.desktopSessions;
    yield* syncVisibility(desktop.visibility);
    yield* Effect.forEach(
      desktop.candidates,
      (candidate) =>
        Effect.gen(function* () {
          let projectId = candidate.projectId;
          if (!projectId) {
            const allocation = { fixtureName: "desktop-session-import" };
            const project = yield* projects
              .create({
                projectId: yield* idAllocator.allocate.project(allocation),
                commandId: yield* idAllocator.allocate.command({
                  ...allocation,
                  commandName: "project.create",
                }),
                title: candidate.title,
                workspaceRoot: candidate.path,
                ...(candidate.createWorkspaceRootIfMissing
                  ? { createWorkspaceRootIfMissing: true }
                  : {}),
              })
              .pipe(
                Effect.catchTags({
                  ProjectConflictError: (error) =>
                    projects.getById(error.conflictingProjectId).pipe(Effect.map(Option.getOrNull)),
                }),
              );
            if (!project || project.deletedAt || project.archivedAt) return;
            projectId = project.id;
          }
          yield* importRecentAgentThreads(
            { projectId, expectedWorkspaceRoot: candidate.path },
            desktop.recentThreads,
          );
        }).pipe(
          Effect.catch((error) =>
            Effect.logWarning("Failed to synchronize desktop project sessions", { error }),
          ),
        ),
      { discard: true },
    );
  });
  return { importRecentAgentThreads, syncDesktopSessions };
});

type AgentSessionImporterShape = Effect.Success<typeof make>;

export class AgentSessionImporter extends Context.Service<
  AgentSessionImporter,
  AgentSessionImporterShape
>()("t3/project/AgentSessionImporter") {}

export const layer = Layer.effect(AgentSessionImporter, make);
