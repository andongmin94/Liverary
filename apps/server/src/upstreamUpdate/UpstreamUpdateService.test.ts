import { describe, expect, it } from "@effect/vitest";
import {
  DEFAULT_SERVER_SETTINGS,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  RunId,
  ThreadId,
  CommandId,
  type OrchestrationV2ThreadShell,
  type Project,
  type ServerProvider,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import * as TestClock from "effect/testing/TestClock";

import * as CommandReceiptStore from "../orchestration-v2/CommandReceiptStore.ts";
import * as ThreadLaunchService from "../orchestration-v2/ThreadLaunchService.ts";
import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as ProjectService from "../project/ProjectService.ts";
import * as ProviderRegistry from "../provider/ProviderRegistry.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import * as UpstreamUpdates from "./UpstreamUpdateService.ts";

const upstreamSha = "a".repeat(40);
const publishedSha = "b".repeat(40);
const mainSha = "c".repeat(40);
const projectId = ProjectId.make("liverary-source");
const now = "2026-11-01T00:00:00.000Z";
const project: Project = {
  id: projectId,
  title: "Liverary",
  workspaceRoot: "/source/liverary",
  defaultModelSelection: null,
  scripts: [],
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
};
const modelSelection = {
  instanceId: ProviderInstanceId.make("my-codex-subscription"),
  model: "gpt-5.1-codex",
  options: [{ id: "reasoningEffort", value: "high" }],
};
const provider: ServerProvider = {
  instanceId: modelSelection.instanceId,
  driver: ProviderDriverKind.make("codex"),
  enabled: true,
  installed: true,
  version: "1.0.0",
  status: "ready",
  auth: { status: "authenticated", type: "chatgpt" },
  checkedAt: now,
  models: [{ slug: modelSelection.model, name: "Codex", isCustom: false, capabilities: null }],
  slashCommands: [],
  skills: [],
};

function harness(beforeResponse = Effect.void) {
  const state = {
    upstreamTag: "v0.1.7",
    upstreamSha,
    draft: false,
    prerelease: false,
    publishedIncludes: false,
    integrated: false,
    manifestVersion: "1.2.3",
    compareStatus: 200,
    remote: "git@github.com:andongmin94/t3-custom.git",
    pushRemote: "https://github.com/andongmin94/t3-custom.git",
    dirty: "",
    provider,
    providerEnabled: true,
    failBeforeMessage: false,
    failBeforePreparation: false,
  };
  const requests: string[] = [];
  const gitCalls: ReadonlyArray<string>[] = [];
  const launches: ThreadLaunchService.ThreadLaunchInput[] = [];
  const preparations: ThreadLaunchService.ThreadLaunchPreparationInput[] = [];
  const receipts = new Map<CommandId, CommandReceiptStore.CommandReceiptV2>();
  const threads = new Map<ThreadId, OrchestrationV2ThreadShell>();
  const http = HttpClient.make((request) => {
    const path = new URL(request.url).pathname.replace("/repos/", "");
    requests.push(path);
    let body: unknown;
    let status = 200;
    if (path === "pingdotgg/t3code/releases/latest") {
      body = {
        tag_name: state.upstreamTag,
        draft: state.draft,
        prerelease: state.prerelease,
        target_commitish: "main",
      };
    } else if (path === "andongmin94/t3-custom/releases/latest") {
      body = { tag_name: "v1.2.3", draft: false, prerelease: false, target_commitish: "main" };
    } else if (path === `pingdotgg/t3code/commits/${state.upstreamTag}`) {
      body = { sha: state.upstreamSha };
    } else if (path === "andongmin94/t3-custom/commits/v1.2.3") {
      body = { sha: publishedSha };
    } else if (path === "andongmin94/t3-custom/commits/main") {
      body = { sha: mainSha };
    } else if (path.startsWith("andongmin94/t3-custom/compare/")) {
      status = state.compareStatus;
      body = {
        status: (path.endsWith(publishedSha) ? state.publishedIncludes : state.integrated)
          ? "ahead"
          : "diverged",
      };
    } else if (path === "andongmin94/t3-custom/contents/.github/liverary-release.json") {
      expect(new URL(request.url).searchParams.get("ref")).toBe(mainSha);
      body = {
        version: state.manifestVersion,
        changes: "변경",
        base_sha: publishedSha,
        upstream_sha: upstreamSha,
      };
    } else {
      status = 404;
      body = {};
    }
    return beforeResponse.pipe(
      Effect.as(
        HttpClientResponse.fromWeb(request, new Response(JSON.stringify(body), { status })),
      ),
    );
  });
  const layer = UpstreamUpdates.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(HttpClient.HttpClient, http),
        Layer.mock(ProjectService.ProjectService)({
          getById: () => Effect.succeedSome(project),
        }),
        Layer.mock(GitVcsDriver.GitVcsDriver)({
          execute: (input) => {
            gitCalls.push(input.args);
            return Effect.succeed({
              exitCode: ChildProcessSpawner.ExitCode(0),
              stdout:
                input.args[0] === "status"
                  ? state.dirty
                  : input.args.includes("--push")
                    ? state.pushRemote
                    : state.remote,
              stderr: "",
              stdoutTruncated: false,
              stderrTruncated: false,
            });
          },
        }),
        Layer.mock(ProviderRegistry.ProviderRegistry)({
          refreshInstance: () => Effect.succeed([state.provider]),
        }),
        Layer.mock(ServerSettings.ServerSettingsService)({
          getSettings: Effect.succeed({
            ...DEFAULT_SERVER_SETTINGS,
            defaultRuntimeMode: "full-access",
            projectSettingsOverrides: { [projectId]: { defaultRuntimeMode: "approval-required" } },
          }),
        }),
        Layer.mock(CommandReceiptStore.CommandReceiptStoreV2)({
          getByCommandId: (id) => Effect.sync(() => Option.fromUndefinedOr(receipts.get(id))),
        }),
        Layer.mock(ThreadManagementService.ThreadManagementService)({
          getThreadShell: (id) => Effect.sync(() => threads.get(id) ?? null),
          isProviderInstanceEnabledForProject: () => Effect.succeed(state.providerEnabled),
        }),
        Layer.mock(ThreadLaunchService.ThreadLaunchService)({
          launch: (input) =>
            Effect.gen(function* () {
              launches.push(input);
              yield* Effect.yieldNow;
              const threadId =
                receipts.get(input.commandId)?.threadId ??
                ThreadId.make(`update-${launches.length}`);
              receipts.set(input.commandId, {
                commandId: input.commandId,
                threadId,
                commandType: "thread.create",
                status: "accepted",
                acceptedAt: DateTime.makeUnsafe(now),
                resultSequence: 1,
                error: null,
              });
              threads.set(threadId, {
                id: threadId,
                projectId,
                modelSelection: input.modelSelection,
                runtimeMode: input.runtimeMode,
                interactionMode: input.interactionMode,
                activeRunId: null,
                activityRunStatus: null,
                archivedAt: null,
                deletedAt: null,
              } as OrchestrationV2ThreadShell);
              if (state.failBeforeMessage)
                return yield* new ThreadLaunchService.ThreadLaunchError({
                  operation: "dispatch-message",
                  commandId: input.commandId,
                  projectId,
                  threadId,
                  cause: "test interruption",
                });
              const messageCommandId = CommandId.make(`${input.commandId}:initial-message`);
              receipts.set(messageCommandId, {
                commandId: messageCommandId,
                threadId,
                commandType: "message.dispatch",
                status: "accepted",
                acceptedAt: DateTime.makeUnsafe(now),
                resultSequence: 2,
                error: null,
              });
              if (state.failBeforePreparation) {
                threads.set(threadId, {
                  ...threads.get(threadId)!,
                  activeRunId: RunId.make("initial-update-run"),
                  activityRunStatus: "preparing",
                });
                return yield* new ThreadLaunchService.ThreadLaunchError({
                  operation: "release-run",
                  commandId: input.commandId,
                  projectId,
                  threadId,
                  cause: "test interruption before preparation fork",
                });
              }
              return {
                threadId,
                projection: {},
                resumed: false,
              } as ThreadLaunchService.ThreadLaunchResult;
            }),
          prepareRun: (input) =>
            Effect.sync(() => {
              preparations.push(input);
              const thread = threads.get(input.threadId)!;
              threads.set(input.threadId, { ...thread, activityRunStatus: "running" });
            }),
        }),
      ),
    ),
  );
  return { state, requests, gitCalls, launches, preparations, threads, layer };
}

const launchInput = { projectId, modelSelection, upstreamSha };

describe("upstream release status", () => {
  it.effect("shares concurrent checks and refreshes successful results after thirty seconds", () =>
    Effect.gen(function* () {
      const requested = yield* Deferred.make<void>();
      const releaseResponse = yield* Deferred.make<void>();
      const h = harness(
        Deferred.succeed(requested, undefined).pipe(
          Effect.andThen(Deferred.await(releaseResponse)),
        ),
      );
      yield* Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        const pending = yield* Effect.all([service.check(), service.check()], {
          concurrency: "unbounded",
        }).pipe(Effect.forkScoped);
        yield* Deferred.await(requested);
        yield* Deferred.succeed(releaseResponse, undefined);
        const results = yield* Fiber.join(pending);
        expect(results.map((result) => result.status)).toEqual(["available", "available"]);
        expect(h.requests).toHaveLength(8);

        h.state.publishedIncludes = true;
        h.state.integrated = true;
        yield* TestClock.adjust("29 seconds");
        expect((yield* service.check()).status).toBe("available");
        expect(h.requests).toHaveLength(8);
        yield* TestClock.adjust("1 second");
        expect((yield* service.check()).status).toBe("up-to-date");
        expect(h.requests).toHaveLength(16);
      }).pipe(Effect.provide(h.layer), Effect.scoped);
    }),
  );

  it.effect("compares the published tag commit rather than moving target_commitish", () => {
    const h = harness();
    h.state.publishedIncludes = true;
    h.state.integrated = true;
    return Effect.gen(function* () {
      const service = yield* UpstreamUpdates.UpstreamUpdateService;
      expect((yield* service.check()).status).toBe("up-to-date");
      expect(yield* service.launch(launchInput).pipe(Effect.flip)).toMatchObject({
        reason: "up-to-date",
      });
      expect(h.requests).toContain(
        `andongmin94/t3-custom/compare/${upstreamSha}...${publishedSha}`,
      );
      expect(h.gitCalls).toHaveLength(0);
      expect(h.launches).toHaveLength(0);
    }).pipe(Effect.provide(h.layer));
  });

  it.effect.each(["integrated", "release-request"] as const)(
    "keeps %s work pending until publication",
    (pending) => {
      const h = harness();
      h.state.integrated = true;
      h.state.publishedIncludes = pending === "release-request";
      h.state.manifestVersion = pending === "release-request" ? "1.2.4" : "1.2.3";
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        const result = yield* service.check();
        expect(result.status).toBe("pending");
        expect(result.releaseRequested).toBe(pending === "release-request");
        expect((yield* service.launch(launchInput)).resumed).toBe(false);
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect.each(["draft", "prerelease", "candidate"] as const)(
    "rejects %s releases even if returned by latest",
    (invalid) => {
      const h = harness();
      if (invalid === "candidate") h.state.upstreamTag = "v0.1.7-rc.1";
      else h.state[invalid] = true;
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        expect(yield* service.check().pipe(Effect.flip)).toMatchObject({
          reason: "invalid-release",
        });
        expect(h.launches).toHaveLength(0);
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect(
    "offers an update when the verified upstream commit is not yet reachable in the fork",
    () => {
      const h = harness();
      h.state.compareStatus = 404;
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        expect((yield* service.check()).status).toBe("available");
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect("does not mistake a failed comparison for an update decision", () => {
    const h = harness();
    h.state.compareStatus = 403;
    return Effect.gen(function* () {
      const service = yield* UpstreamUpdates.UpstreamUpdateService;
      expect(yield* service.check().pipe(Effect.flip)).toMatchObject({
        reason: "github-unavailable",
      });
      h.state.compareStatus = 200;
      expect((yield* service.check()).status).toBe("available");
      expect(h.requests.filter((path) => path === "pingdotgg/t3code/releases/latest")).toHaveLength(
        2,
      );
    }).pipe(Effect.provide(h.layer));
  });
});

describe("native subscription-agent launch", () => {
  it.effect(
    "preserves the selected instance/model/options and project approval policy in the root workspace",
    () => {
      const h = harness();
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        expect((yield* service.check()).status).toBe("available");
        yield* service.launch(launchInput);
        expect(h.launches[0]).toMatchObject({
          modelSelection,
          runtimeMode: "approval-required",
          workspaceStrategy: { type: "root" },
        });
        expect(h.launches[0]?.initialMessage?.text).toContain(upstreamSha);
        expect(h.launches[0]?.initialMessage?.text).toContain(".github/upstream-maintenance.md");
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect.each(["new-release", "published"] as const)(
    "revalidates %s despite a cached update before touching a source checkout",
    (changed) => {
      const h = harness();
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        yield* service.check();
        if (changed === "new-release") h.state.upstreamSha = "d".repeat(40);
        else {
          h.state.publishedIncludes = true;
          h.state.integrated = true;
        }
        expect((yield* service.check()).status).toBe("available");
        expect(h.requests).toHaveLength(8);
        expect(yield* service.launch(launchInput).pipe(Effect.flip)).toMatchObject({
          reason: changed === "new-release" ? "release-changed" : "up-to-date",
        });
        expect(h.gitCalls).toHaveLength(0);
        expect(h.launches).toHaveLength(0);
        expect(
          h.requests.filter((path) => path === "pingdotgg/t3code/releases/latest"),
        ).toHaveLength(2);
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect.each(["wrong-origin", "wrong-push", "dirty"] as const)(
    "refuses %s without starting an agent",
    (invalid) => {
      const h = harness();
      if (invalid === "wrong-origin") h.state.remote = "https://secret@example.com/other/repo.git";
      if (invalid === "wrong-push") h.state.pushRemote = "git@github.com:pingdotgg/t3code.git";
      if (invalid === "dirty") h.state.dirty = " M README.md";
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        const error = yield* service.launch(launchInput).pipe(Effect.flip);
        expect(error.reason).toBe(
          invalid === "dirty" ? "source-checkout-dirty" : "source-repository-mismatch",
        );
        expect(JSON.stringify(error)).not.toContain("secret");
        expect(h.launches).toHaveLength(0);
        expect(h.gitCalls.every((args) => ["remote", "status"].includes(args[0]!))).toBe(true);
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect.each([
    { status: "authenticated", type: "apiKey" },
    { status: "authenticated", type: "unknown" },
    { status: "unauthenticated", type: "chatgpt" },
  ] as const)("rejects $status/$type connections", (auth) => {
    const h = harness();
    h.state.provider = { ...provider, auth };
    return Effect.gen(function* () {
      const service = yield* UpstreamUpdates.UpstreamUpdateService;
      expect(yield* service.launch(launchInput).pipe(Effect.flip)).toMatchObject({
        reason: "provider-not-supported",
      });
      expect(h.launches).toHaveLength(0);
    }).pipe(Effect.provide(h.layer));
  });

  it.effect("accepts a known Claude subscription and rejects its API-key override", () => {
    const h = harness();
    h.state.provider = {
      ...provider,
      driver: ProviderDriverKind.make("claudeAgent"),
      auth: { status: "authenticated", type: "claudeMax5xSubscription" },
    };
    return Effect.gen(function* () {
      const service = yield* UpstreamUpdates.UpstreamUpdateService;
      const result = yield* service.launch(launchInput);
      h.threads.delete(result.threadId);
      h.state.provider = { ...h.state.provider, auth: { status: "authenticated", type: "apiKey" } };
      expect(yield* service.launch(launchInput).pipe(Effect.flip)).toMatchObject({
        reason: "provider-not-supported",
      });
      expect(h.launches).toHaveLength(1);
    }).pipe(Effect.provide(h.layer));
  });

  it.effect(
    "coalesces concurrent clicks and reopens a live thread before dirty-checking its work",
    () => {
      const h = harness();
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        const results = yield* Effect.all(
          [service.launch(launchInput), service.launch(launchInput)],
          { concurrency: "unbounded" },
        );
        expect(results[0]?.threadId).toBe(results[1]?.threadId);
        expect(results.map((result) => result.resumed).sort()).toEqual([false, true]);
        h.state.dirty = " M README.md";
        const gitReads = h.gitCalls.length;
        expect(
          yield* service.launch({
            ...launchInput,
            modelSelection: { ...modelSelection, model: "different-model" },
          }),
        ).toEqual({ threadId: results[0]!.threadId, resumed: true });
        expect(h.gitCalls).toHaveLength(gitReads);
        expect(h.launches).toHaveLength(1);
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect("completes a partial native launch instead of reopening an empty conversation", () => {
    const h = harness();
    h.state.failBeforeMessage = true;
    return Effect.gen(function* () {
      const service = yield* UpstreamUpdates.UpstreamUpdateService;
      expect(yield* service.launch(launchInput).pipe(Effect.flip)).toMatchObject({
        reason: "launch-failed",
      });
      h.state.failBeforeMessage = false;
      const result = yield* service.launch(launchInput);
      expect(result.resumed).toBe(false);
      expect(h.launches).toHaveLength(2);
      expect(h.launches[0]?.commandId).toBe(h.launches[1]?.commandId);
      expect(h.threads.size).toBe(1);
    }).pipe(Effect.provide(h.layer));
  });

  it.effect(
    "resumes accepted preparation without another turn, dirty preflight, or changed model/policy",
    () => {
      const h = harness();
      h.state.failBeforePreparation = true;
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        expect(yield* service.launch(launchInput).pipe(Effect.flip)).toMatchObject({
          reason: "launch-failed",
        });
        const gitReads = h.gitCalls.length;
        h.state.dirty = " M README.md";
        const result = yield* service.launch({
          ...launchInput,
          modelSelection: { ...modelSelection, model: "different-model" },
        });
        expect(result.resumed).toBe(true);
        expect(h.launches).toHaveLength(1);
        expect(h.gitCalls).toHaveLength(gitReads);
        expect(h.preparations).toEqual([
          {
            commandId: h.launches[0]!.commandId,
            threadId: result.threadId,
            runId: RunId.make("initial-update-run"),
          },
        ]);
        expect(h.threads.get(result.threadId)).toMatchObject({
          modelSelection,
          runtimeMode: "approval-required",
          activityRunStatus: "running",
        });
        yield* service.launch(launchInput);
        expect(h.preparations).toHaveLength(1);
      }).pipe(Effect.provide(h.layer));
    },
  );

  it.effect.each(["archived", "deleted"] as const)(
    "allows a fresh launch after the prior conversation is %s",
    (closed) => {
      const h = harness();
      return Effect.gen(function* () {
        const service = yield* UpstreamUpdates.UpstreamUpdateService;
        const first = yield* service.launch(launchInput);
        if (closed === "deleted") h.threads.delete(first.threadId);
        else
          h.threads.set(first.threadId, {
            ...h.threads.get(first.threadId)!,
            archivedAt: DateTime.makeUnsafe(now),
          });
        const second = yield* service.launch(launchInput);
        expect(second.resumed).toBe(false);
        expect(second.threadId).not.toBe(first.threadId);
        expect(h.launches).toHaveLength(2);
      }).pipe(Effect.provide(h.layer));
    },
  );
});
