import { describe, expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ThreadId } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import * as ServerConfig from "../config.ts";
import * as ProcessRunner from "../processRunner.ts";
import { make } from "./ComputerService.ts";

const threadA = ThreadId.make("computer-thread-a");
const threadB = ThreadId.make("computer-thread-b");
const nativeSnapshot = {
  snapshotId: "snapshot-a",
  app: { name: "notepad", pid: 41 },
  windowId: 5001,
  windowTitle: "Notes",
  windowBounds: { x: -1400, y: 20, width: 2000, height: 1000 },
  treeLines: ["0 Window Notes", "  3 Edit text"],
  elements: [{ index: 3, runtimeId: [42, 7] }],
  screenshotBase64: "aW1hZ2U=",
  screenshotWidth: 1000,
  screenshotHeight: 500,
  screenshotScale: 0.5,
  screenshotError: null,
};

const fixture = Effect.fn("ComputerService.test.fixture")(function* (
  replies: ReadonlyArray<unknown>,
  options: {
    readonly platform?: NodeJS.Platform;
    readonly mode?: "desktop" | "web";
    readonly runtimePath?: string | null;
    readonly exists?: boolean;
  } = {},
) {
  const config = yield* ServerConfig.ServerConfig;
  const requests: Array<Record<string, unknown>> = [];
  const responses = [...replies];
  const service = yield* make.pipe(
    Effect.provideService(ServerConfig.ServerConfig, {
      ...config,
      mode: options.mode ?? "desktop",
      computerUseRuntimePath:
        options.runtimePath === null ? undefined : (options.runtimePath ?? "/computer/runtime.ps1"),
    }),
    Effect.provideService(HostProcess.Platform, options.platform ?? "win32"),
    Effect.provideService(
      FileSystem.FileSystem,
      FileSystem.makeNoop({ exists: () => Effect.succeed(options.exists ?? true) }),
    ),
    Effect.provideService(ProcessRunner.ProcessRunner, {
      run: (input) =>
        Effect.sync(() => {
          requests.push(JSON.parse(input.stdin!) as Record<string, unknown>);
          const response = responses.shift();
          if (response === undefined)
            throw new Error("The computer helper was called unexpectedly.");
          return {
            code: ChildProcessSpawner.ExitCode(0),
            stdout: `${JSON.stringify({ ready: true })}\n${JSON.stringify(response)}\n`,
            stderr: "",
            timedOut: false,
            stdoutTruncated: false,
            stderrTruncated: false,
            stdoutInvalidUtf8: false,
            stderrInvalidUtf8: false,
          };
        }),
    }),
  );
  return { service, requests };
});

const layer = ServerConfig.layerTest(process.cwd(), { prefix: "liverary-computer-test-" }).pipe(
  Layer.provideMerge(NodeServices.layer),
);

describe("ComputerService", () => {
  it.effect.each([
    { platform: "linux" as const },
    { mode: "web" as const },
    { runtimePath: null },
    { exists: false },
  ])("reports an unavailable host without invoking the Windows helper (%j)", (options) =>
    Effect.gen(function* () {
      const { service } = yield* fixture([], options);
      expect((yield* service.status).available).toBe(false);
      const error = yield* Effect.flip(service.listApps);
      expect(error._tag).toBe("ComputerUnavailableError");
    }).pipe(Effect.provide(layer)),
  );

  it.effect("binds screenshot coordinates to the observed process, window and scale", () =>
    Effect.gen(function* () {
      const { service, requests } = yield* fixture([
        { ok: true, snapshot: nativeSnapshot },
        { ok: true, snapshot: { ...nativeSnapshot, snapshotId: "snapshot-after-click" } },
      ]);
      const observed = yield* service.getState(threadA, { app: "notepad", windowId: 5001 });
      expect(observed.snapshot.tree).toBe("0 Window Notes\n  3 Edit text");
      expect(observed.screenshot).toEqual({
        mimeType: "image/png",
        data: "aW1hZ2U=",
        width: 1000,
        height: 500,
      });
      const after = yield* service.action(threadA, {
        action: "click",
        snapshotId: "snapshot-a",
        target: { x: 100, y: 50 },
        foreground: true,
      });
      expect(requests[1]).toMatchObject({
        tool: "click",
        app: "pid:41",
        windowId: 5001,
        windowBounds: { x: -1400, y: 20, width: 2000, height: 1000 },
        x: 200,
        y: 100,
        restoreWindow: true,
        mouse_button: "left",
        click_count: 1,
      });
      expect(after.snapshot.snapshotId).toBe("snapshot-after-click");
      const stale = yield* Effect.flip(
        service.action(threadA, {
          action: "click",
          snapshotId: "snapshot-a",
          target: { elementIndex: 3 },
        }),
      );
      expect(stale.message).toContain("latest snapshot");
    }).pipe(Effect.provide(layer)),
  );

  it.effect("keeps each thread's element references bound to its own snapshot", () =>
    Effect.gen(function* () {
      const { service, requests } = yield* fixture([
        { ok: true, snapshot: nativeSnapshot },
        {
          ok: true,
          snapshot: {
            ...nativeSnapshot,
            snapshotId: "snapshot-b",
            app: { name: "notepad", pid: 52 },
            windowId: 6001,
            elements: [{ index: 3, runtimeId: [88, 9] }],
          },
        },
        { ok: true, snapshot: { ...nativeSnapshot, snapshotId: "snapshot-a-new" } },
      ]);
      yield* service.getState(threadA, { app: "pid:41" });
      yield* service.getState(threadB, { app: "pid:52" });
      const crossThread = yield* Effect.flip(
        service.action(threadB, {
          action: "set_value",
          snapshotId: "snapshot-a",
          elementIndex: 3,
          value: "",
        }),
      );
      expect(crossThread.message).toContain("latest snapshot");
      yield* service.action(threadA, {
        action: "set_value",
        snapshotId: "snapshot-a",
        elementIndex: 3,
        value: "",
      });
      expect(requests[2]).toMatchObject({
        tool: "set_value",
        app: "pid:41",
        windowId: 5001,
        element: { index: 3, runtimeId: [42, 7] },
        value: "",
      });
    }).pipe(Effect.provide(layer)),
  );

  it.effect("refuses missing elements and out-of-image coordinates before sending input", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture([{ ok: true, snapshot: nativeSnapshot }]);
      yield* service.getState(threadA, { app: "notepad" });
      const missing = yield* Effect.flip(
        service.action(threadA, {
          action: "click",
          snapshotId: "snapshot-a",
          target: { elementIndex: 99 },
        }),
      );
      expect(missing.message).toContain("Element 99");
      const outside = yield* Effect.flip(
        service.action(threadA, {
          action: "click",
          snapshotId: "snapshot-a",
          target: { x: 1000, y: 20 },
        }),
      );
      expect(outside.message).toContain("inside this snapshot");
    }).pipe(Effect.provide(layer)),
  );

  it.effect("returns a readable tree when capture fails and refuses screenshot coordinates", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture([
        {
          ok: true,
          snapshot: {
            ...nativeSnapshot,
            screenshotBase64: null,
            screenshotWidth: null,
            screenshotHeight: null,
            screenshotScale: null,
            screenshotError: { message: "The window could not be captured." },
          },
        },
      ]);
      const state = yield* service.getState(threadA, { app: "notepad" });
      expect(state.snapshot.tree).toContain("3 Edit text");
      expect(state.screenshot).toBeNull();
      expect(state.screenshotError).toBe("The window could not be captured.");
      const failure = yield* Effect.flip(
        service.action(threadA, {
          action: "click",
          snapshotId: "snapshot-a",
          target: { x: 10, y: 10 },
        }),
      );
      expect(failure.message).toContain("fresh image");
    }).pipe(Effect.provide(layer)),
  );

  it.effect("does not repeat a failed input and invalidates the pre-action snapshot", () =>
    Effect.gen(function* () {
      const { service } = yield* fixture([
        { ok: true, snapshot: nativeSnapshot },
        { ok: false, error: "window_not_responding: the action may already have been delivered" },
      ]);
      yield* service.getState(threadA, { app: "notepad" });
      const first = yield* Effect.flip(
        service.action(threadA, {
          action: "type_text",
          snapshotId: "snapshot-a",
          text: "hello",
          elementIndex: 3,
        }),
      );
      expect(first.message).toContain("may already have been delivered");
      const retry = yield* Effect.flip(
        service.action(threadA, {
          action: "type_text",
          snapshotId: "snapshot-a",
          text: "hello",
          elementIndex: 3,
        }),
      );
      expect(retry.message).toContain("latest snapshot");
    }).pipe(Effect.provide(layer)),
  );

  it.effect("observes the returned process after launching an app", () =>
    Effect.gen(function* () {
      const { service, requests } = yield* fixture([
        { ok: true, app: { name: "notepad", pid: 41 }, launched: true },
        { ok: true, snapshot: nativeSnapshot },
      ]);
      const result = yield* service.action(threadA, { action: "launch_app", app: "notepad.exe" });
      expect(requests).toEqual([
        { tool: "launch_app", app: "notepad.exe", activate: false, requestId: 1 },
        { tool: "get_app_state", app: "pid:41", requestId: 1 },
      ]);
      expect(result.snapshot.windowId).toBe(5001);
    }).pipe(Effect.provide(layer)),
  );
});
