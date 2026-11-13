import * as DocumentText from "../provider/DocumentText.ts";
import * as Scheduler from "../scheduling/Scheduler.ts";
import * as WorktreeSetupTracker from "../project/WorktreeSetupTracker.ts";
import * as ProjectCloneTracker from "../project/ProjectCloneTracker.ts";
import * as TerminalManager from "../terminal/Manager.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as FileSystem from "effect/FileSystem";
import * as ServerConfig from "../config.ts";
import { createPendingAttachmentId, resolveAttachmentPath } from "../attachmentStore.ts";
import * as ThreadMessageIntake from "./ThreadMessageIntake.ts";
import { assert, it, vi } from "@effect/vitest";
import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import {
  ChatAttachmentId,
  ComposerContextId,
  type ChatAttachment,
  CommandId,
  DEFAULT_SERVER_SETTINGS,
  EventId,
  GitCommandError,
  MessageId,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  OrchestrationV2ThreadProjectionJson,
  ScheduledTaskId,
  type ServerProvider,
  ThreadId,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import * as TestClock from "effect/testing/TestClock";

import * as GitWorkflow from "../git/GitWorkflowService.ts";
import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ProjectStore from "./ProjectStore.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as ProjectEnrichmentService from "../project/ProjectEnrichmentService.ts";
import * as ProjectSetupScriptRunner from "../project/ProjectSetupScriptRunner.ts";
import * as ManagedProjectFolders from "../project/ManagedProjectFolders.ts";
import * as ProviderRegistryMock from "../provider/testUtils/providerRegistryMock.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as ScheduledTasks from "../scheduledTasks/ScheduledTaskService.ts";
import * as ManagedPolicy from "../policy/ManagedPolicy.ts";
import * as SecretRequests from "../secrets/SecretRequests.ts";
import * as TextGeneration from "../textGeneration/TextGeneration.ts";
import { ClaudeProviderCapabilitiesV2 } from "./Adapters/ClaudeAdapterV2.ts";
import { CodexProviderCapabilitiesV2 } from "./Adapters/CodexAdapterV2.ts";
import * as CommandReceiptStore from "./CommandReceiptStore.ts";
import * as EffectOutbox from "./EffectOutbox.ts";
import * as EventSink from "./EventSink.ts";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import * as ProviderAdapterRegistry from "./ProviderAdapterRegistry.ts";
import * as ProjectionMaintenance from "./ProjectionMaintenance.ts";
import * as ProjectionStore from "./ProjectionStore.ts";
import * as LegacyV1ThreadImporter from "./legacy/LegacyV1ThreadImporter.ts";
import * as WorkspacePaths from "../workspace/WorkspacePaths.ts";
import * as ThreadLaunch from "./ThreadLaunchService.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import * as ThreadManagement from "./ThreadManagementService.ts";
import * as ThreadTitleRegeneration from "./ThreadTitleRegenerationService.ts";
import * as ProviderReplayHarness from "./testkit/ProviderReplayHarness.ts";
import * as RemoteDelegation from "../peer/RemoteDelegation.ts";
import type * as ProviderAdapter from "@t3tools/provider-core/server/ProviderAdapter";

const projectId = ProjectId.make("project:launch-test");
const otherProjectId = ProjectId.make("project:launch-other");
const encodeThreadProjection = Schema.encodeEffect(OrchestrationV2ThreadProjectionJson);
const modelSelection = {
  instanceId: ProviderInstanceId.make("codex"),
  model: "gpt-5.1-codex",
} as const;
const project = {
  id: projectId,
  title: "Project",
  workspaceRoot: "/repo",
  repositoryIdentity: null,
  faviconPath: null,
  defaultModelSelection: modelSelection,
  defaultThreadEnvMode: null,
  scripts: [],
  pinnedAt: null,
  archivedAt: null,
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z",
  deletedAt: null,
} as const;

const otherProject = {
  ...project,
  id: otherProjectId,
  title: "Other",
  workspaceRoot: "/other-repo",
} as const;

const adapter = {
  instanceId: modelSelection.instanceId,
  driver: ProviderDriverKind.make("codex"),
  getCapabilities: () => Effect.succeed(CodexProviderCapabilitiesV2),
  planSelectionTransition: () => Effect.succeed({ type: "apply_on_next_turn" as const }),
  openSession: () => Effect.die("provider execution is disabled in launch tests"),
} as ProviderAdapter.ProviderAdapterV2["Service"];

const claudeModelSelection = {
  instanceId: ProviderInstanceId.make("claudeAgent"),
  model: "claude-opus-5-5",
} as const;
const claudeAdapter = {
  instanceId: claudeModelSelection.instanceId,
  driver: ProviderDriverKind.make("claudeAgent"),
  getCapabilities: () => Effect.succeed(ClaudeProviderCapabilitiesV2),
  planSelectionTransition: () => Effect.succeed({ type: "apply_on_next_turn" as const }),
  openSession: () => Effect.die("provider execution is disabled in launch tests"),
} as ProviderAdapter.ProviderAdapterV2["Service"];

interface HarnessOptions {
  readonly persistedProjects?: boolean;
  readonly closeTerminal?: TerminalManager.TerminalManager["Service"]["close"];
  readonly adapters?: ReadonlyArray<ProviderAdapter.ProviderAdapterV2["Service"]>;
  readonly managedFolders?: Layer.Layer<ManagedProjectFolders.ManagedProjectFolders>;
  readonly createWorktree?: GitWorkflow.GitWorkflowService["Service"]["createWorktree"];
  readonly fetchWorktreeBaseCommit?: GitWorkflow.GitWorkflowService["Service"]["fetchWorktreeBaseCommit"];
  readonly remoteExists?: GitWorkflow.GitWorkflowService["Service"]["remoteExists"];
  readonly hasCommit?: GitWorkflow.GitWorkflowService["Service"]["hasCommit"];
  readonly renameBranch?: GitWorkflow.GitWorkflowService["Service"]["renameBranch"];
  readonly runSetup?: ProjectSetupScriptRunner.ProjectSetupScriptRunner["Service"]["runForThread"];
  readonly generateTitle?: TextGeneration.TextGeneration["Service"]["generateThreadTitle"];
  readonly generateBranchName?: TextGeneration.TextGeneration["Service"]["generateBranchName"];
  readonly serverSettings?: Parameters<typeof ServerSettings.layerTest>[0];
  readonly providers?: ReadonlyArray<ServerProvider>;
  readonly git?: Partial<GitWorkflow.GitWorkflowService["Service"]>;
}

function makeHarness(options: HarnessOptions = {}) {
  const layerDatabase = SqlitePersistence.layerMemory;
  const layerRegistry = ProviderAdapterRegistry.layerFromAdapters(options.adapters ?? [adapter]);
  const layerOrchestrator = ProviderReplayHarness.layerWithRegistry(
    { name: "thread-launch" },
    layerRegistry,
    { databaseLayer: layerDatabase, runEffectWorker: false },
  );
  const layerServerSettings = ServerSettings.layerTest(options.serverSettings);
  const layerReceipts = CommandReceiptStore.layer.pipe(Layer.provide(layerDatabase));
  const layerThreadManagement = ThreadManagement.layer.pipe(
    Layer.provide(layerOrchestrator),
    Layer.provide(layerServerSettings),
    Layer.provide(layerReceipts),
  );
  const layerOutbox = EffectOutbox.layer.pipe(Layer.provide(layerDatabase));
  const createWorktree = vi.fn(
    options.createWorktree ??
      ((input) =>
        Effect.succeed({
          worktree: { path: "/repo-worktrees/feature", refName: input.newRefName, headSha: "abc" },
        } as never)),
  );
  const renameBranch = vi.fn(
    options.renameBranch ?? ((input) => Effect.succeed({ branch: input.newBranch })),
  );
  const removeWorktree = vi.fn(
    (_input: Parameters<GitWorkflow.GitWorkflowService["Service"]["removeWorktree"]>[0]) =>
      Effect.void,
  );
  const deleteLocalBranch = vi.fn(
    (_input: Parameters<GitWorkflow.GitWorkflowService["Service"]["deleteLocalBranch"]>[0]) =>
      Effect.void,
  );
  const runSetup = vi.fn(
    options.runSetup ?? (() => Effect.succeed({ status: "no-script" as const })),
  );
  const closeTerminal = vi.fn(options.closeTerminal ?? (() => Effect.void));
  const generateBranchName = vi.fn(
    options.generateBranchName ?? (() => Effect.succeed({ branch: "generated-branch" })),
  );
  const generateThreadTitle = vi.fn(
    options.generateTitle ?? (() => Effect.succeed({ title: "Generated title" })),
  );
  const layerProjects = options.persistedProjects
    ? ProjectService.layer.pipe(
        Layer.provide(
          Layer.mergeAll(
            ProjectStore.layer,
            ProjectionStore.layer,
            layerReceipts,
            IdAllocator.layer,
            LegacyV1ThreadImporter.layer.pipe(Layer.provide(layerOrchestrator)),
            Layer.mock(ProjectEnrichmentService.ProjectEnrichmentService)({
              getAvailable: () =>
                Effect.succeed({
                  repositoryIdentity: null,
                  faviconPath: null,
                  repositoryIdentityResolved: true,
                }),
              peek: () =>
                Effect.succeed({
                  repositoryIdentity: null,
                  faviconPath: null,
                  repositoryIdentityResolved: true,
                }),
              invalidate: () => Effect.void,
            }),
            Layer.succeed(WorkspacePaths.WorkspacePaths, {
              normalizeWorkspaceRoot: (workspaceRoot) => Effect.succeed(workspaceRoot),
              resolveRelativePathWithinRoot: ({ workspaceRoot, relativePath }) =>
                Effect.succeed({ absolutePath: `${workspaceRoot}/${relativePath}`, relativePath }),
            }),
          ),
        ),
        Layer.provide(Layer.mergeAll(layerDatabase, layerOrchestrator, layerServerSettings)),
        Layer.provide(ServerConfig.layerTest(process.cwd(), { prefix: "liverary-launch-test-" })),
        Layer.provide(NodeServices.layer),
      )
    : Layer.succeed(ProjectService.ProjectService, {
        create: () => Effect.die("unused"),
        bootstrap: () => Effect.die("unused"),
        update: () => Effect.die("unused"),
        delete: () => Effect.die("unused"),
        listPage: () => Effect.die("unused"),
        getById: (id) =>
          Effect.succeed(
            id === projectId
              ? Option.some(project)
              : id === otherProjectId
                ? Option.some(otherProject)
                : Option.none(),
          ),
        getByWorkspaceRoot: () => Effect.succeedSome(project),
        workspaceScanDirectory: () => Effect.die("unused"),
        snapshot: Effect.die("unused"),
        getShell: () => Effect.die("unused"),
        listShells: () => Effect.die("unused"),
      });
  const layerExternalServices = Layer.mergeAll(
    WorktreeSetupTracker.layer,
    Layer.mock(ProjectCloneTracker.ProjectCloneTracker)({ get: () => Effect.succeed(null) }),
    Layer.mock(TerminalManager.TerminalManager)({ close: closeTerminal }),
    layerProjects,
    Layer.mock(GitWorkflow.GitWorkflowService)({
      createWorktree,
      renameBranch,
      fetchWorktreeBaseCommit:
        options.fetchWorktreeBaseCommit ??
        (() => Effect.succeed({ commitSha: "remote-main-sha", remoteRefName: "origin/main" })),
      hasCommit: options.hasCommit ?? (() => Effect.succeed(false)),
      resolveWorktreeBaseRemote: () => Effect.succeed({ remoteName: "origin", branchName: "main" }),
      remoteExists: options.remoteExists ?? (() => Effect.succeed(true)),
      remoteBranchExists: () => Effect.succeed(true),
      removeWorktree,
      deleteLocalBranch,
      ...options.git,
    }),
    Layer.succeed(ProjectSetupScriptRunner.ProjectSetupScriptRunner, {
      runForThread: runSetup,
    }),
    Layer.mock(TextGeneration.TextGeneration)({
      generateThreadTitle,
      generateBranchName,
    }),
    layerServerSettings,
    ProviderRegistryMock.layer(options.providers),
    options.managedFolders ??
      Layer.mock(ManagedProjectFolders.ManagedProjectFolders)({
        namedProjectsRoot: "/projects",
        isScratchProject: () => Effect.succeed(false),
        folderForThread: () => Effect.succeedNone,
      }),
  );
  const layerLaunch = ThreadLaunch.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        layerExternalServices,
        layerThreadManagement,
        layerReceipts,
        IdAllocator.layer,
      ),
    ),
  );
  const layerProjectedProjects = Layer.mock(ProjectStore.ProjectStoreV2)({
    get: (requestedProjectId) =>
      Effect.succeed(
        requestedProjectId === projectId
          ? Option.some({
              projectId,
              title: project.title,
              workspaceRoot: project.workspaceRoot,
              defaultModelSelection: project.defaultModelSelection,
              defaultThreadEnvMode: null,
              autoPull: false,
              faviconPath: null,
              projectIcon: null,
              scripts: project.scripts,
              pinnedAt: null,
              archivedAt: null,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              deletedAt: project.deletedAt,
            })
          : Option.none(),
      ),
  });
  const layerTitleRegeneration = ThreadTitleRegeneration.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        layerThreadManagement,
        layerProjectedProjects,
        layerExternalServices,
        NodeServices.layer,
      ),
    ),
  );
  return {
    layer: Layer.mergeAll(
      layerLaunch,
      layerOrchestrator,
      layerRegistry,
      layerThreadManagement,
      layerTitleRegeneration,
      layerOutbox,
      layerDatabase,
      layerExternalServices,
    ),
    createWorktree,
    removeWorktree,
    deleteLocalBranch,
    renameBranch,
    generateBranchName,
    generateThreadTitle,
    runSetup,
    closeTerminal,
  };
}

function launchInput(input: {
  readonly command: string;
  readonly thread: string;
  readonly message?: string;
  readonly workspace?: ThreadLaunch.ThreadLaunchWorkspaceStrategy;
}) {
  return {
    commandId: CommandId.make(input.command),
    threadId: ThreadId.make(input.thread),
    projectId,
    title: "New thread",
    modelSelection,
    runtimeMode: "full-access" as const,
    interactionMode: "default" as const,
    workspaceStrategy: input.workspace ?? { type: "root" as const },
    ...(input.message === undefined
      ? {}
      : {
          initialMessage: {
            messageId: MessageId.make(`${input.message}:id`),
            text: input.message,
            attachments: [],
          },
        }),
    createdBy: "user" as const,
    creationSource: "web" as const,
  };
}

it.effect.each(
  (["new", "existing"] as const).flatMap((target) =>
    (["user", "agent"] as const).map((createdBy) => ({ target, createdBy })),
  ),
)(
  "attributes $createdBy-configured automations in $target threads without changing their prompt",
  ({ target, createdBy }) => {
    const harness = makeHarness();
    const layerScheduledTasks = ScheduledTasks.layer.pipe(
      Layer.provide(
        Layer.mergeAll(
          harness.layer,
          NodeCrypto.layer,
          Scheduler.layer,
          Layer.mock(SecretRequests.SecretRequests)({}),
          ManagedPolicy.layerTest(),
          Layer.mock(RemoteDelegation.RemoteDelegation)({}),
        ),
      ),
    );
    return Effect.gen(function* () {
      const tasks = yield* ScheduledTasks.ScheduledTaskService;
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const existing =
        target === "existing"
          ? yield* launches.launch(
              launchInput({ command: "command:existing", thread: "thread:existing" }),
            )
          : null;
      const { task } = yield* tasks.upsert({
        id: ScheduledTaskId.make("scheduled-task:attribution"),
        title: "Daily audit",
        prompt: "Audit performance and crashes.",
        enabled: false,
        schedule: { type: "interval", everyMs: 60_000 },
        projectId,
        threadId: existing?.threadId ?? null,
        workspaceStrategy: { type: "root" },
        modelSelection,
        runtimeMode: "full-access",
        interactionMode: "default",
        createdBy,
        creationSource: createdBy === "agent" ? "mcp" : "web",
      });
      const result = yield* tasks.runNow({ id: task.id });
      assert.equal(result.task.lastRunStatus, "succeeded");
      const projectThreads = yield* threads.listProjectThreads({
        projectId,
        includeSubagents: false,
      });
      const thread =
        projectThreads.find((candidate) => candidate.id === existing?.threadId) ??
        projectThreads[0];
      assert.isDefined(thread);
      assert.equal(result.threadId, thread!.id);
      const projection = yield* threads.getThreadProjection(thread!.id);
      const wire = yield* encodeThreadProjection(projection);
      assert.equal(wire.messages[0]?.text, task.prompt);
      assert.equal(wire.messages[0]?.scheduledTaskId, task.id);
      assert.equal(wire.messages[0]?.createdBy, createdBy);
      const turnItem = wire.turnItems.find(
        (item): item is Extract<typeof item, { type: "user_message" }> =>
          item.type === "user_message",
      );
      assert.equal(turnItem?.text, task.prompt);
      assert.equal(turnItem?.scheduledTaskId, task.id);
    }).pipe(Effect.provide(Layer.mergeAll(harness.layer, layerScheduledTasks)));
  },
);

it.effect(
  "returns no dispatched thread when sending an automation to a missing thread fails",
  () => {
    const harness = makeHarness();
    const layerScheduledTasks = ScheduledTasks.layer.pipe(
      Layer.provide(
        Layer.mergeAll(
          harness.layer,
          NodeCrypto.layer,
          Scheduler.layer,
          Layer.mock(SecretRequests.SecretRequests)({}),
          ManagedPolicy.layerTest(),
        ),
      ),
    );
    return Effect.gen(function* () {
      const tasks = yield* ScheduledTasks.ScheduledTaskService;
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const { threadId } = yield* launches.launch(
        launchInput({ command: "command:missing", thread: "thread:missing" }),
      );
      const { task } = yield* tasks.upsert({
        title: "Daily audit",
        prompt: "Audit performance and crashes.",
        enabled: false,
        schedule: { type: "interval", everyMs: 60_000 },
        projectId,
        threadId,
        workspaceStrategy: { type: "root" },
        modelSelection,
        runtimeMode: "full-access",
        interactionMode: "default",
        createdBy: "user",
        creationSource: "web",
      });
      yield* threads.dispatch({
        type: "thread.delete",
        commandId: CommandId.make("command:missing:delete"),
        threadId,
      });
      const result = yield* tasks.runNow({ id: task.id });
      assert.equal(result.task.lastRunStatus, "failed");
      assert.isNull(result.threadId);
      assert.equal(result.task.threadId, threadId);
    }).pipe(Effect.provide(Layer.mergeAll(harness.layer, layerScheduledTasks)));
  },
);

it.effect("runs a thread-bound automation on the provider the thread uses now", () => {
  const harness = makeHarness({ adapters: [adapter, claudeAdapter] });
  const layerScheduledTasks = ScheduledTasks.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        harness.layer,
        NodeCrypto.layer,
        Scheduler.layer,
        Layer.mock(SecretRequests.SecretRequests)({}),
        ManagedPolicy.layerTest(),
      ),
    ),
  );
  return Effect.gen(function* () {
    const tasks = yield* ScheduledTasks.ScheduledTaskService;
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const threads = yield* ThreadManagement.ThreadManagementService;
    const launched = yield* launches.launch(
      launchInput({ command: "command:switched", thread: "thread:switched" }),
    );
    const { task } = yield* tasks.upsert({
      id: ScheduledTaskId.make("scheduled-task:switched"),
      title: "Hourly check",
      prompt: "Check on the delegated workers.",
      enabled: false,
      schedule: { type: "interval", everyMs: 3_600_000 },
      projectId,
      threadId: launched.threadId,
      workspaceStrategy: { type: "root" },
      modelSelection,
      runtimeMode: "full-access",
      interactionMode: "default",
      createdBy: "agent",
      creationSource: "mcp",
    });
    yield* threads.dispatch({
      type: "thread.model-selection.set",
      commandId: CommandId.make("command:switch-selection"),
      threadId: launched.threadId,
      modelSelection: claudeModelSelection,
    });

    const result = yield* tasks.runNow({ id: task.id });
    assert.equal(result.task.lastRunStatus, "succeeded");
    const projection = yield* threads.getThreadProjection(launched.threadId);
    const message = projection.messages.find((item) => item.scheduledTaskId === task.id);
    const run = projection.runs.find((item) => item.id === message?.runId);
    assert.deepStrictEqual(run?.modelSelection, claudeModelSelection);
    assert.deepStrictEqual(projection.thread.modelSelection, claudeModelSelection);
  }).pipe(Effect.provide(Layer.mergeAll(harness.layer, layerScheduledTasks)));
});

it.effect("retains automation and sender attribution while a message waits in the queue", () => {
  const harness = makeHarness({ runSetup: () => Effect.never });
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const threads = yield* ThreadManagement.ThreadManagementService;
    const launched = yield* launches.launch(
      launchInput({
        command: "command:automation:queue",
        thread: "thread:automation:queue",
        message: "First message",
        workspace: { type: "worktree", baseRef: "main" },
      }),
    );
    const scheduledTaskId = ScheduledTaskId.make("scheduled-task:queued");
    const senderThreadId = ThreadId.make("thread:agent-sender");
    const queued = yield* threads.sendToThread({
      projectId,
      commandId: CommandId.make("command:automation:queued"),
      threadId: launched.threadId,
      messageId: MessageId.make("message:automation:queued"),
      scheduledTaskId,
      senderThreadId,
      text: "Run the audit",
      attachments: [],
      mode: "queue",
      createdBy: "agent",
      creationSource: "mcp",
    });
    assert.equal(queued.delivery, "queued");
    const projection = yield* threads.getThreadProjection(launched.threadId);
    const message = projection.messages.find((item) => item.id === queued.message.id);
    assert.equal(message?.scheduledTaskId, scheduledTaskId);
    assert.equal(message?.senderThreadId, senderThreadId);
    assert.equal(message?.text, "Run the audit");
    // A fresh send queues instead of steering, so it needs no steerable run.
    const fresh = yield* threads.sendToThread({
      projectId,
      commandId: CommandId.make("command:automation:queued-fresh"),
      threadId: launched.threadId,
      messageId: MessageId.make("message:automation:queued-fresh"),
      text: "Start over",
      attachments: [],
      mode: "steer",
      freshContext: true,
      createdBy: "agent",
      creationSource: "mcp",
    });
    assert.equal(fresh.delivery, "queued");
    assert.isTrue(fresh.run.freshContext);
  }).pipe(Effect.provide(harness.layer));
});

it.effect("provisions independent launches concurrently instead of behind a global semaphore", () =>
  Effect.gen(function* () {
    const setupCount = yield* Ref.make(0);
    const bothEntered = yield* Deferred.make<void>();
    const allowSetup = yield* Deferred.make<void>();
    const harness = makeHarness({
      runSetup: () =>
        Ref.updateAndGet(setupCount, (count) => count + 1).pipe(
          Effect.tap((count) =>
            count === 2 ? Deferred.succeed(bothEntered, undefined) : Effect.void,
          ),
          Effect.andThen(Deferred.await(allowSetup)),
          Effect.as({ status: "no-script" as const }),
        ),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const results = yield* Effect.all(
        [
          launches.launch(
            launchInput({
              command: "command:launch:concurrent-a",
              thread: "thread:launch:concurrent-a",
              message: "First",
              workspace: { type: "worktree", baseRef: "main" },
            }),
          ),
          launches.launch(
            launchInput({
              command: "command:launch:concurrent-b",
              thread: "thread:launch:concurrent-b",
              message: "Second",
              workspace: { type: "worktree", baseRef: "main" },
            }),
          ),
        ],
        { concurrency: "unbounded" },
      );
      assert.deepEqual(
        results.map((result) => result.projection.runs[0]?.status),
        ["preparing", "preparing"],
      );
      yield* Deferred.await(bothEntered);
      assert.equal(yield* Ref.get(setupCount), 2);
      yield* Deferred.succeed(allowSetup, undefined);
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect.each([" /COMPACT "])(
  "uses the first conversation message for a title after %s",
  (nativeCommand) =>
    Effect.gen(function* () {
      const harness = makeHarness();
      yield* Effect.gen(function* () {
        const launches = yield* ThreadLaunch.ThreadLaunchService;
        const threads = yield* ThreadManagement.ThreadManagementService;
        const outbox = yield* EffectOutbox.EffectOutboxV2;
        const launched = yield* launches.launch({
          ...launchInput({
            command: "compact-title",
            thread: "compact-title-thread",
            message: nativeCommand,
          }),
          generateTitle: true,
        });
        assert.isUndefined(
          (yield* threads.getThreadProjection(launched.threadId)).thread.titleRegeneration,
        );
        assert.isNull((yield* threads.getThreadProjection(launched.threadId)).thread.lastVisitedAt);
        assert.isFalse(
          (yield* outbox.listByCommandId(CommandId.make("compact-title:initial-message"))).some(
            (effect) => effect.request.type === "thread-title.generate",
          ),
        );
        const commandId = CommandId.make("compact-title-conversation");
        const messageId = MessageId.make("compact-title-conversation-message");
        yield* threads.dispatch({
          type: "message.dispatch",
          commandId,
          threadId: launched.threadId,
          messageId,
          createdBy: "user",
          creationSource: "web",
          text: "Fix the failing parser",
          attachments: [],
          dispatchMode: { type: "defer_start" },
        });
        assert.equal(
          (yield* threads.getThreadProjection(launched.threadId)).thread.titleRegeneration
            ?.requestId,
          commandId,
        );
        assert.deepEqual(
          (yield* outbox.listByCommandId(commandId))
            .filter((effect) => effect.request.type === "thread-title.generate")
            .map((effect) => effect.request),
          [{ type: "thread-title.generate", kind: { type: "initial", messageId } }],
        );
      }).pipe(Effect.provide(harness.layer));
    }),
);

it.effect("keeps native maintenance commands out of steering and restart messages", () =>
  Effect.gen(function* () {
    const harness = makeHarness();
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const outbox = yield* EffectOutbox.EffectOutboxV2;
      for (const scenario of [
        {
          name: "compact-steer",
          first: "Fix the parser",
          next: " /COMPACT ",
          mode: "steer_active",
        },
        {
          name: "compact-restart",
          first: "Fix the parser",
          next: "/compact",
          mode: "restart_active",
        },
        {
          name: "logout-steer",
          first: "Fix the parser",
          next: "/logout",
          mode: "steer_active",
        },
        {
          name: "logout-restart",
          first: "Fix the parser",
          next: "/logout",
          mode: "restart_active",
        },
        {
          name: "steer-logout",
          first: "/logout",
          next: "Continue with the parser",
          mode: "steer_active",
        },
        {
          name: "steer-compaction",
          first: "/compact",
          next: "Continue with the parser",
          mode: "steer_active",
        },
      ] as const) {
        const launched = yield* launches.launch(
          launchInput({
            command: `${scenario.name}:launch`,
            thread: scenario.name,
            message: scenario.first,
          }),
        );
        const before = yield* threads.getThreadProjection(launched.threadId);
        const targetRun = before.runs[0];
        if (targetRun === undefined) return yield* Effect.die("Launch must create a run");
        const commandId = CommandId.make(`${scenario.name}:message`);
        const dispatch = threads.dispatch({
          type: "message.dispatch",
          commandId,
          threadId: launched.threadId,
          messageId: MessageId.make(`${scenario.name}:message`),
          createdBy: "user",
          creationSource: "web",
          text: scenario.next,
          attachments: [],
          dispatchMode: { type: scenario.mode, targetRunId: targetRun.id },
        });
        if (scenario.name.startsWith("steer-")) {
          yield* dispatch;
          const queued = (yield* threads.getThreadProjection(launched.threadId)).runs[1];
          assert.equal(queued?.status, "queued");
          assert.equal(queued?.userMessageId, MessageId.make(`${scenario.name}:message`));
          continue;
        }
        const failure = yield* dispatch.pipe(Effect.flip);
        assert.include(
          String(failure.cause).toLowerCase(),
          scenario.name.includes("logout") ? "sign" : "context compaction",
        );
        const after = yield* threads.getThreadProjection(launched.threadId);
        assert.deepEqual(after.messages, before.messages);
        assert.deepEqual(after.thread.titleRegeneration, before.thread.titleRegeneration);
        assert.deepEqual(yield* outbox.listByCommandId(commandId), []);
      }
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect("arms durable title generation after accepting the first message", () =>
  Effect.gen(function* () {
    const harness = makeHarness({
      generateTitle: (input) =>
        Effect.succeed({
          title: input.previousTitle === undefined ? "Generated title" : "Regenerated title",
        }),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const outbox = yield* EffectOutbox.EffectOutboxV2;
      const titleRegeneration = yield* ThreadTitleRegeneration.ThreadTitleRegenerationService;
      const input = {
        ...launchInput({
          command: "command:launch:title-generation",
          thread: "thread:launch:title-generation",
          message: "Generate my title",
        }),
        title: "Generate my title",
        generateTitle: true,
      };
      const launched = yield* launches.launch(input);
      const generationCommandId = CommandId.make("command:launch:title-generation:initial-message");

      const projection = yield* threads.getThreadProjection(launched.threadId);
      assert.equal(projection.thread.title, "Generate my title");
      assert.equal(projection.thread.titleRegeneration?.requestId, generationCommandId);
      assert.deepEqual(
        (yield* outbox.listByCommandId(generationCommandId)).map((effect) => effect.request),
        [
          {
            type: "thread-title.generate",
            kind: { type: "initial", messageId: MessageId.make("Generate my title:id") },
          },
        ],
      );
      yield* titleRegeneration.execute({
        threadId: launched.threadId,
        requestId: generationCommandId,
        kind: { type: "initial", messageId: MessageId.make("Generate my title:id") },
      });
      const generated = yield* threads.getThreadProjection(launched.threadId);
      assert.equal(generated.thread.title, "Generated title");
      assert.deepEqual(
        harness.generateThreadTitle.mock.calls[0]?.[0]?.modelSelection,
        DEFAULT_SERVER_SETTINGS.textGenerationModelSelection,
      );

      const manualRequestId = CommandId.make("command:title-generation:manual");
      yield* threads.dispatch({
        type: "thread.metadata.update",
        commandId: manualRequestId,
        threadId: launched.threadId,
        regenerateTitle: true,
      });
      assert.deepEqual(
        (yield* outbox.listByCommandId(manualRequestId)).map((effect) => effect.request),
        [{ type: "thread-title.generate", kind: { type: "regenerate" } }],
      );
      yield* titleRegeneration.execute({
        threadId: launched.threadId,
        requestId: manualRequestId,
        kind: { type: "regenerate" },
      });
      const regenerated = yield* threads.getThreadProjection(launched.threadId);
      assert.equal(regenerated.thread.title, "Regenerated title");
      assert.equal(
        harness.generateThreadTitle.mock.calls[1]?.[0]?.previousTitle,
        "Generated title",
      );

      yield* threads.dispatch({
        type: "thread.metadata.update",
        commandId: CommandId.make("command:title-generation:user-rename"),
        threadId: launched.threadId,
        title: "Keep my title",
      });
      const renamed = yield* threads.getThreadProjection(launched.threadId);
      yield* TestClock.adjust(Duration.seconds(1));
      yield* threads.dispatch({
        type: "thread.title.regeneration.complete",
        commandId: CommandId.make("command:title-generation:stale-completion"),
        threadId: launched.threadId,
        requestId: generationCommandId,
        title: "Stale generated title",
      });
      const afterStaleCompletion = yield* threads.getThreadProjection(launched.threadId);
      assert.equal(afterStaleCompletion.thread.title, "Keep my title");
      assert.equal(
        DateTime.toEpochMillis(afterStaleCompletion.thread.updatedAt),
        DateTime.toEpochMillis(renamed.thread.updatedAt),
      );
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect.each(["unavailable provider", "different project"] as const)(
  "does not update a reused thread title when launch is refused for %s",
  (reason) =>
    Effect.gen(function* () {
      const harness = makeHarness();
      yield* Effect.gen(function* () {
        const launches = yield* ThreadLaunch.ThreadLaunchService;
        const threads = yield* ThreadManagement.ThreadManagementService;
        const outbox = yield* EffectOutbox.EffectOutboxV2;
        const threadId = ThreadId.make("thread:launch:reused-title-failure");
        yield* threads.dispatch({
          type: "thread.create",
          commandId: CommandId.make("command:launch:reused-title-failure:create"),
          threadId,
          projectId,
          title: "Original title",
          modelSelection,
          runtimeMode: "full-access",
          interactionMode: "default",
          branch: null,
          worktreePath: null,
          createdBy: "user",
          creationSource: "web",
        });

        const commandId = CommandId.make("command:launch:reused-title-failure");
        const failed = yield* launches
          .launch({
            ...launchInput({
              command: commandId,
              thread: threadId,
              message: "Generate a provisional title",
            }),
            reuseExistingThread: true,
            title: "Generate a provisional title",
            generateTitle: true,
            ...(reason === "different project"
              ? { projectId: otherProjectId }
              : {
                  modelSelection: {
                    instanceId: ProviderInstanceId.make("missing-provider"),
                    model: "missing-model",
                  },
                }),
          })
          .pipe(Effect.exit);

        assert.isTrue(Exit.isFailure(failed));
        const projection = yield* threads.getThreadProjection(threadId);
        assert.equal(projection.thread.title, "Original title");
        assert.isUndefined(projection.thread.titleRegeneration);
        assert.isEmpty(projection.messages);
        assert.isEmpty(
          yield* outbox.listByCommandId(CommandId.make(`${commandId}:initial-message`)),
        );
        assert.equal(harness.runSetup.mock.calls.length, 0);
        assert.equal(harness.createWorktree.mock.calls.length, 0);
        if (reason === "different project") {
          const sql = yield* SqlClient.SqlClient;
          const messageCommandId = CommandId.make(`${commandId}:initial-message`);
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_command_receipts
          WHERE command_id IN (${commandId}, ${messageCommandId})`,
          );
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_events
          WHERE command_id IN (${commandId}, ${messageCommandId})`,
          );
        }
      }).pipe(Effect.provide(harness.layer));
    }),
);

// Stands `projectId` in for the Scratch project: a plain folder, not a Git
// repository, so Git fails there with the error a real one raises.
function scratchHarness() {
  const claimed: Array<ThreadId> = [];
  const scratchRoot = project.workspaceRoot;
  const notARepository = (operation: string, cwd: string) =>
    new GitCommandError({
      operation,
      command: "vcs-route",
      cwd,
      detail: "Failed to resolve the VCS driver for this Git command.",
    });
  const harness = makeHarness({
    managedFolders: Layer.mock(ManagedProjectFolders.ManagedProjectFolders)({
      namedProjectsRoot: "/projects",
      isScratchProject: (id) => Effect.succeed(id === projectId),
      folderForThread: (input) =>
        Effect.sync(() => {
          if (input.projectId !== projectId) return Option.none();
          claimed.push(input.threadId);
          return Option.some(`/scratch/folder-${claimed.length}`);
        }),
    }),
    remoteExists: (input) =>
      input.cwd === scratchRoot
        ? Effect.fail(notARepository("GitWorkflowService.remoteExists", input.cwd))
        : Effect.succeed(true),
    createWorktree: (input) =>
      input.cwd === scratchRoot
        ? Effect.fail(notARepository("GitWorkflowService.createWorktree", input.cwd))
        : Effect.succeed({
            worktree: {
              path: "/other-repo-worktrees/feature",
              refName: input.newRefName,
              headSha: "abc",
            },
          } as never),
  });
  const layerScheduledTasks = ScheduledTasks.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        harness.layer,
        NodeCrypto.layer,
        Scheduler.layer,
        Layer.mock(SecretRequests.SecretRequests)({}),
        ManagedPolicy.layerTest(),
      ),
    ),
  );
  return {
    ...harness,
    claimed,
    layer: Layer.mergeAll(harness.layer, layerScheduledTasks),
  };
}

const worktreeStrategy = { type: "worktree", baseRef: "main", startFromOrigin: true } as const;

it.effect("persists the selected provider options on the new thread and its first run", () => {
  const harness = makeHarness();
  const selectedModel = {
    ...modelSelection,
    options: [{ id: "reasoningEffort", value: "high" }],
  };
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const launched = yield* launches.launch({
      ...launchInput({
        command: "command:launch:selected-model-options",
        thread: "thread:launch:selected-model-options",
        message: "Apply the verified upstream release",
      }),
      modelSelection: selectedModel,
    });
    const projection = yield* preparationSettled(launched.threadId);
    assert.deepEqual(projection.thread.modelSelection, selectedModel);
    assert.deepEqual(projection.runs[0]?.modelSelection, selectedModel);
    assert.equal(projection.messages[0]?.text, "Apply the verified upstream release");
    assert.equal(projection.messages[0]?.runId, projection.runs[0]?.id);
  }).pipe(Effect.provide(harness.layer));
});

/** Settles once preparation releases the run, or fails it. */
const preparationSettled = (threadId: ThreadId) =>
  Effect.gen(function* () {
    const threads = yield* ThreadManagement.ThreadManagementService;
    yield* threads.streamStoredEventsFrom({ threadId }).pipe(
      Stream.filter(
        (stored) =>
          stored.event.type === "run.updated" &&
          (stored.commandId?.endsWith(":release") === true ||
            stored.event.payload.status === "failed"),
      ),
      Stream.runHead,
    );
    return yield* threads.getThreadProjection(threadId);
  });

function scheduledTaskInput(id: string, targetProjectId: ProjectId) {
  return {
    id: ScheduledTaskId.make(id),
    title: "Daily summary",
    prompt: "Summarize the day.",
    enabled: false,
    schedule: { type: "interval" as const, everyMs: 60_000 },
    projectId: targetProjectId,
    threadId: null,
    workspaceStrategy: worktreeStrategy,
    modelSelection,
    runtimeMode: "full-access" as const,
    interactionMode: "default" as const,
  };
}

it.effect("launches a worktree request for Scratch at the root, in its own folder", () => {
  const harness = scratchHarness();
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const launched = yield* launches.launch(
      launchInput({
        command: "command:launch:scratch-worktree",
        thread: "thread:launch:scratch-worktree",
        message: "Tidy my notes",
        workspace: worktreeStrategy,
      }),
    );
    const scratch = yield* preparationSettled(launched.threadId);
    assert.equal(scratch.thread.worktreePath, "/scratch/folder-1");
    // Released past preparation; provider execution is disabled here.
    assert.equal(scratch.runs[0]?.status, "starting");
    assert.deepEqual(scratch.runs[0]?.workspacePreparation, {
      type: "existing_worktree",
      worktreePath: "/scratch/folder-1",
    });
    assert.equal(harness.runSetup.mock.calls[0]?.[0]?.worktreePath, "/scratch/folder-1");
    assert.equal(harness.createWorktree.mock.calls.length, 0);

    // A Git project still gets the worktree it asked for.
    const other = yield* launches.launch({
      ...launchInput({
        command: "command:launch:git-worktree",
        thread: "thread:launch:git-worktree",
        message: "Build the feature",
        workspace: worktreeStrategy,
      }),
      projectId: otherProjectId,
    });
    const git = yield* preparationSettled(other.threadId);
    assert.equal(git.runs[0]?.status, "starting");
    assert.equal(git.runs[0]?.workspacePreparation?.type, "worktree");
    assert.equal(git.thread.worktreePath, "/other-repo-worktrees/feature");
    assert.equal(harness.createWorktree.mock.calls[0]?.[0]?.cwd, "/other-repo");
    assert.deepEqual(harness.claimed, [launched.threadId]);
  }).pipe(Effect.provide(harness.layer));
});

it.effect("stores a Scratch scheduled task at the root and keeps worktrees elsewhere", () => {
  const harness = scratchHarness();
  return Effect.gen(function* () {
    const tasks = yield* ScheduledTasks.ScheduledTaskService;
    const scratch = yield* tasks.upsert(
      scheduledTaskInput("scheduled-task:scratch-upsert", projectId),
    );
    assert.deepEqual(scratch.task.workspaceStrategy, { type: "root" });
    const git = yield* tasks.upsert(
      scheduledTaskInput("scheduled-task:git-upsert", otherProjectId),
    );
    assert.deepEqual(git.task.workspaceStrategy, worktreeStrategy);
  }).pipe(Effect.provide(harness.layer));
});

it.effect("runs a Scratch scheduled task saved with a worktree in its own folder", () => {
  const harness = scratchHarness();
  return Effect.gen(function* () {
    const tasks = yield* ScheduledTasks.ScheduledTaskService;
    const threads = yield* ThreadManagement.ThreadManagementService;
    const sql = yield* SqlClient.SqlClient;
    const { task } = yield* tasks.upsert(
      scheduledTaskInput("scheduled-task:scratch-stored", projectId),
    );
    // Tasks saved before Scratch was coerced still hold a worktree strategy.
    yield* sql`
      UPDATE scheduled_tasks
      SET workspace_strategy_json = ${JSON.stringify(worktreeStrategy)}
      WHERE task_id = ${task.id}
    `;
    const ran = yield* tasks.runNow({ id: task.id });
    assert.equal(ran.task.lastRunStatus, "succeeded");
    const [thread] = yield* threads.listProjectThreads({ projectId, includeSubagents: false });
    assert.isDefined(thread);
    const projection = yield* preparationSettled(thread!.id);
    assert.equal(projection.runs[0]?.status, "starting");
    assert.equal(projection.thread.worktreePath, "/scratch/folder-1");
    assert.deepEqual(projection.runs[0]?.workspacePreparation, {
      type: "existing_worktree",
      worktreePath: "/scratch/folder-1",
    });
    assert.equal(harness.runSetup.mock.calls[0]?.[0]?.worktreePath, "/scratch/folder-1");
    assert.equal(harness.createWorktree.mock.calls.length, 0);
  }).pipe(Effect.provide(harness.layer));
});

it.effect.each(["stable", "upstream/release"])(
  "launches from %s with the fetched commit and remote PR base",
  (baseRef) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const git = yield* GitVcsDriver.GitVcsDriver;
      const directory = yield* fs.makeTempDirectoryScoped({ prefix: "launch-remote-base-" });
      const cwd = `${directory}/repo`;
      const remote = `${directory}/remote.git`;
      const worktreePath = `${directory}/worktree`;
      yield* fs.makeDirectory(cwd);
      const command = (at: string, args: string[]) =>
        git.execute({ operation: "launch-test", cwd: at, args });
      yield* command(cwd, ["init", "-b", "stable"]);
      yield* command(cwd, ["config", "user.name", "Test"]);
      yield* command(cwd, ["config", "user.email", "test@example.test"]);
      yield* command(cwd, ["commit", "--allow-empty", "-m", "initial"]);
      const localHead = (yield* command(cwd, ["rev-parse", "HEAD"])).stdout.trim();
      yield* command(cwd, ["init", "--bare", remote]);
      yield* command(cwd, ["remote", "add", "upstream", remote]);
      yield* command(cwd, ["push", "-u", "upstream", "stable:release"]);
      yield* command(cwd, ["commit", "--allow-empty", "-m", "remote advance"]);
      yield* command(cwd, ["push", "upstream", "stable:release"]);
      const remoteHead = (yield* command(cwd, ["rev-parse", "HEAD"])).stdout.trim();
      yield* command(cwd, ["reset", "--hard", localHead]);
      yield* command(cwd, ["update-ref", "-d", "refs/remotes/upstream/release"]);

      const setupStarted = yield* Deferred.make<void>();
      const harness = makeHarness({
        hasCommit: ({ refName }) =>
          command(cwd, ["rev-parse", "--verify", `${refName}^{commit}`]).pipe(
            Effect.as(true),
            Effect.orElseSucceed(() => false),
          ),
        git: {
          resolveWorktreeBaseRemote: (input) => git.resolveWorktreeBaseRemote({ ...input, cwd }),
          hasRefNamed: () => Effect.succeed(false),
        },
        fetchWorktreeBaseCommit: (input) => git.fetchWorktreeBaseCommit({ ...input, cwd }),
        createWorktree: (input, options) =>
          git.createWorktree({ ...input, cwd, path: worktreePath }, options),
        runSetup: () =>
          Deferred.succeed(setupStarted, undefined).pipe(
            Effect.as({ status: "no-script" as const }),
          ),
      });
      yield* Effect.gen(function* () {
        const launches = yield* ThreadLaunch.ThreadLaunchService;
        const threads = yield* ThreadManagement.ThreadManagementService;
        const workspace = {
          type: "worktree" as const,
          baseRef,
          branch: "feature",
          startFromOrigin: true,
        };
        yield* launches.checkWorktreeBase({ projectId, workspaceStrategy: workspace });
        const launched = yield* launches.launch(
          launchInput({
            command: "command:launch:remote-base",
            thread: "thread:launch:remote-base",
            workspace,
          }),
        );
        yield* Deferred.await(setupStarted);
        const projection = yield* threads.getThreadProjection(launched.threadId);
        assert.equal(projection.thread.worktreePath, worktreePath);
        assert.equal(
          (yield* command(worktreePath, ["rev-parse", "HEAD"])).stdout.trim(),
          remoteHead,
        );
        const preview = yield* git.getReviewDiffPreview({ cwd: worktreePath });
        const comparisonBase = preview.sources.find(
          (source) => source.kind === "branch-range",
        )!.baseRef;
        assert.equal(
          (yield* command(worktreePath, ["rev-parse", `${comparisonBase}^{commit}`])).stdout.trim(),
          remoteHead,
        );
      }).pipe(Effect.provide(harness.layer));
    }).pipe(
      Effect.provide(
        GitVcsDriver.layer.pipe(
          Layer.provide(ServerConfig.layerTest(process.cwd(), { prefix: "launch-remote-git-" })),
          Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeCrypto.layer)),
        ),
      ),
    ),
);

it.effect("fetches the origin base from the remote it already resolved", () => {
  let fetchInput: Deferred.Deferred<unknown> | null = null;
  const harness = makeHarness({
    fetchWorktreeBaseCommit: (input) => Deferred.succeed(fetchInput!, input).pipe(Effect.as(null)),
  });
  return Effect.gen(function* () {
    fetchInput = yield* Deferred.make<unknown>();
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    yield* launches.launch(
      launchInput({
        command: "command:launch:resolved-remote",
        thread: "thread:launch:resolved-remote",
        workspace: { type: "worktree", baseRef: "main", startFromOrigin: true },
      }),
    );
    assert.deepEqual(yield* Deferred.await(fetchInput), {
      cwd: project.workspaceRoot,
      refName: "main",
      remote: { remoteName: "origin", branchName: "main" },
    });
  }).pipe(Effect.provide(harness.layer));
});

it.effect("shows the fetch diagnosis when preparing a worktree from origin fails", () => {
  const detail =
    "Git could not authenticate with the remote. Check Git credentials or SSH access on the server, then retry.";
  const harness = makeHarness({
    fetchWorktreeBaseCommit: () =>
      Effect.fail(
        new GitCommandError({
          operation: "GitVcsDriver.fetchRemote",
          command: "git",
          cwd: project.workspaceRoot,
          detail,
          exitCode: 128,
        }),
      ),
  });
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const threads = yield* ThreadManagement.ThreadManagementService;
    const launched = yield* launches.launch(
      launchInput({
        command: "command:launch:fetch-failure",
        thread: "thread:launch:fetch-failure",
        message: "Start from origin",
        workspace: { type: "worktree", baseRef: "main", startFromOrigin: true },
      }),
    );
    yield* threads.streamStoredEventsFrom({ threadId: launched.threadId }).pipe(
      Stream.filter(
        (stored) => stored.event.type === "run.updated" && stored.event.payload.status === "failed",
      ),
      Stream.runHead,
    );
    const projection = yield* threads.getThreadProjection(launched.threadId);
    assert.equal(projection.messages[0]?.text, "Start from origin");
    assert.equal(projection.runs[0]?.status, "failed");
    assert.equal(projection.thread.worktreePath, null);
    assert.equal(
      projection.turnItems.find((item) => item.type === "command_execution")?.status,
      "failed",
    );
    assert.include(
      projection.turnItems.find((item) => item.type === "error")?.failure.message ?? "",
      detail,
    );
    assert.equal(harness.createWorktree.mock.calls.length, 0);
    assert.equal(harness.runSetup.mock.calls.length, 0);
  }).pipe(Effect.provide(harness.layer));
});

it.effect("rejects a preparation retry after the project disables its provider", () => {
  let fetchAttempts = 0;
  const harness = makeHarness({
    fetchWorktreeBaseCommit: () =>
      fetchAttempts++ === 0
        ? Effect.fail(
            new GitCommandError({
              operation: "GitVcsDriver.fetchRemote",
              command: "git",
              cwd: project.workspaceRoot,
              detail: "Git could not reach the remote.",
              exitCode: 128,
            }),
          )
        : Effect.succeed({ commitSha: "remote-main-sha", remoteRefName: "origin/main" }),
  });
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const settings = yield* ServerSettings.ServerSettingsService;
    const threads = yield* ThreadManagement.ThreadManagementService;
    const launched = yield* launches.launch(
      launchInput({
        command: "command:launch:disabled-preparation-retry",
        thread: "thread:launch:disabled-preparation-retry",
        message: "Start from origin",
        workspace: { type: "worktree", baseRef: "main", startFromOrigin: true },
      }),
    );
    yield* preparationSettled(launched.threadId);
    yield* settings.updateSettings({
      projectSettingsOverrides: {
        [projectId]: { providerInstances: { [modelSelection.instanceId]: { enabled: false } } },
      },
    });

    const error = yield* launches
      .retryPreparation({
        commandId: CommandId.make("command:launch:disabled-preparation-retry:retry"),
        threadId: launched.threadId,
        runId: launched.projection.runs[0]!.id,
      })
      .pipe(Effect.flip);

    assert.equal(error._tag, "ThreadManagementProviderInstanceDisabledError");
    assert.equal((yield* threads.getThreadProjection(launched.threadId)).runs[0]?.status, "failed");
    assert.equal(fetchAttempts, 1);
  }).pipe(Effect.provide(harness.layer));
});

it.effect("does not release a prepared run after the project disables its provider", () => {
  return Effect.gen(function* () {
    const setupEntered = yield* Deferred.make<void>();
    const allowSetup = yield* Deferred.make<void>();
    const harness = makeHarness({
      runSetup: () =>
        Deferred.succeed(setupEntered, undefined).pipe(
          Effect.andThen(Deferred.await(allowSetup)),
          Effect.as({ status: "no-script" as const }),
        ),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const settings = yield* ServerSettings.ServerSettingsService;
      const launched = yield* launches.launch(
        launchInput({
          command: "command:launch:disable-during-preparation",
          thread: "thread:launch:disable-during-preparation",
          message: "Prepare a worktree",
          workspace: { type: "worktree", baseRef: "main" },
        }),
      );
      yield* Deferred.await(setupEntered);
      yield* settings.updateSettings({
        projectSettingsOverrides: {
          [projectId]: { providerInstances: { [modelSelection.instanceId]: { enabled: false } } },
        },
      });
      yield* Deferred.succeed(allowSetup, undefined);
      const projection = yield* preparationSettled(launched.threadId);
      assert.equal(projection.runs[0]?.status, "failed");
      const effects = yield* (yield* EffectOutbox.EffectOutboxV2).listByCommandId(
        CommandId.make("command:launch:disable-during-preparation:release"),
      );
      assert.isFalse(
        effects.some(
          (effect) =>
            effect.request.type === "provider-turn.start" &&
            effect.request.runId === launched.projection.runs[0]?.id,
        ),
      );
    }).pipe(Effect.provide(harness.layer));
  });
});

it.effect.each(["fails", "is interrupted"] as const)(
  "holds a message queued during setup when the workspace preparation %s",
  (ending) =>
    Effect.gen(function* () {
      const fetchEntered = yield* Deferred.make<void>();
      const allowFetch = yield* Deferred.make<void>();
      let fetchFailures = 1;
      const harness = makeHarness({
        fetchWorktreeBaseCommit: () =>
          fetchFailures-- <= 0
            ? Effect.succeed({ commitSha: "remote-main-sha", remoteRefName: "origin/main" })
            : Deferred.succeed(fetchEntered, undefined).pipe(
                Effect.andThen(Deferred.await(allowFetch)),
                Effect.andThen(
                  Effect.fail(
                    new GitCommandError({
                      operation: "GitVcsDriver.fetchRemote",
                      command: "git",
                      cwd: project.workspaceRoot,
                      detail: "Git could not reach the remote.",
                      exitCode: 128,
                    }),
                  ),
                ),
              ),
      });
      yield* Effect.gen(function* () {
        const launches = yield* ThreadLaunch.ThreadLaunchService;
        const threads = yield* ThreadManagement.ThreadManagementService;
        const launched = yield* launches.launch(
          launchInput({
            command: `command:launch:queued-setup-${ending}`,
            thread: `thread:launch:queued-setup-${ending}`,
            message: "First message",
            workspace: { type: "worktree", baseRef: "main", startFromOrigin: true },
          }),
        );
        yield* Deferred.await(fetchEntered);
        const queued = yield* threads.sendToThread({
          projectId,
          commandId: CommandId.make(`command:launch:queued-setup-${ending}:follow-up`),
          threadId: launched.threadId,
          messageId: MessageId.make(`message:launch:queued-setup-${ending}:follow-up`),
          text: "Sent during setup",
          attachments: [],
          mode: "queue",
          createdBy: "user",
          creationSource: "web",
        });
        assert.equal(queued.delivery, "queued");
        if (ending === "fails") {
          yield* Deferred.succeed(allowFetch, undefined);
        } else {
          yield* threads.dispatch({
            type: "run.interrupt",
            commandId: CommandId.make("command:launch:queued-setup-interrupt"),
            threadId: launched.threadId,
            runId: launched.projection.runs[0]!.id,
          });
        }

        yield* threads.streamStoredEventsFrom({ threadId: launched.threadId }).pipe(
          Stream.filter(
            (stored) =>
              stored.event.type === "run.updated" && stored.event.payload.queueHeld === true,
          ),
          Stream.runHead,
        );
        const projection = yield* threads.getThreadProjection(launched.threadId);
        assert.equal(projection.runs.at(-1)?.status, "queued");
        assert.equal(projection.thread.worktreePath, null);

        if (ending === "fails") {
          yield* launches.retryPreparation({
            commandId: CommandId.make("command:launch:queued-setup-retry"),
            threadId: launched.threadId,
            runId: launched.projection.runs[0]!.id,
          });
          const retried = yield* threads.getThreadProjection(launched.threadId);
          assert.equal(retried.runs.at(-1)?.queueHeld, false);
        }
      }).pipe(Effect.provide(harness.layer));
    }),
);

it.effect.each(["failed", "interrupted"] as const)(
  "holds a message queued during setup that arrives after the setup %s",
  (ending) => {
    let fetchEntered: Deferred.Deferred<void> | null = null;
    const harness = makeHarness({
      fetchWorktreeBaseCommit: () =>
        ending === "interrupted"
          ? Deferred.succeed(fetchEntered!, undefined).pipe(Effect.andThen(Effect.never))
          : Effect.fail(
              new GitCommandError({
                operation: "GitVcsDriver.fetchRemote",
                command: "git",
                cwd: project.workspaceRoot,
                detail: "Git could not reach the remote.",
                exitCode: 128,
              }),
            ),
    });
    return Effect.gen(function* () {
      fetchEntered = yield* Deferred.make<void>();
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const launched = yield* launches.launch(
        launchInput({
          command: `command:launch:late-queued-follow-up-${ending}`,
          thread: `thread:launch:late-queued-follow-up-${ending}`,
          message: "First message",
          workspace: { type: "worktree", baseRef: "main", startFromOrigin: true },
        }),
      );
      if (ending === "interrupted") {
        yield* Deferred.await(fetchEntered);
        yield* threads.dispatch({
          type: "run.interrupt",
          commandId: CommandId.make("command:launch:late-queued-follow-up:interrupt"),
          threadId: launched.threadId,
          runId: launched.projection.runs[0]!.id,
        });
      }
      yield* threads.streamStoredEventsFrom({ threadId: launched.threadId }).pipe(
        Stream.filter(
          (stored) => stored.event.type === "run.updated" && stored.event.payload.status === ending,
        ),
        Stream.runHead,
      );

      const queued = yield* threads.sendToThread({
        projectId,
        commandId: CommandId.make(`command:launch:late-queued-follow-up-${ending}:send`),
        threadId: launched.threadId,
        messageId: MessageId.make(`message:launch:late-queued-follow-up-${ending}:send`),
        text: "Sent during setup",
        attachments: [],
        mode: "queue",
        createdBy: "user",
        creationSource: "web",
      });
      assert.equal(queued.delivery, "queued");
      const projection = yield* threads.getThreadProjection(launched.threadId);
      const held = projection.runs.at(-1)!;
      assert.equal(held.status, "queued");
      assert.equal(held.queueHeld, true);

      // A message the user starts does not release it: the held message would
      // run after it in the project checkout.
      yield* threads.sendToThread({
        projectId,
        commandId: CommandId.make(`command:launch:late-queued-follow-up-${ending}:start`),
        threadId: launched.threadId,
        messageId: MessageId.make(`message:launch:late-queued-follow-up-${ending}:start`),
        text: "Sent after setup",
        attachments: [],
        mode: "auto",
        createdBy: "user",
        creationSource: "web",
      });
      yield* threads.dispatch({
        type: "message.dispatch",
        commandId: CommandId.make(`command:launch:late-queued-follow-up-${ending}:wake`),
        threadId: launched.threadId,
        messageId: MessageId.make(`message:launch:late-queued-follow-up-${ending}:wake`),
        text: "Background task completed.",
        attachments: [],
        dispatchMode: { type: "queue_after_active" },
        createdBy: "agent",
        creationSource: "provider",
      });
      const wake = (yield* threads.getThreadProjection(launched.threadId)).runs.at(-1)!;
      assert.equal(wake.status, "queued");
      assert.isTrue(wake.queueHeld);

      // Nor does the next one, though the run that message started is now the
      // latest and carries no workspace preparation.
      yield* threads.sendToThread({
        projectId,
        commandId: CommandId.make(`command:launch:late-queued-follow-up-${ending}:again`),
        threadId: launched.threadId,
        messageId: MessageId.make(`message:launch:late-queued-follow-up-${ending}:again`),
        text: "Sent after that",
        attachments: [],
        mode: "auto",
        createdBy: "user",
        creationSource: "web",
      });
      const after = yield* threads.getThreadProjection(launched.threadId);
      assert.isTrue(after.runs.find((run) => run.id === held.id)?.queueHeld);
    }).pipe(Effect.provide(harness.layer));
  },
);

it.effect.each(["provided", "allocated", "retained legacy"] as const)(
  "replays a server-allocated launch with %s message IDs",
  (messageIds) =>
    Effect.gen(function* () {
      const setupEntered = yield* Deferred.make<void>();
      const allowSetup = yield* Deferred.make<void>();
      const harness = makeHarness({
        runSetup: () =>
          Deferred.succeed(setupEntered, undefined).pipe(
            Effect.andThen(Deferred.await(allowSetup)),
            Effect.as({ status: "no-script" as const }),
          ),
      });
      yield* Effect.gen(function* () {
        const launches = yield* ThreadLaunch.ThreadLaunchService;
        const threads = yield* ThreadManagement.ThreadManagementService;
        const { threadId: _unusedThreadId, ...base } = launchInput({
          command: "command:launch:allocated-retry",
          thread: "unused",
          message: "Only once",
          workspace: { type: "worktree", baseRef: "main" },
        });
        const { messageId: _unusedMessageId, ...allocatedMessage } = base.initialMessage!;
        const rest = {
          ...base,
          initialMessage: messageIds === "provided" ? base.initialMessage! : allocatedMessage,
        };
        const first = yield* launches.launch(rest);
        yield* Deferred.await(setupEntered);
        const retry = yield* launches.launch(rest);
        assert.equal(first.threadId, retry.threadId);
        assert.isFalse(first.resumed);
        assert.isTrue(retry.resumed);
        // Clients drop their pending copy once the thread reaches the message's commit.
        assert.isNumber(first.sequence);
        assert.equal(retry.sequence, first.sequence);
        assert.equal(harness.runSetup.mock.calls.length, 1);
        assert.equal(retry.projection.messages.length, 1);
        assert.equal(retry.projection.runs.length, 1);
        assert.equal(retry.projection.messages[0]?.id, first.projection.messages[0]?.id);
        assert.equal(retry.projection.runs[0]?.id, first.projection.runs[0]?.id);
        yield* Deferred.succeed(allowSetup, undefined);
        yield* threads.streamStoredEventsFrom({ threadId: first.threadId }).pipe(
          Stream.filter(
            (stored) =>
              stored.commandId === CommandId.make(`${rest.commandId}:release`) &&
              stored.event.type === "run.updated",
          ),
          Stream.runHead,
        );
        const settled = yield* launches.launch(rest);
        assert.equal(settled.threadId, first.threadId);
        assert.isTrue(settled.resumed);
        assert.equal(settled.projection.messages[0]?.id, first.projection.messages[0]?.id);
        assert.equal(settled.projection.runs[0]?.id, first.projection.runs[0]?.id);
        assert.equal(harness.runSetup.mock.calls.length, 1);
        const sql = yield* SqlClient.SqlClient;
        const maintenance = yield* ProjectionMaintenance.ProjectionMaintenanceV2;
        const messageCommandId = CommandId.make(`${rest.commandId}:initial-message`);
        const originalRunId = first.projection.runs[0]!.id;
        const originalMessageId = first.projection.messages[0]!.id;
        if (messageIds === "retained legacy") {
          const retainedEvents = yield* sql`SELECT sequence, event_id, command_id, aggregate_kind,
            stream_id, event_type, metadata_json, json_remove(payload_json, '$.originCommandId') AS payload_json
            FROM orchestration_events WHERE stream_id = ${first.threadId}
              AND event_type IN ('run.created', 'run.updated')
              AND json_extract(payload_json, '$.id') = ${originalRunId} ORDER BY sequence`;
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_remove(payload_json, '$.originCommandId')
            WHERE run_id = ${originalRunId}`;
          yield* sql`UPDATE orchestration_events
            SET payload_json = json_remove(payload_json, '$.originCommandId')
            WHERE stream_id = ${first.threadId} AND event_type IN ('run.created', 'run.updated')
              AND json_extract(payload_json, '$.id') = ${originalRunId}`;
          assert.deepEqual(
            yield* sql`SELECT sequence, event_id, command_id, aggregate_kind,
              stream_id, event_type, metadata_json, payload_json FROM orchestration_events
              WHERE stream_id = ${first.threadId} AND event_type IN ('run.created', 'run.updated')
                AND json_extract(payload_json, '$.id') = ${originalRunId} ORDER BY sequence`,
            retainedEvents,
          );
          assert.deepEqual(
            yield* sql`SELECT command_id, stream_id, json_extract(payload_json, '$.id') AS run_id,
              json_extract(payload_json, '$.threadId') AS thread_id,
              json_extract(payload_json, '$.userMessageId') AS message_id
              FROM orchestration_events WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`,
            [
              {
                command_id: messageCommandId,
                stream_id: first.threadId,
                run_id: originalRunId,
                thread_id: first.threadId,
                message_id: originalMessageId,
              },
            ],
          );
          assert.deepEqual(
            yield* sql`SELECT aggregate_id, command_type, status, result_sequence
              FROM orchestration_command_receipts WHERE command_id = ${messageCommandId}`,
            [
              {
                aggregate_id: first.threadId,
                command_type: "message.dispatch",
                status: "accepted",
                result_sequence: first.sequence,
              },
            ],
          );
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_v2_projection_runs
              WHERE run_id = ${originalRunId} AND json_type(payload_json, '$.originCommandId') IS NOT NULL`,
          );
          const legacy = yield* threads.getThreadProjection(first.threadId);
          assert.equal(legacy.runs[0]?.id, originalRunId);
          assert.equal(legacy.runs[0]?.threadId, first.threadId);
          assert.equal(legacy.runs[0]?.userMessageId, originalMessageId);
          assert.equal(legacy.messages[0]?.id, originalMessageId);
          assert.equal(legacy.messages[0]?.runId, originalRunId);
          const effectsBefore =
            yield* sql`SELECT effect_id FROM orchestration_v2_effect_outbox ORDER BY effect_id`;
          const changed = {
            ...rest,
            workspaceStrategy: { type: "worktree" as const, baseRef: "unaccepted-base" },
            initialMessage: {
              messageId: MessageId.make("message:legacy:unaccepted-replacement"),
              text: "Unaccepted replacement for the legacy launch",
              attachments: [],
            },
          };
          for (const recovered of yield* Effect.all(
            [launches.launch(rest), launches.launch(changed), launches.launch(changed)],
            { concurrency: "unbounded" },
          )) {
            assert.equal(recovered.threadId, first.threadId);
            assert.isTrue(recovered.resumed);
            assert.equal(recovered.sequence, first.sequence);
            assert.deepEqual(recovered.projection.runs, legacy.runs);
            assert.deepEqual(recovered.projection.messages, legacy.messages);
          }
          assert.equal(harness.runSetup.mock.calls.length, 1);
          assert.equal(harness.createWorktree.mock.calls.length, 1);
          assert.deepEqual(
            yield* sql`SELECT effect_id FROM orchestration_v2_effect_outbox ORDER BY effect_id`,
            effectsBefore,
          );
          return;
        }
        yield* threads.dispatch({
          type: "run.interrupt",
          commandId: CommandId.make("command:launch:interrupt-original"),
          threadId: first.threadId,
          runId: originalRunId,
        });
        const laterCommandId = CommandId.make("command:launch:later-message");
        const laterMessageId = MessageId.make("message:launch:later-message");
        yield* threads.dispatch({
          type: "message.dispatch",
          commandId: laterCommandId,
          threadId: first.threadId,
          messageId: laterMessageId,
          text: "Later accepted message",
          attachments: [],
          modelSelection,
          dispatchMode: {
            type: "defer_start",
            workspaceStrategy: { type: "worktree", baseRef: "later-base" },
          },
          createdBy: "user",
          creationSource: "web",
        });
        const before = yield* threads.getThreadProjection(first.threadId);
        assert.lengthOf(before.runs, 2);
        assert.equal(before.runs[0]?.originCommandId, messageCommandId);
        assert.equal(before.runs[1]?.originCommandId, laterCommandId);
        assert.equal(before.runs[1]?.status, "preparing");
        const changed = {
          ...rest,
          workspaceStrategy: { type: "worktree" as const, baseRef: "unaccepted-base" },
          initialMessage: {
            messageId: laterMessageId,
            text: "Unaccepted replacement for the original launch",
            attachments: [],
          },
        };
        for (const replay of yield* Effect.all([launches.launch(rest), launches.launch(changed)], {
          concurrency: "unbounded",
        })) {
          assert.isTrue(replay.resumed);
          assert.equal(replay.sequence, first.sequence);
          assert.deepEqual(replay.projection.messages, before.messages);
          assert.deepEqual(replay.projection.runs, before.runs);
        }
        assert.lengthOf(
          yield* sql`SELECT 1 FROM orchestration_events
          WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`,
          1,
        );
        const effectsBefore =
          yield* sql`SELECT effect_id FROM orchestration_v2_effect_outbox ORDER BY effect_id`;
        assert.equal((yield* maintenance.pruneEventStore()).deletedEventCount, 0);
        yield* TestClock.adjust("1 day");
        assert.isAbove((yield* maintenance.pruneEventStore()).deletedEventCount, 0);
        assert.isEmpty(
          yield* sql`SELECT 1 FROM orchestration_events
          WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`,
        );
        assert.deepEqual(
          yield* sql`SELECT aggregate_id, command_type, status, result_sequence
          FROM orchestration_command_receipts WHERE command_id = ${messageCommandId}`,
          [
            {
              aggregate_id: first.threadId,
              command_type: "message.dispatch",
              status: "accepted",
              result_sequence: first.sequence,
            },
          ],
        );
        const retained = yield* threads.getThreadProjection(first.threadId);
        assert.equal(
          retained.messages.find((message) => message.id === originalMessageId)?.runId,
          originalRunId,
        );
        assert.equal(
          retained.runs.find((run) => run.id === originalRunId)?.originCommandId,
          messageCommandId,
        );
        assert.equal(
          retained.runs.find((run) => run.originCommandId === laterCommandId)?.status,
          "preparing",
        );
        for (const compacted of yield* Effect.all(
          [launches.launch(rest), launches.launch(changed), launches.launch(changed)],
          { concurrency: "unbounded" },
        )) {
          assert.equal(compacted.threadId, first.threadId);
          assert.isTrue(compacted.resumed);
          assert.equal(compacted.sequence, first.sequence);
          assert.deepEqual(compacted.projection.messages, retained.messages);
          assert.deepEqual(compacted.projection.runs, retained.runs);
        }
        assert.equal(harness.runSetup.mock.calls.length, 1);
        assert.equal(harness.createWorktree.mock.calls.length, 1);
        assert.deepEqual(
          yield* sql`SELECT effect_id FROM orchestration_v2_effect_outbox ORDER BY effect_id`,
          effectsBefore,
        );
      }).pipe(Effect.provide(ProjectionMaintenance.layer.pipe(Layer.provideMerge(harness.layer))));
    }),
);

it.effect.each(
  (
    [
      ["the project disables the instance", true],
      ["project adoption", true],
      ["adoption after event retention", true],
      ["adoption after deleting its original project", true],
      ["adoption after deleting its original project and event retention", true],
      ["adoption after deleting its original project without creation evidence", false],
      ["adoption after deleting its original project with conflicting creation evidence", false],
      ["deleting the current project", false],
      ["adoption without run origin", true],
      ["adoption without retained run evidence", false],
      ["adoption without an initial message", true],
      ["adoption before the first message", false],
      ["refused adoption during preparation", true],
      ["adoption before a later preparing run", true],
      ["adoption with an omitted thread ID", false],
      ["adoption of a reused thread", false],
      ["adoption without creation evidence", false],
      ["adoption with multiple creation records", false],
      ["adoption with another creation thread", false],
      ["adoption with another creation payload ID", false],
      ["adoption with another creation project", false],
      ["adoption with creation beyond its receipt", false],
      ["adoption with another requested thread", false],
      ["adoption with the current project input", false],
    ] as const
  ).map(([change, accepted]) => ({ change, accepted })),
)("replays an accepted launch after $change", ({ change, accepted }) => {
  return Effect.gen(function* () {
    const preparing = change === "refused adoption during preparation";
    const deleteOriginalProject = change.startsWith("adoption after deleting its original project");
    const deleteCurrentProject = change === "deleting the current project";
    const setupStarted = yield* Deferred.make<Fiber.Fiber<unknown, unknown>>();
    const harness = makeHarness({
      persistedProjects: deleteOriginalProject || deleteCurrentProject,
      runSetup: () =>
        Effect.fiber.pipe(
          Effect.tap((fiber) => Deferred.succeed(setupStarted, fiber)),
          Effect.andThen(
            preparing ? Effect.never : Effect.succeed({ status: "no-script" as const }),
          ),
        ),
    });
    return yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const projects = yield* ProjectService.ProjectService;
      const settings = yield* ServerSettings.ServerSettingsService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      if (deleteOriginalProject || deleteCurrentProject) {
        yield* projects.create({
          commandId: CommandId.make("command:launch:original-project"),
          projectId,
          title: project.title,
          workspaceRoot: project.workspaceRoot,
        });
      }
      const noMessage =
        change === "adoption without an initial message" ||
        change === "adoption before the first message";
      const reused = change === "adoption of a reused thread";
      const { threadId: requestedThreadId, ...base } = launchInput({
        command: "command:launch:retry-after-disable",
        thread: "thread:launch:retry-after-disable",
        ...(noMessage ? {} : { message: "Hello" }),
        ...(change !== "the project disables the instance"
          ? {
              workspace: {
                type: "existing_worktree" as const,
                worktreePath: otherProject.workspaceRoot,
              },
            }
          : {}),
      });
      const input = {
        ...base,
        ...(change === "adoption with an omitted thread ID" ? {} : { threadId: requestedThreadId }),
        ...(reused ? { reuseExistingThread: true } : {}),
      };
      if (reused) {
        yield* threads.dispatch({
          type: "thread.create",
          commandId: CommandId.make("command:launch:empty-before-reuse"),
          threadId: requestedThreadId,
          projectId,
          title: input.title,
          modelSelection,
          runtimeMode: input.runtimeMode,
          interactionMode: input.interactionMode,
          branch: null,
          worktreePath: otherProject.workspaceRoot,
          createdBy: "user",
          creationSource: "web",
        });
      }
      const first = yield* launches.launch(input);

      if (change !== "the project disables the instance") {
        const eventSink = yield* EventSink.EventSinkV2;
        const sql = yield* SqlClient.SqlClient;
        if (preparing || noMessage) {
          const setupFiber = yield* Deferred.await(setupStarted);
          if (noMessage) {
            const preparationExit = yield* Fiber.await(setupFiber);
            assert.isTrue(Exit.isSuccess(preparationExit));
          }
        } else {
          yield* preparationSettled(first.threadId);
        }
        const settled = yield* threads.getThreadProjection(first.threadId);
        const runId = settled.runs[0]?.id;
        const messageCommandId = CommandId.make(`${input.commandId}:initial-message`);
        const receipts = yield* sql`SELECT * FROM orchestration_command_receipts
        WHERE command_id IN (${input.commandId}, ${messageCommandId}) ORDER BY command_id`;
        const creation =
          yield* sql`SELECT sequence, event_id, command_id, stream_id, event_type, payload_json, metadata_json
        FROM orchestration_events WHERE command_id IN (${input.commandId}, ${messageCommandId})
          AND event_type IN ('thread.created', 'run.created') ORDER BY sequence`;
        if (input.threadId !== undefined) assert.equal(first.threadId, input.threadId);
        assert.lengthOf(receipts, noMessage ? 1 : 2);
        for (const receipt of receipts) {
          assert.equal(receipt.status, "accepted");
          assert.equal(receipt.aggregate_id, first.threadId);
        }
        assert.deepEqual(receipts.map((receipt) => receipt.command_type).sort(), [
          ...(noMessage ? [] : ["message.dispatch"]),
          reused ? "thread.metadata.update" : "thread.create",
        ]);
        assert.lengthOf(creation, (reused ? 0 : 1) + (noMessage ? 0 : 1));
        assert.equal(first.projection.runs[0]?.id, runId);
        assert.equal(settled.thread.projectId, input.projectId);
        assert.equal(settled.thread.worktreePath, otherProject.workspaceRoot);
        const now = yield* DateTime.now;
        const at = DateTime.formatIso(now);
        const createProjectId = CommandId.make("project:launch-adoption:create");
        yield* eventSink.commitProjectCommand({
          commandId: createProjectId,
          projectId: otherProjectId,
          commandType: "project.create",
          acceptedAt: now,
          event: {
            eventId: EventId.make("event:launch-adoption:create"),
            aggregateKind: "project",
            aggregateId: otherProjectId,
            commandId: createProjectId,
            occurredAt: at,
            causationEventId: null,
            correlationId: null,
            metadata: {},
            type: "project.created",
            payload: {
              projectId: otherProjectId,
              title: otherProject.title,
              workspaceRoot: otherProject.workspaceRoot,
              defaultModelSelection: modelSelection,
              scripts: [],
              createdAt: at,
              updatedAt: at,
            },
          },
        });
        const adoption = {
          type: "thread.project.adopt-folder" as const,
          commandId: CommandId.make("command:launch:adopt-folder"),
          threadId: first.threadId,
          projectId: otherProjectId,
        };
        if (preparing) {
          assert.equal(settled.runs[0]?.status, "preparing");
          const before = yield* sql`SELECT 'event' AS kind, event_id AS id FROM orchestration_events
            UNION ALL SELECT 'effect' AS kind, effect_id AS id FROM orchestration_v2_effect_outbox ORDER BY kind, id`;
          const refused = yield* threads.dispatch(adoption).pipe(Effect.result);
          assert.ok(Result.isFailure(refused));
          const replay = yield* launches.launch(input);
          assert.isTrue(replay.resumed);
          assert.equal(replay.projection.thread.projectId, projectId);
          assert.deepEqual(replay.projection.runs, settled.runs);
          assert.deepEqual(
            yield* sql`SELECT 'event' AS kind, event_id AS id FROM orchestration_events
              UNION ALL SELECT 'effect' AS kind, effect_id AS id FROM orchestration_v2_effect_outbox ORDER BY kind, id`,
            before,
          );
          return;
        }
        if (runId !== undefined) {
          yield* threads.dispatch({
            type: "run.interrupt",
            commandId: CommandId.make("command:launch:stop-before-adoption"),
            threadId: first.threadId,
            runId,
          });
          const stopped = yield* threads.getThreadProjection(first.threadId);
          assert.equal(stopped.runs.find((run) => run.id === runId)?.status, "interrupted");
        }
        if (!deleteCurrentProject) yield* threads.dispatch(adoption);
        const adopted = yield* threads.getThreadProjection(first.threadId);
        assert.equal(adopted.thread.projectId, deleteCurrentProject ? projectId : otherProjectId);
        assert.deepEqual(adopted.thread.lineage, settled.thread.lineage);
        assert.deepEqual(adopted.thread.forkedFrom, settled.thread.forkedFrom);
        assert.deepEqual(
          yield* sql`SELECT * FROM orchestration_command_receipts
          WHERE command_id IN (${input.commandId}, ${messageCommandId}) ORDER BY command_id`,
          receipts,
        );
        assert.deepEqual(
          yield* sql`SELECT sequence, event_id, command_id, stream_id, event_type, payload_json, metadata_json
          FROM orchestration_events WHERE command_id IN (${input.commandId}, ${messageCommandId})
            AND event_type IN ('thread.created', 'run.created') ORDER BY sequence`,
          creation,
        );
        if (deleteOriginalProject || deleteCurrentProject) {
          const deleted = yield* projects.delete({
            commandId: CommandId.make("command:launch:delete-original-project"),
            projectId,
            force: deleteCurrentProject,
          });
          assert.isNotNull(deleted.deletedAt);
          assert.isTrue(Option.isNone(yield* projects.getById(projectId)));
          assert.isTrue(
            Option.isSome(yield* projects.getById(projectId, { includeDeleted: true })),
          );
          const afterDelete = yield* threads.getThreadProjection(first.threadId);
          if (deleteCurrentProject) {
            assert.isNotNull(afterDelete.thread.deletedAt);
            assert.isNull(yield* threads.getThreadShell(first.threadId));
          } else {
            assert.deepEqual(afterDelete.thread, adopted.thread);
          }
          assert.deepEqual(afterDelete.runs, adopted.runs);
          const freshInput = {
            ...input,
            commandId: CommandId.make("command:launch:new-in-deleted-project"),
            threadId: ThreadId.make("thread:launch:new-in-deleted-project"),
          };
          const fresh = yield* launches.launch(freshInput).pipe(Effect.result);
          assert.ok(Result.isFailure(fresh));
          assert.equal(fresh.failure._tag, "ThreadLaunchError");
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_command_receipts WHERE command_id = ${freshInput.commandId}`,
          );
        }
        const laterMessageId = MessageId.make("message:launch:later-after-adoption");
        if (change === "adoption before a later preparing run") {
          yield* threads.dispatch({
            type: "message.dispatch",
            commandId: CommandId.make("command:launch:later-after-adoption"),
            threadId: first.threadId,
            messageId: laterMessageId,
            text: "A later accepted message",
            attachments: [],
            dispatchMode: {
              type: "defer_start",
              workspaceStrategy: { type: "worktree", baseRef: "later-base" },
            },
            createdBy: "user",
            creationSource: "web",
          });
          const later = (yield* threads.getThreadProjection(first.threadId)).runs.find(
            (run) => run.userMessageId === laterMessageId,
          );
          assert.isDefined(later);
          assert.notEqual(later!.id, runId);
          assert.equal(later!.status, "preparing");
        }
        if (
          change === "adoption without run origin" ||
          change === "adoption without retained run evidence"
        ) {
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_remove(payload_json, '$.originCommandId') WHERE run_id = ${runId!}`;
          yield* sql`UPDATE orchestration_events
            SET payload_json = json_remove(payload_json, '$.originCommandId')
            WHERE stream_id = ${first.threadId} AND event_type IN ('run.created', 'run.updated')
              AND json_extract(payload_json, '$.id') = ${runId!}`;
        }
        if (
          change === "adoption after event retention" ||
          change === "adoption after deleting its original project and event retention" ||
          change === "adoption without retained run evidence" ||
          change === "adoption before a later preparing run"
        ) {
          const maintenance = yield* ProjectionMaintenance.ProjectionMaintenanceV2;
          assert.equal((yield* maintenance.pruneEventStore()).deletedEventCount, 0);
          yield* TestClock.adjust("1 day");
          assert.isAbove((yield* maintenance.pruneEventStore()).deletedEventCount, 0);
          assert.lengthOf(
            yield* sql`SELECT 1 FROM orchestration_events
              WHERE command_id = ${input.commandId} AND event_type = 'thread.created'`,
            1,
          );
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_events
              WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`,
          );
        }
        switch (change) {
          case "adoption without creation evidence":
          case "adoption after deleting its original project without creation evidence":
            yield* sql`DELETE FROM orchestration_events
              WHERE command_id = ${input.commandId} AND event_type = 'thread.created'`;
            break;
          case "adoption with multiple creation records":
            yield* sql`UPDATE orchestration_events
              SET command_id = ${input.commandId}, event_type = 'thread.created',
                payload_json = json_set(payload_json, '$.projectId', ${input.projectId})
              WHERE command_id = ${adoption.commandId} AND event_type = 'thread.metadata-updated'`;
            assert.lengthOf(
              yield* sql`SELECT 1 FROM orchestration_events
                WHERE command_id = ${input.commandId} AND event_type = 'thread.created'`,
              2,
            );
            break;
          case "adoption with another creation thread":
            yield* sql`UPDATE orchestration_events SET stream_id = 'thread:launch:unrelated'
              WHERE command_id = ${input.commandId} AND event_type = 'thread.created'`;
            break;
          case "adoption with another creation payload ID":
            yield* sql`UPDATE orchestration_events
              SET payload_json = json_set(payload_json, '$.id', 'thread:launch:unrelated')
              WHERE command_id = ${input.commandId} AND event_type = 'thread.created'`;
            break;
          case "adoption with another creation project":
          case "adoption after deleting its original project with conflicting creation evidence":
            yield* sql`UPDATE orchestration_events
              SET payload_json = json_set(payload_json, '$.projectId', ${otherProjectId})
              WHERE command_id = ${input.commandId} AND event_type = 'thread.created'`;
            break;
          case "adoption with creation beyond its receipt":
            yield* sql`UPDATE orchestration_command_receipts SET result_sequence = 0
              WHERE command_id = ${input.commandId}`;
            break;
        }
        const retained = yield* threads.getThreadProjection(first.threadId);
        if (
          change === "adoption without run origin" ||
          change === "adoption without retained run evidence"
        ) {
          assert.isUndefined(retained.runs.find((run) => run.id === runId)?.originCommandId);
        }
        const before = yield* sql`SELECT 'event' AS kind, event_id AS id FROM orchestration_events
        UNION ALL SELECT 'effect' AS kind, effect_id AS id FROM orchestration_v2_effect_outbox ORDER BY kind, id`;
        const setupCalls = harness.runSetup.mock.calls.length;
        const worktreeCalls = harness.createWorktree.mock.calls.length;
        const retryInput = {
          ...input,
          ...(change === "adoption before the first message"
            ? {
                initialMessage: {
                  messageId: MessageId.make("Hello:id"),
                  text: "Hello",
                  attachments: [],
                },
              }
            : {}),
          ...(change === "adoption with another requested thread"
            ? { threadId: ThreadId.make("thread:launch:another-request") }
            : {}),
          ...(change === "adoption with the current project input"
            ? { projectId: otherProjectId }
            : {}),
        };
        const changed = {
          ...retryInput,
          title: "An unaccepted title",
          workspaceStrategy: { type: "worktree" as const, baseRef: "unaccepted-base" },
          ...(retryInput.initialMessage === undefined
            ? {}
            : {
                initialMessage: {
                  messageId: laterMessageId,
                  text: "An unaccepted replacement prompt",
                  attachments: [],
                },
              }),
        };
        const results = yield* Effect.forEach(
          [retryInput, changed, changed],
          (request) => launches.launch(request).pipe(Effect.result),
          { concurrency: "unbounded" },
        );
        for (const result of results) {
          if (accepted) {
            assert.ok(Result.isSuccess(result), JSON.stringify(result));
            assert.equal(result.success.threadId, first.threadId);
            assert.equal(result.success.sequence, first.sequence);
            assert.isTrue(result.success.resumed);
            assert.equal(result.success.projection.thread.projectId, otherProjectId);
            assert.deepEqual(result.success.projection.runs, retained.runs);
            assert.deepEqual(result.success.projection.messages, retained.messages);
          } else {
            assert.ok(Result.isFailure(result), `${change} must refuse launch replay.`);
            assert.equal(result.failure._tag, "ThreadLaunchError");
          }
        }
        assert.deepEqual(
          yield* sql`SELECT 'event' AS kind, event_id AS id FROM orchestration_events
          UNION ALL SELECT 'effect' AS kind, effect_id AS id FROM orchestration_v2_effect_outbox ORDER BY kind, id`,
          before,
        );
        assert.equal(harness.runSetup.mock.calls.length, setupCalls);
        assert.equal(harness.createWorktree.mock.calls.length, worktreeCalls);
        if (noMessage) {
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_command_receipts WHERE command_id = ${messageCommandId}`,
          );
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_events WHERE command_id = ${messageCommandId}`,
          );
          assert.isEmpty((yield* threads.getThreadProjection(first.threadId)).messages);
        }
        return;
      }

      yield* settings.updateSettings({
        projectSettingsOverrides: {
          [projectId]: { providerInstances: { [modelSelection.instanceId]: { enabled: false } } },
        },
      });

      const retry = yield* launches.launch(input);
      assert.equal(retry.threadId, first.threadId);
      assert.isTrue(retry.resumed);

      const fresh = yield* launches
        .launch(
          launchInput({
            command: "command:launch:fresh-after-disable",
            thread: "thread:launch:fresh-after-disable",
            message: "Hello",
          }),
        )
        .pipe(Effect.flip);
      if (fresh._tag !== "ThreadManagementProviderInstanceDisabledError") {
        assert.fail(`expected ThreadManagementProviderInstanceDisabledError, got ${fresh._tag}`);
      }
    }).pipe(Effect.provide(ProjectionMaintenance.layer.pipe(Layer.provideMerge(harness.layer))));
  });
});

it.effect("an agent's launch never starts work above the modes it asks for", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const threads = yield* ThreadManagement.ThreadManagementService;
    // The first launch, at full access, creates the thread without a message.
    const created = yield* launches.launch(
      launchInput({ command: "command:launch:narrowed-retry", thread: "thread:narrowed" }),
    );
    // The same key comes back from a narrower agent, now carrying a message,
    // as a retry or a concurrent launch that lost the create would.
    const failed = yield* launches
      .launch({
        ...launchInput({
          command: "command:launch:narrowed-retry",
          thread: "thread:narrowed",
          message: "Run this",
        }),
        runtimeMode: "approval-required",
        interactionMode: "plan",
        createdBy: "agent",
        creationSource: "mcp",
      })
      .pipe(Effect.flip);
    if (failed._tag !== "ThreadLaunchError") {
      assert.fail(`expected ThreadLaunchError, got ${failed._tag}`);
    }
    assert.equal(failed.operation, "dispatch-message");
    const projection = yield* threads.getThreadProjection(created.threadId);
    assert.equal(projection.runs.length, 0);
    assert.equal(projection.messages.length, 0);
  }).pipe(Effect.provide(harness.layer));
});

it.effect("rejects a server-allocated launch replay with a mismatching thread id", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const { threadId: _unusedThreadId, ...rest } = launchInput({
      command: "command:launch:allocated-mismatch",
      thread: "unused",
      message: "Mismatch",
    });
    const first = yield* launches.launch(rest);
    const failed = yield* launches
      .launch({
        ...rest,
        threadId: ThreadId.make("thread:launch:allocated-mismatch"),
      })
      .pipe(Effect.flip);
    assert.notEqual(first.threadId, ThreadId.make("thread:launch:allocated-mismatch"));
    if (failed._tag !== "ThreadLaunchError") {
      assert.fail(`expected ThreadLaunchError, got ${failed._tag}`);
    }
    assert.equal(failed.operation, "create-thread");
    assert.include(String(failed.cause), "cannot be replayed");
  }).pipe(Effect.provide(harness.layer));
});

it.effect.each(
  (["omitted", "explicit"] as const).flatMap((threadIdentity) =>
    [true, false].map((withMessage) => ({ threadIdentity, withMessage })),
  ),
)(
  "does not treat an unrelated accepted command receipt as a launch ($threadIdentity thread, message=$withMessage)",
  ({ threadIdentity, withMessage }) => {
    const harness = makeHarness();
    return Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const threadId = ThreadId.make("thread:launch:unrelated-receipt");
      yield* threads.dispatch({
        type: "thread.create",
        commandId: CommandId.make("command:launch:unrelated-receipt:create"),
        threadId,
        projectId,
        title: "Existing",
        modelSelection,
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        createdBy: "user",
        creationSource: "web",
      });
      yield* threads.dispatch({
        type: "thread.metadata.update",
        commandId: CommandId.make("command:launch:unrelated-receipt"),
        threadId,
        expectedEmpty: true,
      });
      const { threadId: _unusedThreadId, ...rest } = launchInput({
        command: "command:launch:unrelated-receipt",
        thread: "unused",
        ...(withMessage ? { message: "Should not become a launch" } : {}),
      });
      const result = yield* launches
        .launch({
          ...rest,
          ...(threadIdentity === "explicit" ? { threadId } : {}),
        })
        .pipe(Effect.result);
      assert.ok(
        Result.isFailure(result),
        "An unrelated command receipt cannot authorize a launch.",
      );
      const failed = result.failure;
      if (failed._tag !== "ThreadLaunchError") {
        assert.fail(`expected ThreadLaunchError, got ${failed._tag}`);
      }
      assert.equal(failed.operation, "create-thread");
      assert.include(
        String(failed.cause),
        threadIdentity === "omitted" ? "cannot be replayed" : "receipt does not match",
      );
      const projection = yield* threads.getThreadProjection(threadId);
      assert.equal(projection.messages.length, 0);
      assert.equal(projection.runs.length, 0);
    }).pipe(Effect.provide(harness.layer));
  },
);

it.effect("bounds concurrent first launches to one thread per command", () =>
  Effect.gen(function* () {
    const setupEntered = yield* Deferred.make<void>();
    const allowSetup = yield* Deferred.make<void>();
    const harness = makeHarness({
      runSetup: () =>
        Deferred.succeed(setupEntered, undefined).pipe(
          Effect.andThen(Deferred.await(allowSetup)),
          Effect.as({ status: "no-script" as const }),
        ),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const { threadId: _unusedThreadId, ...rest } = launchInput({
        command: "command:launch:concurrent-allocated",
        thread: "unused",
        message: "Race me",
        workspace: { type: "worktree", baseRef: "main" },
      });
      const results = yield* Effect.all(
        [launches.launch(rest).pipe(Effect.exit), launches.launch(rest).pipe(Effect.exit)],
        { concurrency: "unbounded" },
      );
      const winner = results.find(Exit.isSuccess);
      assert.isDefined(winner);
      const threadId = winner!.value.threadId;
      for (const result of results) {
        if (Exit.isSuccess(result)) {
          assert.equal(result.value.threadId, threadId);
          continue;
        }
        const error = Cause.findErrorOption(result.cause).pipe(Option.getOrThrow);
        if (error._tag !== "ThreadLaunchError") {
          assert.fail(`expected ThreadLaunchError, got ${error._tag}`);
        }
        assert.equal(error.operation, "create-thread");
        assert.include(String(error.cause), "cannot be replayed");
        const retried = yield* launches.launch(rest);
        assert.equal(retried.threadId, threadId);
      }
      const projectThreads = yield* threads.listProjectThreads({
        projectId,
        includeSubagents: false,
      });
      assert.equal(projectThreads.length, 1);
      const projection = yield* threads.getThreadProjection(threadId);
      assert.equal(projection.messages.length, 1);
      assert.equal(projection.runs.length, 1);
      yield* Deferred.await(setupEntered);
      assert.equal(harness.runSetup.mock.calls.length, 1);
      yield* Deferred.succeed(allowSetup, undefined);
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect("does not let a failing same-command caller strand a concurrent durable launch", () =>
  Effect.gen(function* () {
    const setupEntered = yield* Deferred.make<void>();
    const allowSetup = yield* Deferred.make<void>();
    const harness = makeHarness({
      runSetup: () =>
        Deferred.succeed(setupEntered, undefined).pipe(
          Effect.andThen(Deferred.await(allowSetup)),
          Effect.as({ status: "no-script" as const }),
        ),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const command = "command:launch:failed-owner-race";
      const [failed, launched] = yield* Effect.all(
        [
          launches
            .launch({
              ...launchInput({
                command,
                thread: "thread:launch:failed-owner-race",
                message: "This invalid reuse fails",
                workspace: { type: "worktree", baseRef: "main" },
              }),
              reuseExistingThread: true,
            })
            .pipe(Effect.exit),
          launches.launch(
            launchInput({
              command,
              thread: "thread:launch:successful-peer",
              message: "This peer persists",
              workspace: { type: "worktree", baseRef: "main" },
            }),
          ),
        ],
        { concurrency: "unbounded" },
      );
      assert.isTrue(Exit.isFailure(failed));
      assert.equal(launched.projection.runs[0]?.status, "preparing");
      const entered = yield* Deferred.await(setupEntered).pipe(
        Effect.timeoutOption(Duration.seconds(2)),
      );
      assert.isTrue(Option.isSome(entered));
      assert.equal(harness.runSetup.mock.calls.length, 1);
      yield* Deferred.succeed(allowSetup, undefined);
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect("reports one concurrent same-command launch as new and the rest as resumed", () =>
  Effect.gen(function* () {
    // Both launches read no receipt before either one claims the thread.
    const arrived = yield* Ref.make(0);
    const bothRead = yield* Deferred.make<void>();
    const harness = makeHarness({
      managedFolders: Layer.mock(ManagedProjectFolders.ManagedProjectFolders)({
        namedProjectsRoot: "/projects",
        isScratchProject: () => Effect.succeed(false),
        folderForThread: () =>
          Ref.updateAndGet(arrived, (count) => count + 1).pipe(
            Effect.tap((count) =>
              count === 2 ? Deferred.succeed(bothRead, undefined) : Effect.void,
            ),
            Effect.andThen(Deferred.await(bothRead)),
            Effect.as(Option.none()),
          ),
      }),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const input = launchInput({
        command: "command:launch:concurrent-resumed",
        thread: "thread:launch:concurrent-resumed",
      });
      const results = yield* Effect.all([launches.launch(input), launches.launch(input)], {
        concurrency: "unbounded",
      });
      assert.deepEqual(results.map((result) => result.resumed).sort(), [false, true]);
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect(
  "does not report a retry as resumed when the earlier attempt only claimed the thread",
  () =>
    Effect.gen(function* () {
      const harness = makeHarness();
      yield* Effect.gen(function* () {
        const launches = yield* ThreadLaunch.ThreadLaunchService;
        const threads = yield* ThreadManagement.ThreadManagementService;
        const input = launchInput({
          command: "command:launch:claimed-only",
          thread: "thread:launch:claimed-only",
          message: "Counted once",
        });
        yield* threads.dispatch({
          type: "thread.create",
          commandId: input.commandId,
          threadId: input.threadId,
          projectId: input.projectId,
          title: input.title,
          modelSelection: input.modelSelection,
          runtimeMode: input.runtimeMode,
          interactionMode: input.interactionMode,
          branch: null,
          worktreePath: null,
          createdBy: input.createdBy,
          creationSource: input.creationSource,
        });
        const retried = yield* launches.launch(input);
        assert.isFalse(retried.resumed);
        assert.isTrue((yield* launches.launch(input)).resumed);
      }).pipe(Effect.provide(harness.layer));
    }),
);

it.effect.each([
  "before pruning",
  "after pruning",
  "legacy preparation",
  "conflicting creation",
  "multiple creation records",
  "different creation thread",
  "different creation payload thread",
  "different creation origin",
  "creation beyond receipt",
  "different current origin with retained creation",
  "missing run",
  "missing origin",
  "different origin",
  "ambiguous origin",
  "different run thread",
  "missing message",
  "different message thread",
  "different message run",
  "non-user message",
  "missing preparation",
  "different receipt type",
  "different receipt thread",
  "different project",
] as const)("validates accepted preparing retries with %s", (state) =>
  Effect.gen(function* () {
    const setupEntered = yield* Deferred.make<void>();
    const allowSetup = yield* Deferred.make<void>();
    const branchText = yield* Deferred.make<string>();
    const harness = makeHarness({
      runSetup: () =>
        Deferred.succeed(setupEntered, undefined).pipe(
          Effect.andThen(Deferred.await(allowSetup)),
          Effect.as({ status: "no-script" as const }),
        ),
      generateBranchName: (input) =>
        Deferred.succeed(branchText, input.message).pipe(Effect.as({ branch: "generated-branch" })),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const sql = yield* SqlClient.SqlClient;
      const maintenance = yield* ProjectionMaintenance.ProjectionMaintenanceV2;
      const input = launchInput({
        command: "command:launch:accepted-before-fork",
        thread: "thread:launch:accepted-before-fork",
        message: "Resume preparation",
        workspace: { type: "worktree", baseRef: "main" },
      });
      const messageId = MessageId.make("message:launch:accepted-before-fork");
      const messageCommandId = CommandId.make(`${input.commandId}:initial-message`);

      yield* threads.dispatch({
        type: "thread.create",
        commandId: input.commandId,
        threadId: input.threadId,
        projectId: input.projectId,
        title: input.title,
        modelSelection: input.modelSelection,
        runtimeMode: input.runtimeMode,
        interactionMode: input.interactionMode,
        branch: null,
        worktreePath: null,
        createdBy: input.createdBy,
        creationSource: input.creationSource,
      });
      yield* threads.dispatch({
        type: "message.dispatch",
        commandId: messageCommandId,
        threadId: input.threadId,
        messageId,
        text: "Resume preparation",
        attachments: [],
        modelSelection: input.modelSelection,
        dispatchMode: { type: "defer_start", workspaceStrategy: input.workspaceStrategy },
        createdBy: input.createdBy,
        creationSource: input.creationSource,
      });
      const preparing = yield* threads.getThreadProjection(input.threadId);
      assert.equal(preparing.runs[0]?.status, "preparing");
      const runId = preparing.runs[0]!.id;
      if (state === "ambiguous origin" || state === "conflicting creation") {
        yield* threads.dispatch({
          type: "message.dispatch",
          commandId: CommandId.make("command:launch:another-preparing-message"),
          threadId: input.threadId,
          messageId: MessageId.make("message:launch:another-preparing-message"),
          text: "A different accepted command",
          attachments: [],
          modelSelection: input.modelSelection,
          dispatchMode: { type: "defer_start", workspaceStrategy: input.workspaceStrategy },
          createdBy: input.createdBy,
          creationSource: input.creationSource,
        });
      }
      const retainsCreation =
        state === "before pruning" || state === "legacy preparation" || state.includes("creation");
      if (!retainsCreation) {
        yield* maintenance.pruneEventStore();
        yield* TestClock.adjust("1 day");
        assert.isAbove((yield* maintenance.pruneEventStore()).deletedEventCount, 0);
        assert.isEmpty(
          yield* sql`SELECT 1 FROM orchestration_events
            WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`,
        );
      }
      switch (state) {
        case "legacy preparation":
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_remove(payload_json, '$.originCommandId') WHERE run_id = ${runId}`;
          yield* sql`UPDATE orchestration_events
            SET payload_json = json_remove(payload_json, '$.originCommandId')
            WHERE stream_id = ${input.threadId} AND event_type IN ('run.created', 'run.updated')
              AND json_extract(payload_json, '$.id') = ${runId}`;
          assert.isEmpty(
            yield* sql`SELECT 1 FROM orchestration_v2_projection_runs
              WHERE run_id = ${runId} AND json_type(payload_json, '$.originCommandId') IS NOT NULL
              UNION ALL SELECT 1 FROM orchestration_events
              WHERE stream_id = ${input.threadId} AND event_type IN ('run.created', 'run.updated')
                AND json_extract(payload_json, '$.id') = ${runId}
                AND json_type(payload_json, '$.originCommandId') IS NOT NULL`,
          );
          break;
        case "conflicting creation": {
          const other = (yield* threads.getThreadProjection(input.threadId)).runs.find(
            (run) => run.id !== runId,
          );
          assert.isDefined(other);
          yield* sql`UPDATE orchestration_events
            SET payload_json = json_set(payload_json, '$.id', ${other!.id}),
              metadata_json = json_set(metadata_json, '$.runId', ${other!.id})
            WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`;
          break;
        }
        case "multiple creation records":
          yield* sql`UPDATE orchestration_events SET event_type = 'run.created',
            payload_json = (SELECT payload_json FROM orchestration_events
              WHERE command_id = ${messageCommandId} AND event_type = 'run.created'),
            metadata_json = (SELECT metadata_json FROM orchestration_events
              WHERE command_id = ${messageCommandId} AND event_type = 'run.created')
            WHERE command_id = ${messageCommandId} AND event_type = 'message.updated'
              AND json_extract(payload_json, '$.id') = ${messageId}`;
          break;
        case "different creation thread":
          yield* sql`UPDATE orchestration_events SET stream_id = 'thread:unrelated'
            WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`;
          break;
        case "different creation payload thread":
          yield* sql`UPDATE orchestration_events
            SET payload_json = json_set(payload_json, '$.threadId', 'thread:unrelated')
            WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`;
          break;
        case "different creation origin":
          yield* sql`UPDATE orchestration_events
            SET payload_json = json_set(payload_json, '$.originCommandId', 'command:unrelated')
            WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`;
          break;
        case "creation beyond receipt":
          yield* sql`UPDATE orchestration_command_receipts SET result_sequence = 0
            WHERE command_id = ${messageCommandId}`;
          break;
        case "different current origin with retained creation":
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_set(payload_json, '$.originCommandId', 'command:unrelated') WHERE run_id = ${runId}`;
          break;
        case "missing run":
          yield* sql`DELETE FROM orchestration_v2_projection_runs WHERE run_id = ${runId}`;
          break;
        case "missing origin":
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_remove(payload_json, '$.originCommandId') WHERE run_id = ${runId}`;
          break;
        case "different origin":
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_set(payload_json, '$.originCommandId', 'command:unrelated') WHERE run_id = ${runId}`;
          break;
        case "ambiguous origin":
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_set(payload_json, '$.originCommandId', ${messageCommandId}) WHERE run_id <> ${runId}`;
          break;
        case "different run thread":
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_set(payload_json, '$.threadId', 'thread:unrelated') WHERE run_id = ${runId}`;
          break;
        case "missing message":
          yield* sql`DELETE FROM orchestration_v2_projection_messages WHERE message_id = ${messageId}`;
          break;
        case "different message thread":
          yield* sql`UPDATE orchestration_v2_projection_messages
            SET payload_json = json_set(payload_json, '$.threadId', 'thread:unrelated') WHERE message_id = ${messageId}`;
          break;
        case "different message run":
          yield* sql`UPDATE orchestration_v2_projection_messages
            SET payload_json = json_set(payload_json, '$.runId', 'run:unrelated') WHERE message_id = ${messageId}`;
          break;
        case "non-user message":
          yield* sql`UPDATE orchestration_v2_projection_messages
            SET payload_json = json_set(payload_json, '$.role', 'assistant') WHERE message_id = ${messageId}`;
          break;
        case "missing preparation":
          yield* sql`UPDATE orchestration_v2_projection_runs
            SET payload_json = json_remove(payload_json, '$.workspacePreparation') WHERE run_id = ${runId}`;
          break;
        case "different receipt type":
          yield* sql`UPDATE orchestration_command_receipts
            SET command_type = 'thread.metadata.update' WHERE command_id = ${messageCommandId}`;
          break;
        case "different receipt thread":
          yield* sql`UPDATE orchestration_command_receipts
            SET aggregate_id = 'thread:unrelated' WHERE command_id = ${messageCommandId}`;
          break;
      }
      if (retainsCreation) {
        assert.lengthOf(
          yield* sql`SELECT 1 FROM orchestration_events
            WHERE command_id = ${messageCommandId} AND event_type = 'run.created'`,
          state === "multiple creation records" ? 2 : 1,
        );
      }

      const changed = {
        ...input,
        ...(state === "different project" ? { projectId: otherProjectId } : {}),
        workspaceStrategy: { type: "worktree" as const, baseRef: "unaccepted-base" },
        initialMessage: {
          messageId: MessageId.make("unaccepted-message"),
          text: "Unaccepted replacement prompt",
          attachments: [],
        },
      };
      if (
        state !== "before pruning" &&
        state !== "after pruning" &&
        state !== "legacy preparation"
      ) {
        const before = yield* sql`SELECT 'event' AS kind, event_id AS id FROM orchestration_events
          UNION ALL SELECT 'effect' AS kind, effect_id AS id FROM orchestration_v2_effect_outbox ORDER BY kind, id`;
        const results = yield* Effect.all(
          [
            launches.launch(changed).pipe(Effect.result),
            launches.launch(changed).pipe(Effect.result),
          ],
          { concurrency: "unbounded" },
        );
        for (const result of results) {
          assert.ok(Result.isFailure(result), `${state} must refuse launch recovery.`);
          assert.equal(result.failure._tag, "ThreadLaunchError");
        }
        assert.equal(harness.createWorktree.mock.calls.length, 0);
        assert.equal(harness.runSetup.mock.calls.length, 0);
        assert.equal(harness.generateBranchName.mock.calls.length, 0);
        assert.deepEqual(
          yield* sql`SELECT 'event' AS kind, event_id AS id FROM orchestration_events
            UNION ALL SELECT 'effect' AS kind, effect_id AS id FROM orchestration_v2_effect_outbox ORDER BY kind, id`,
          before,
        );
        return;
      }
      const [first, second] = yield* Effect.all(
        [launches.launch(changed), launches.launch(changed)],
        { concurrency: "unbounded" },
      );
      yield* Deferred.await(setupEntered);
      assert.isTrue(first.resumed);
      assert.isTrue(second.resumed);
      assert.equal(first.projection.runs[0]?.id, runId);
      assert.equal(second.projection.runs[0]?.id, runId);
      assert.equal(first.projection.messages[0]?.id, messageId);
      assert.equal(second.projection.messages[0]?.id, messageId);
      if (state === "legacy preparation") {
        assert.isUndefined(first.projection.runs[0]?.originCommandId);
        assert.isUndefined(second.projection.runs[0]?.originCommandId);
      }
      assert.equal(harness.runSetup.mock.calls.length, 1);
      assert.equal(harness.createWorktree.mock.calls[0]?.[0].refName, "main");
      assert.equal(yield* Deferred.await(branchText), "Resume preparation");
      yield* Deferred.succeed(allowSetup, undefined);
    }).pipe(Effect.provide(ProjectionMaintenance.layer.pipe(Layer.provideMerge(harness.layer))));
  }),
);

it.effect("creates a strong provider-thread mapping for an imported native session", () => {
  const harness = makeHarness();
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const input = {
      ...launchInput({
        command: "command:launch:imported-native-session",
        thread: "thread:launch:imported-native-session",
      }),
      importedNativeThread: {
        ref: {
          driver: ProviderDriverKind.make("codex"),
          nativeId: "native-session-42",
          strength: "strong" as const,
        },
        metadata: {
          title: "Native session",
          updatedAt: "2026-08-23T00:00:00Z",
        },
      },
    };

    const launched = yield* launches.launch(input);

    assert.deepInclude(launched.projection.providerThreads[0], {
      id: IdAllocator.deriveProviderThread({
        driver: input.importedNativeThread.ref.driver,
        providerInstanceId: modelSelection.instanceId,
        nativeThreadId: input.importedNativeThread.ref.nativeId,
      }),
      driver: input.importedNativeThread.ref.driver,
      providerInstanceId: modelSelection.instanceId,
      appThreadId: input.threadId,
      nativeThreadRef: input.importedNativeThread.ref,
      status: "not_loaded",
      nativeMetadata: input.importedNativeThread.metadata,
    });
    assert.equal(
      launched.projection.thread.activeProviderThreadId,
      launched.projection.providerThreads[0]?.id,
    );
  }).pipe(Effect.provide(harness.layer));
});

it.effect("shared intake preserves durable attachment bytes after a lost launch result", () => {
  const harness = makeHarness();
  const layerFiles = ServerConfig.layerTest(process.cwd(), { prefix: "t3-message-intake-" }).pipe(
    Layer.provideMerge(DocumentText.layer.pipe(Layer.provideMerge(NodeServices.layer))),
  );
  return Effect.gen(function* () {
    const config = yield* ServerConfig.ServerConfig;
    const fs = yield* FileSystem.FileSystem;
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const threads = yield* ThreadManagement.ThreadManagementService;
    const pendingId = createPendingAttachmentId();
    assert.isNotNull(pendingId);
    const attachment: ChatAttachment = {
      type: "image",
      id: ChatAttachmentId.make(pendingId),
      name: "image.png",
      mimeType: "image/png",
      sizeBytes: 4,
    };
    const pendingPath = resolveAttachmentPath({
      attachmentsDir: config.attachmentsDir,
      attachment,
    });
    assert.isNotNull(pendingPath);
    yield* fs.makeDirectory(config.attachmentsDir, { recursive: true });
    yield* fs.writeFile(pendingPath, new Uint8Array([1, 2, 3, 4]));
    const input = {
      ...launchInput({ command: "intake-launch", thread: "intake-thread" }),
      initialMessage: {
        messageId: MessageId.make("intake-first"),
        text: "First [file](t3-context://v1/file/intake-file)",
        context: {
          version: 1 as const,
          records: [
            {
              version: 1 as const,
              contextId: ComposerContextId.make("intake-file"),
              kind: "file" as const,
              label: attachment.name,
              attachmentId: attachment.id,
              name: attachment.name,
              mimeType: attachment.mimeType,
              sizeBytes: attachment.sizeBytes,
            },
          ],
        },
        attachments: [attachment],
      },
    };
    const failed = yield* ThreadMessageIntake.launchThread(input).pipe(
      Effect.provideService(ThreadLaunch.ThreadLaunchService, {
        launch: (request) =>
          launches.launch(request).pipe(
            Effect.andThen(
              new ThreadLaunch.ThreadLaunchError({
                operation: "create-thread",
                commandId: request.commandId,
                projectId,
                cause: "lost result after acceptance",
              }),
            ),
          ),
        checkWorktreeBase: launches.checkWorktreeBase,
        retryPreparation: launches.retryPreparation,
        prepareRun: launches.prepareRun,
      }),
      Effect.flip,
    );
    assert.equal(failed._tag, "ThreadLaunchError");
    const accepted = yield* threads.getThreadProjection(input.threadId);
    const stored = accepted.messages.find(
      (message) => message.id === input.initialMessage.messageId,
    );
    assert.isDefined(stored);
    assert.notEqual(stored.attachments[0]?.id, attachment.id);
    const record = stored.context?.records[0];
    assert.isDefined(record);
    assert.equal((record as { attachmentId: string }).attachmentId, stored.attachments[0]?.id);
    const userItem = accepted.turnItems.find(
      (item) => item.type === "user_message" && item.messageId === stored.id,
    );
    assert.ok(userItem?.type === "user_message");
    assert.deepEqual(userItem.context, stored.context);
    const storedPath = resolveAttachmentPath({
      attachmentsDir: config.attachmentsDir,
      attachment: stored.attachments[0]!,
    });
    assert.isNotNull(storedPath);
    assert.deepEqual(yield* fs.readFile(storedPath), new Uint8Array([1, 2, 3, 4]));
    assert.deepEqual(yield* fs.readFile(pendingPath), new Uint8Array([1, 2, 3, 4]));

    const replayed = yield* ThreadMessageIntake.launchThread(input);
    assert.equal(replayed.projection.messages[0]?.id, stored.id);
    assert.deepEqual(replayed.projection.messages[0]?.attachments, stored.attachments);
    const claimedFiles = Effect.map(fs.readDirectory(config.attachmentsDir), (files) =>
      files.filter((name) => !name.startsWith("pending-")),
    );
    assert.equal((yield* claimedFiles).length, 1);

    const duplicate = yield* ThreadMessageIntake.launchThread({
      ...input,
      commandId: CommandId.make("intake-duplicate-create"),
      initialMessage: { ...input.initialMessage, messageId: MessageId.make("intake-duplicate") },
    }).pipe(Effect.result);
    assert.ok(Result.isFailure(duplicate));
    assert.ok(duplicate.failure._tag === "ThreadLaunchError");
    assert.equal(duplicate.failure.operation, "create-thread");
    assert.propertyVal(duplicate.failure.cause, "_tag", "OrchestratorThreadAlreadyExistsError");
    assert.equal((yield* claimedFiles).length, 1);
    assert.deepEqual(yield* fs.readFile(storedPath), new Uint8Array([1, 2, 3, 4]));
    assert.deepEqual(yield* fs.readFile(pendingPath), new Uint8Array([1, 2, 3, 4]));

    const missingProject = yield* ThreadMessageIntake.launchThread({
      ...input,
      commandId: CommandId.make("intake-no-project"),
      projectId: ProjectId.make("missing-project"),
    }).pipe(Effect.flip);
    assert.equal(missingProject._tag, "ThreadLaunchError");
    assert.equal((yield* claimedFiles).length, 1);
    const missingThread = yield* ThreadMessageIntake.dispatchCommand({
      type: "message.dispatch",
      commandId: CommandId.make("intake-no-thread"),
      threadId: ThreadId.make("missing-thread"),
      messageId: MessageId.make("intake-missing"),
      text: "Missing",
      attachments: [attachment],
      dispatchMode: { type: "start_immediately" },
      createdBy: "user",
      creationSource: "web",
    }).pipe(Effect.flip);
    assert.equal(missingThread._tag, "OrchestratorProjectionError");
    assert.equal((yield* claimedFiles).length, 1);

    const dispatch = ThreadMessageIntake.dispatchCommand({
      type: "message.dispatch",
      commandId: CommandId.make("intake-dispatch"),
      threadId: input.threadId,
      messageId: MessageId.make("intake-second"),
      text: "Second",
      attachments: [attachment],
      dispatchMode: { type: "queue_after_active" },
      createdBy: "user",
      creationSource: "web",
    });
    yield* dispatch;
    yield* dispatch;
    const queuedProjection = yield* threads.getThreadProjection(input.threadId);
    const queuedRun = queuedProjection.runs.find(
      (run) => run.userMessageId === MessageId.make("intake-second"),
    );
    assert.isDefined(queuedRun);
    assert.equal(queuedRun.status, "queued");
    const queuedMessage = queuedProjection.messages.find(
      (message) => message.id === queuedRun.userMessageId,
    );
    assert.isDefined(queuedMessage);
    const file: ChatAttachment = {
      type: "file",
      id: ChatAttachmentId.make(createPendingAttachmentId("pdf")),
      name: "queued.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
    };
    const filePath = resolveAttachmentPath({
      attachmentsDir: config.attachmentsDir,
      attachment: file,
    });
    assert.isNotNull(filePath);
    yield* fs.writeFile(filePath, new Uint8Array([5, 6, 7, 8]));
    const edit = ThreadMessageIntake.dispatchCommand({
      type: "queued-run.edit",
      commandId: CommandId.make("intake-edit"),
      threadId: input.threadId,
      runId: queuedRun.id,
      text: "Edited with a file",
      attachments: [...queuedMessage.attachments, file],
    });
    yield* edit;
    yield* edit;
    const editedProjection = yield* threads.getThreadProjection(input.threadId);
    const editedMessage = editedProjection.messages.find(
      (message) => message.id === queuedRun.userMessageId,
    );
    assert.isDefined(editedMessage);
    assert.equal(editedMessage.attachments.length, 2);
    assert.deepEqual(editedMessage.attachments[0], queuedMessage.attachments[0]);
    assert.notEqual(editedMessage.attachments[1]?.id, file.id);
    const durableFilePath = resolveAttachmentPath({
      attachmentsDir: config.attachmentsDir,
      attachment: editedMessage.attachments[1]!,
    });
    assert.isNotNull(durableFilePath);
    assert.deepEqual(yield* fs.readFile(durableFilePath), new Uint8Array([5, 6, 7, 8]));
    assert.deepEqual(yield* fs.readFile(filePath), new Uint8Array([5, 6, 7, 8]));
    const beforeRejectedEdit = (yield* claimedFiles).length;
    const rejectedEdit = yield* ThreadMessageIntake.dispatchCommand({
      type: "queued-run.edit",
      commandId: CommandId.make("intake-edit-rejected"),
      threadId: input.threadId,
      runId: queuedRun.id,
      text: "",
      attachments: [file],
    }).pipe(Effect.flip);
    assert.equal(rejectedEdit._tag, "OrchestratorCommandRejectedError");
    assert.equal((yield* claimedFiles).length, beforeRejectedEdit);
    assert.deepEqual(yield* fs.readFile(filePath), new Uint8Array([5, 6, 7, 8]));
    const send = ThreadMessageIntake.sendToThread({
      commandId: CommandId.make("intake-send"),
      projectId,
      threadId: input.threadId,
      messageId: MessageId.make("intake-third"),
      text: "Third",
      attachments: [attachment],
      mode: "queue",
      createdBy: "agent",
      creationSource: "mcp",
    });
    yield* send;
    yield* send;
    assert.equal((yield* claimedFiles).length, 4);
    const final = yield* threads.getThreadProjection(input.threadId);
    assert.equal(final.messages.length, 3);
    for (const message of final.messages) {
      const path = resolveAttachmentPath({
        attachmentsDir: config.attachmentsDir,
        attachment: message.attachments[0]!,
      });
      assert.isNotNull(path);
      assert.deepEqual(yield* fs.readFile(path), new Uint8Array([1, 2, 3, 4]));
    }
  }).pipe(Effect.provide(Layer.mergeAll(harness.layer, layerFiles)));
});

it.effect("cancels tracked setup before provider work is released", () =>
  Effect.gen(function* () {
    const entered = yield* Deferred.make<void>();
    const renamed = yield* Deferred.make<void>();
    const harness = makeHarness({
      renameBranch: (input) =>
        Deferred.succeed(renamed, undefined).pipe(Effect.as({ branch: input.newBranch })),
      runSetup: () =>
        Deferred.await(renamed).pipe(
          Effect.andThen(Deferred.succeed(entered, undefined)),
          Effect.andThen(Effect.never),
        ),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const tracker = yield* WorktreeSetupTracker.WorktreeSetupTracker;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const outbox = yield* EffectOutbox.EffectOutboxV2;
      const input = launchInput({
        command: "launch:cancel-tracked",
        thread: "thread:cancel-tracked",
        message: "Start",
        workspace: { type: "worktree", baseRef: "main" },
      });
      const launched = yield* launches.launch(input);
      yield* Deferred.await(entered);
      assert.equal((yield* tracker.get(launched.threadId))?.phase, "running");
      assert.isTrue(yield* tracker.cancel(launched.threadId));
      assert.equal((yield* tracker.get(launched.threadId))?.phase, "cancelled");
      const projection = yield* threads.getThreadProjection(launched.threadId);
      assert.equal(projection.runs[0]?.status, "failed");
      assert.isNull(projection.thread.worktreePath);
      assert.deepEqual(harness.deleteLocalBranch.mock.calls[0]?.[0], {
        cwd: "/repo",
        refName: "generated-branch",
        force: true,
      });
      assert.isEmpty(yield* outbox.listByCommandId(CommandId.make(`${input.commandId}:release`)));
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect(
  "deletes a claimed worktree's branch when setup is cancelled before checkout returns",
  () =>
    Effect.gen(function* () {
      const claimed = yield* Deferred.make<void>();
      const harness = makeHarness({
        createWorktree: (_input, options) =>
          (options?.progress?.onWorktreeClaimed?.("/repo-worktrees/feature") ?? Effect.void).pipe(
            Effect.andThen(Deferred.succeed(claimed, undefined)),
            Effect.andThen(Effect.never),
          ),
      });
      yield* Effect.gen(function* () {
        const launches = yield* ThreadLaunch.ThreadLaunchService;
        const tracker = yield* WorktreeSetupTracker.WorktreeSetupTracker;
        const launched = yield* launches.launch(
          launchInput({
            command: "launch:cancel-claimed",
            thread: "thread:cancel-claimed",
            message: "Start",
            workspace: { type: "worktree", baseRef: "main" },
          }),
        );
        yield* Deferred.await(claimed);
        assert.isTrue(yield* tracker.cancel(launched.threadId));
        assert.equal(harness.removeWorktree.mock.calls[0]?.[0].path, "/repo-worktrees/feature");
        assert.equal(
          harness.deleteLocalBranch.mock.calls[0]?.[0].refName,
          harness.createWorktree.mock.calls[0]?.[0].newRefName,
        );
      }).pipe(Effect.provide(harness.layer));
    }),
);

it.effect("stops an in-flight branch rename when tracked setup is cancelled", () =>
  Effect.gen(function* () {
    const setupEntered = yield* Deferred.make<void>();
    const branchNameStarted = yield* Deferred.make<void>();
    const allowBranchName = yield* Deferred.make<void>();
    const branchNameInterrupted = yield* Deferred.make<void>();
    const renameAttempted = yield* Deferred.make<void>();
    const harness = makeHarness({
      renameBranch: (input) =>
        Deferred.succeed(renameAttempted, undefined).pipe(Effect.as({ branch: input.newBranch })),
      runSetup: () => Deferred.succeed(setupEntered, undefined).pipe(Effect.andThen(Effect.never)),
      generateBranchName: () =>
        Deferred.succeed(branchNameStarted, undefined).pipe(
          Effect.andThen(Deferred.await(allowBranchName)),
          Effect.as({ branch: "generated-branch" }),
          Effect.onInterrupt(() => Deferred.succeed(branchNameInterrupted, undefined)),
        ),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const tracker = yield* WorktreeSetupTracker.WorktreeSetupTracker;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const launched = yield* launches.launch(
        launchInput({
          command: "launch:cancel-renaming",
          thread: "thread:cancel-renaming",
          message: "Start",
          workspace: { type: "worktree", baseRef: "main" },
        }),
      );
      yield* Deferred.await(setupEntered);
      yield* Deferred.await(branchNameStarted);
      assert.isTrue(yield* tracker.cancel(launched.threadId));
      yield* Deferred.succeed(allowBranchName, undefined);
      yield* Effect.raceFirst(
        Deferred.await(branchNameInterrupted),
        Deferred.await(renameAttempted),
      );
      assert.isTrue(
        yield* Deferred.isDone(branchNameInterrupted),
        "the cancelled setup's branch rename kept running",
      );
      assert.equal(harness.renameBranch.mock.calls.length, 0);
      assert.isNull((yield* threads.getThreadProjection(launched.threadId)).thread.worktreePath);
      assert.equal(
        harness.deleteLocalBranch.mock.calls[0]?.[0].refName,
        harness.createWorktree.mock.calls[0]?.[0].newRefName,
      );
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect.each([0, 1])("releases an async setup before its completion with exit %s", (exitCode) =>
  Effect.gen(function* () {
    const completion = yield* Deferred.make<{ exitCode: number | null; durationMs: number }>();
    const harness = makeHarness({
      runSetup: () =>
        Effect.succeed({
          status: "started" as const,
          async: true,
          scriptId: "setup",
          scriptName: "Setup",
          scriptCommand: "vp install",
          terminalId: "setup",
          cwd: "/repo-worktrees/feature",
          completion: Deferred.await(completion),
        }),
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const threads = yield* ThreadManagement.ThreadManagementService;
      const tracker = yield* WorktreeSetupTracker.WorktreeSetupTracker;
      const launched = yield* launches.launch(
        launchInput({
          command: `command:launch:async-${exitCode}`,
          thread: `thread:launch:async-${exitCode}`,
          message: "Start during setup",
          workspace: { type: "worktree", baseRef: "main" },
        }),
      );
      yield* tracker.stream(launched.threadId).pipe(
        Stream.filter(
          (snapshot) =>
            snapshot?.stages.some((stage) => stage.id === "agent" && stage.status === "done") ===
            true,
        ),
        Stream.runHead,
      );
      const running = yield* threads.getThreadProjection(launched.threadId);
      assert.equal(running.runs[0]?.status, "starting");
      assert.equal((yield* tracker.get(launched.threadId))?.phase, "running");
      yield* Deferred.succeed(completion, { exitCode, durationMs: 1 });
      yield* tracker.stream(launched.threadId).pipe(
        Stream.filter((snapshot) => snapshot?.phase === "done"),
        Stream.runHead,
      );
      const settled = yield* tracker.get(launched.threadId);
      assert.equal(
        settled?.stages.find((stage) => stage.id === "setup-script")?.status,
        exitCode === 0 ? "done" : "failed",
      );
      assert.equal(
        (yield* threads.getThreadProjection(launched.threadId)).runs[0]?.status,
        "starting",
      );
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect.each([
  { name: "is missing", baseRef: "t3/renamed", startFromOrigin: false, origin: true },
  {
    name: "has no origin to come from",
    baseRef: "t3/renamed",
    startFromOrigin: true,
    origin: false,
  },
  {
    name: "is a previous checkout there never was",
    baseRef: "-",
    startFromOrigin: false,
    origin: true,
  },
])("refuses a new worktree whose base ref $name", (testCase) =>
  Effect.gen(function* () {
    const harness = makeHarness({
      hasCommit: ({ refName }) => Effect.succeed(refName === "HEAD"),
      git: {
        resolveWorktreeBaseRemote: () =>
          Effect.succeed(testCase.origin ? { remoteName: "origin", branchName: "main" } : null),
        hasRefNamed: () => Effect.succeed(false),
      },
    });
    yield* Effect.gen(function* () {
      const launches = yield* ThreadLaunch.ThreadLaunchService;
      const error = yield* launches
        .checkWorktreeBase({
          projectId,
          workspaceStrategy: {
            type: "worktree",
            baseRef: testCase.baseRef,
            startFromOrigin: testCase.startFromOrigin,
          },
        })
        .pipe(Effect.flip);
      assert.deepInclude(error, {
        _tag: "ThreadLaunchBaseRefError",
        projectId,
        baseRef: testCase.baseRef,
      });
      assert.equal(
        error.message,
        `Base ref "${testCase.baseRef}" does not resolve to a commit in project "Project" (/repo).`,
      );
    }).pipe(Effect.provide(harness.layer));
  }),
);

it.effect("replays an accepted send after the project disables the instance", () => {
  const harness = makeHarness();
  const layerFiles = ServerConfig.layerTest(process.cwd(), { prefix: "t3-send-retry-" }).pipe(
    Layer.provideMerge(DocumentText.layer.pipe(Layer.provideMerge(NodeServices.layer))),
  );
  return Effect.gen(function* () {
    const launches = yield* ThreadLaunch.ThreadLaunchService;
    const settings = yield* ServerSettings.ServerSettingsService;
    const created = yield* launches.launch(
      launchInput({
        command: "command:send:retry-setup",
        thread: "thread:send:retry-after-disable",
      }),
    );

    const sendInput = {
      commandId: CommandId.make("command:send:retry-after-disable"),
      projectId,
      threadId: created.threadId,
      messageId: MessageId.make("message:send:retry-after-disable"),
      text: "Hello again",
      attachments: [],
      mode: "auto" as const,
      createdBy: "user" as const,
      creationSource: "web" as const,
    };
    const first = yield* ThreadMessageIntake.sendToThread(sendInput);

    yield* settings.updateSettings({
      projectSettingsOverrides: {
        [projectId]: { providerInstances: { [modelSelection.instanceId]: { enabled: false } } },
      },
    });

    const retry = yield* ThreadMessageIntake.sendToThread(sendInput);
    assert.equal(retry.message.id, first.message.id);

    const fresh = yield* ThreadMessageIntake.sendToThread({
      ...sendInput,
      commandId: CommandId.make("command:send:fresh-after-disable"),
      messageId: MessageId.make("message:send:fresh-after-disable"),
    }).pipe(Effect.flip);
    if (fresh._tag !== "ThreadManagementProviderInstanceDisabledError") {
      assert.fail(`expected ThreadManagementProviderInstanceDisabledError, got ${fresh._tag}`);
    }
  }).pipe(Effect.provide(Layer.mergeAll(harness.layer, layerFiles)));
});
