import { expect, it } from "@effect/vitest";
import {
  type ComputerStateResult,
  EnvironmentId,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { McpSchema, McpServer } from "effect/ai";

import * as ComputerService from "../../../computer/ComputerService.ts";
import * as ThreadManagement from "../../../orchestration-v2/ThreadManagementService.ts";
import * as McpHttpServer from "../../McpHttpServer.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import { liveThreadShell, liveThreadsLayer } from "../../McpToolAccess.testkit.ts";

const threadId = ThreadId.make("computer-thread");
const invocation: McpInvocationContext.McpInvocationScope = {
  environmentId: EnvironmentId.make("windows-desktop"),
  requestNamespace: "computer-session",
  capabilities: new Set(["computer"]),
  issuedAt: 1,
  thread: {
    threadId,
    providerSessionId: "computer-session",
    providerInstanceId: ProviderInstanceId.make("codex"),
  },
  client: undefined,
};
const client = McpSchema.McpServerClient.of({
  clientId: 1,
  clientCapabilities: {},
  clientInfo: { name: "computer-test", version: "1.0.0" },
  protocolVersion: "2025-06-18",
  initializePayload: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "computer-test", version: "1.0.0" },
  },
  getClient: Effect.die("unused"),
});
const app = { name: "notepad", pid: 41 };
const state: ComputerStateResult = {
  snapshot: {
    snapshotId: "snapshot-a",
    app,
    windowId: 5001,
    windowTitle: "Notes",
    coordinateSpace: "screenshot",
    tree: "0 Window Notes\n  3 Edit text",
  },
  screenshot: { mimeType: "image/png", data: "aW1hZ2U=", width: 1000, height: 500 },
  screenshotError: null,
};
const layer = (result = state, plan = false) =>
  McpHttpServer.layerComputerToolkit.pipe(
    Layer.provideMerge(McpHttpServer.layerInProcessMcpServer),
    Layer.provideMerge(
      plan
        ? Layer.mock(ThreadManagement.ThreadManagementService)({
            getThreadShell: (id) =>
              Effect.succeed(liveThreadShell(id, { interactionMode: "plan" })),
          })
        : liveThreadsLayer,
    ),
    Layer.provide(
      Layer.succeed(ComputerService.ComputerService, {
        status: Effect.succeed({ available: true, platform: "win32", reason: null }),
        listApps: Effect.succeed({ apps: [app] }),
        listWindows: () =>
          Effect.succeed({
            app,
            windows: [{ id: 5001, title: "Notes", width: 2000, height: 1000 }],
          }),
        getState: (caller, input) => {
          expect(caller).toBe(threadId);
          expect(input.app).toBe("pid:41");
          return Effect.succeed(result);
        },
        action: (caller, input) => {
          expect(caller).toBe(threadId);
          expect(input).toEqual({
            action: "click",
            snapshotId: "snapshot-a",
            target: { elementIndex: 3 },
          });
          if (plan) return Effect.die("Plan mode must not send input.");
          return Effect.succeed(result);
        },
      }),
    ),
  );

it.effect(
  "routes native app tools through the calling thread and returns screenshots as MCP images",
  () =>
    Effect.gen(function* () {
      const server = yield* McpServer.McpServer;
      for (const name of ["computer_status", "computer_list_apps"]) {
        expect(
          server.tools.find((entry) => entry.tool.name === name)?.tool.inputSchema,
        ).toMatchObject({ type: "object" });
        expect((yield* server.callTool({ name, arguments: {} })).isError).toBe(false);
      }
      const windows = yield* server.callTool({
        name: "computer_list_windows",
        arguments: { app: "pid:41" },
      });
      expect(windows.isError).toBe(false);
      const observed = yield* server.callTool({
        name: "computer_get_state",
        arguments: { app: "pid:41" },
      });
      expect(observed.content.map((item) => item.type)).toEqual(["text", "image"]);
      expect(observed.structuredContent).toMatchObject({
        snapshot: { snapshotId: "snapshot-a", windowId: 5001 },
        screenshot: { mimeType: "image/png", width: 1000, height: 500 },
      });
      expect(JSON.stringify(observed.structuredContent)).not.toContain("aW1hZ2U=");
      const acted = yield* server.callTool({
        name: "computer_action",
        arguments: { action: "click", snapshotId: "snapshot-a", target: { elementIndex: 3 } },
      });
      expect(acted.isError).toBe(false);
      expect(acted.content.map((item) => item.type)).toEqual(["text", "image"]);
    }).pipe(
      Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
      Effect.provideService(McpSchema.McpServerClient, client),
      Effect.provide(layer()),
    ),
);

it.effect("refuses absent computer grants and hides the tools from external MCP callers", () =>
  Effect.gen(function* () {
    const server = yield* McpServer.McpServer;
    const getState = (scope: McpInvocationContext.McpInvocationContext["Service"]) =>
      server
        .callTool({ name: "computer_get_state", arguments: { app: "pid:41" } })
        .pipe(Effect.provideService(McpInvocationContext.McpInvocationContext, scope));

    const denied = yield* getState({
      ...invocation,
      capabilities: new Set<McpInvocationContext.McpCapability>(),
    });
    expect(denied.isError).toBe(true);
    expect(denied.content.every((item) => item.type !== "image")).toBe(true);

    const outside = yield* getState({
      ...invocation,
      thread: undefined,
      client: { sessionId: "outside", label: "outside", access: "full-access" as const },
    }).pipe(Effect.flip);
    expect(String(outside)).toContain("computer_get_state");
  }).pipe(Effect.provideService(McpSchema.McpServerClient, client), Effect.provide(layer())),
);

it.effect("allows observing in plan mode but refuses native input", () =>
  Effect.gen(function* () {
    const server = yield* McpServer.McpServer;
    const observed = yield* server.callTool({
      name: "computer_get_state",
      arguments: { app: "pid:41" },
    });
    expect(observed.isError).toBe(false);
    const denied = yield* server.callTool({
      name: "computer_action",
      arguments: { action: "click", snapshotId: "snapshot-a", target: { elementIndex: 3 } },
    });
    expect(denied.isError).toBe(true);
    expect(denied.structuredContent).toMatchObject({
      error: { _tag: "OrchestratorMcpFailure", message: expect.stringContaining("plan mode") },
    });
  }).pipe(
    Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
    Effect.provideService(McpSchema.McpServerClient, client),
    Effect.provide(layer(state, true)),
  ),
);

it.effect("returns a text-only observation when the helper could not capture the window", () =>
  Effect.gen(function* () {
    const server = yield* McpServer.McpServer;
    const observed = yield* server.callTool({
      name: "computer_get_state",
      arguments: { app: "pid:41" },
    });
    expect(observed.isError).toBe(false);
    expect(observed.content.map((item) => item.type)).toEqual(["text"]);
    expect(observed.structuredContent).toMatchObject({
      screenshot: null,
      screenshotError: "Window capture failed.",
      snapshot: { tree: "0 Window Notes\n  3 Edit text" },
    });
  }).pipe(
    Effect.provideService(McpInvocationContext.McpInvocationContext, invocation),
    Effect.provideService(McpSchema.McpServerClient, client),
    Effect.provide(
      layer({ ...state, screenshot: null, screenshotError: "Window capture failed." }),
    ),
  ),
);
