import {
  type ComputerActionInput,
  ComputerApp,
  type ComputerAppInput,
  ComputerAppsResult,
  type ComputerError,
  type ComputerGetStateInput,
  ComputerOperationError,
  type ComputerStateResult,
  type ComputerStatus,
  type ComputerTarget,
  ComputerUnavailableError,
  ComputerWindowsResult,
  type ThreadId,
} from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";

import * as ServerConfig from "../config.ts";
import * as ProcessRunner from "../processRunner.ts";

const WindowBounds = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});
const NativeElement = Schema.Struct({
  index: Schema.Int,
  runtimeId: Schema.Array(Schema.Int),
});
const NativeSnapshot = Schema.Struct({
  snapshotId: Schema.String,
  app: ComputerApp,
  windowId: Schema.Int,
  windowTitle: Schema.String,
  windowBounds: Schema.NullOr(WindowBounds),
  treeLines: Schema.Array(Schema.String),
  elements: Schema.Array(NativeElement),
  screenshotBase64: Schema.NullOr(Schema.String),
  screenshotWidth: Schema.NullOr(Schema.Number),
  screenshotHeight: Schema.NullOr(Schema.Number),
  screenshotScale: Schema.NullOr(Schema.Number),
  screenshotError: Schema.NullOr(Schema.Struct({ message: Schema.String })),
});
type NativeSnapshot = typeof NativeSnapshot.Type;
type SavedSnapshot = Pick<
  NativeSnapshot,
  | "snapshotId"
  | "app"
  | "windowId"
  | "windowBounds"
  | "elements"
  | "screenshotWidth"
  | "screenshotHeight"
  | "screenshotScale"
>;
const SnapshotResponse = Schema.Struct({ snapshot: NativeSnapshot });
const Envelope = Schema.Struct({ ok: Schema.Boolean, error: Schema.optional(Schema.String) });
const decodeEnvelope = Schema.decodeUnknownEffect(Envelope);
const RuntimeJson = Schema.fromJsonString(Schema.Unknown);
const encodeRuntimeJson = Schema.encodeEffect(RuntimeJson);
const decodeRuntimeJson = Schema.decodeUnknownEffect(RuntimeJson);

export class ComputerService extends Context.Service<
  ComputerService,
  {
    readonly status: Effect.Effect<ComputerStatus>;
    readonly listApps: Effect.Effect<ComputerAppsResult, ComputerError>;
    readonly listWindows: (
      input: ComputerAppInput,
    ) => Effect.Effect<ComputerWindowsResult, ComputerError>;
    readonly getState: (
      threadId: ThreadId,
      input: ComputerGetStateInput,
    ) => Effect.Effect<ComputerStateResult, ComputerError>;
    readonly action: (
      threadId: ThreadId,
      input: ComputerActionInput,
    ) => Effect.Effect<ComputerStateResult, ComputerError>;
  }
>()("t3/computer/ComputerService") {}

export const make = Effect.gen(function* () {
  const config = yield* ServerConfig.ServerConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const runner = yield* ProcessRunner.ProcessRunner;
  const platform = yield* HostProcess.Platform;
  const environment = yield* HostProcess.Environment;
  const lock = yield* Semaphore.make(1);
  const snapshots = new Map<ThreadId, SavedSnapshot>();

  const status = Effect.gen(function* (): Effect.fn.Return<ComputerStatus> {
    if (platform !== "win32") {
      return {
        available: false,
        platform,
        reason:
          "Computer control requires the native Windows desktop environment; remote environments and WSL are unavailable.",
      };
    }
    if (config.mode !== "desktop" || !config.computerUseRuntimePath) {
      return {
        available: false,
        platform,
        reason: "Computer control is available only in the local Liverary desktop environment.",
      };
    }
    const exists = yield* fs
      .exists(config.computerUseRuntimePath)
      .pipe(Effect.orElseSucceed(() => false));
    return {
      available: exists,
      platform,
      reason: exists
        ? null
        : "The bundled Windows computer-control helper is missing. Reinstall Liverary.",
    };
  });

  const run = Effect.fn("ComputerService.run")(function* <A>(
    operation: Readonly<Record<string, unknown>> & { readonly tool: string },
    schema: Schema.Codec<A>,
  ) {
    const availability = yield* status;
    if (!availability.available) {
      return yield* new ComputerUnavailableError({ message: availability.reason! });
    }
    const fail = (message: string) =>
      new ComputerOperationError({ operation: operation.tool, message });
    const request = yield* encodeRuntimeJson({ ...operation, requestId: 1 }).pipe(
      Effect.mapError(() => fail("The computer operation could not be encoded.")),
    );
    const result = yield* runner
      .run({
        command: path.join(
          environment.SystemRoot ?? environment.SYSTEMROOT ?? "C:\\Windows",
          "System32",
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe",
        ),
        args: [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "RemoteSigned",
          "-File",
          config.computerUseRuntimePath!,
          "-Serve",
        ],
        stdin: `${request}\n`,
        timeout: "30 seconds",
        maxOutputBytes: 4 * 1024 * 1024,
      })
      .pipe(
        Effect.mapError((error) =>
          fail(
            `${error.message}. The operation was not retried; input may already have been delivered.`,
          ),
        ),
      );
    if (result.code !== 0) {
      return yield* fail(
        result.stderr.trim() ||
          "The Windows computer-control helper exited before returning a result. Input may already have been delivered.",
      );
    }
    const lines = result.stdout.trim().split(/\r?\n/);
    const response = yield* decodeRuntimeJson(lines[1] ?? "").pipe(
      Effect.mapError(() =>
        fail(
          "The Windows computer-control helper returned an invalid response. Input may already have been delivered.",
        ),
      ),
    );
    const envelope = yield* decodeEnvelope(response).pipe(
      Effect.mapError(() =>
        fail("The Windows computer-control helper returned an invalid result."),
      ),
    );
    if (!envelope.ok) return yield* fail(envelope.error ?? "The computer operation failed.");
    return yield* Schema.decodeUnknownEffect(schema)(response).pipe(
      Effect.mapError(() =>
        fail("The Windows computer-control helper returned an invalid result."),
      ),
    );
  });

  const saveSnapshot = (threadId: ThreadId, snapshot: NativeSnapshot): ComputerStateResult => {
    const {
      snapshotId,
      app,
      windowId,
      windowBounds,
      elements,
      screenshotWidth,
      screenshotHeight,
      screenshotScale,
    } = snapshot;
    snapshots.set(threadId, {
      snapshotId,
      app,
      windowId,
      windowBounds,
      elements,
      screenshotWidth,
      screenshotHeight,
      screenshotScale,
    });
    const captured =
      snapshot.screenshotBase64 !== null &&
      screenshotWidth !== null &&
      screenshotWidth > 0 &&
      screenshotHeight !== null &&
      screenshotHeight > 0 &&
      screenshotScale !== null &&
      screenshotScale > 0;
    return {
      snapshot: {
        snapshotId,
        app,
        windowId,
        windowTitle: snapshot.windowTitle,
        coordinateSpace: "screenshot",
        tree: snapshot.treeLines.join("\n"),
      },
      screenshot: captured
        ? {
            mimeType: "image/png",
            data: snapshot.screenshotBase64!,
            width: screenshotWidth,
            height: screenshotHeight,
          }
        : null,
      screenshotError: captured
        ? null
        : (snapshot.screenshotError?.message ??
          "The window screenshot could not be captured. Use the accessibility tree; screenshot coordinates are unavailable."),
    };
  };

  const readState = Effect.fn("ComputerService.readState")(function* (
    threadId: ThreadId,
    input: ComputerGetStateInput,
  ) {
    const result = yield* run(
      {
        tool: "get_app_state",
        app: input.app,
        ...(input.windowId === undefined ? {} : { windowId: input.windowId }),
      },
      SnapshotResponse,
    );
    return saveSnapshot(threadId, result.snapshot);
  });

  const element = (snapshot: SavedSnapshot, index: number) => {
    const found = snapshot.elements.find((entry) => entry.index === index);
    return found === undefined
      ? Effect.fail(
          new ComputerOperationError({
            operation: "action",
            message: `Element ${index} is not in this snapshot. Call computer_get_state again.`,
          }),
        )
      : Effect.succeed(found);
  };

  const target = Effect.fn("ComputerService.target")(function* (
    snapshot: SavedSnapshot,
    input: ComputerTarget,
  ) {
    if ("elementIndex" in input) return { element: yield* element(snapshot, input.elementIndex) };
    const { screenshotScale: scale, screenshotWidth: width, screenshotHeight: height } = snapshot;
    if (
      scale === null ||
      scale <= 0 ||
      width === null ||
      height === null ||
      input.x >= width ||
      input.y >= height
    ) {
      return yield* new ComputerOperationError({
        operation: "action",
        message:
          "Coordinates must be inside this snapshot's screenshot. Call computer_get_state for a fresh image.",
      });
    }
    return { x: input.x / scale, y: input.y / scale };
  });

  const action = Effect.fn("ComputerService.action")(function* (
    threadId: ThreadId,
    input: ComputerActionInput,
  ) {
    if (input.action === "launch_app") {
      const launched = yield* run(
        { tool: "launch_app", app: input.app, activate: input.foreground === true },
        Schema.Struct({ app: ComputerApp, windowId: Schema.optional(Schema.NullOr(Schema.Int)) }),
      );
      return yield* readState(threadId, {
        app: `pid:${launched.app.pid}`,
        ...(launched.windowId == null ? {} : { windowId: launched.windowId }),
      });
    }
    const snapshot = snapshots.get(threadId);
    if (snapshot === undefined || snapshot.snapshotId !== input.snapshotId) {
      return yield* new ComputerOperationError({
        operation: input.action,
        message:
          "This is not the latest snapshot for this thread. Call computer_get_state before acting.",
      });
    }
    const base = {
      app: `pid:${snapshot.app.pid}`,
      windowId: snapshot.windowId,
      windowBounds: snapshot.windowBounds,
      restoreWindow: input.foreground === true,
    };
    const operation = yield* Effect.gen(function* () {
      switch (input.action) {
        case "click":
          return {
            ...base,
            tool: "click",
            ...(yield* target(snapshot, input.target)),
            mouse_button: input.button ?? "left",
            click_count: input.count ?? 1,
            modifiers: input.modifiers,
          };
        case "scroll":
          return {
            ...base,
            tool: "scroll",
            ...(yield* target(snapshot, input.target)),
            direction: input.direction,
            pages: input.pages ?? 1,
          };
        case "drag": {
          const from = yield* target(snapshot, input.from);
          const to = yield* target(snapshot, input.to);
          return {
            ...base,
            tool: "drag",
            ...("element" in from
              ? { fromElement: from.element }
              : { from_x: from.x, from_y: from.y }),
            ...("element" in to ? { toElement: to.element } : { to_x: to.x, to_y: to.y }),
          };
        }
        case "type_text":
          return {
            ...base,
            tool: "type_text",
            text: input.text,
            ...(input.elementIndex === undefined
              ? {}
              : { element: yield* element(snapshot, input.elementIndex) }),
          };
        case "paste_text":
          return { ...base, tool: "paste_text", text: input.text };
        case "press_key":
        case "hotkey":
          return { ...base, tool: input.action, key: input.key };
        case "set_value":
          return {
            ...base,
            tool: "set_value",
            element: yield* element(snapshot, input.elementIndex),
            value: input.value,
          };
        case "perform_action":
          return {
            ...base,
            tool: "perform_secondary_action",
            element: yield* element(snapshot, input.elementIndex),
            action: input.name,
          };
      }
    });
    // A failed input can already have changed the window, so its old snapshot cannot be reused.
    snapshots.delete(threadId);
    const result = yield* run(operation, SnapshotResponse);
    return saveSnapshot(threadId, result.snapshot);
  });

  return ComputerService.of({
    status,
    listApps: lock.withPermits(1)(run({ tool: "list_apps" }, ComputerAppsResult)),
    listWindows: Effect.fn("ComputerService.listWindows")((input) =>
      lock.withPermits(1)(run({ tool: "list_windows", app: input.app }, ComputerWindowsResult)),
    ),
    getState: Effect.fn("ComputerService.getState")((threadId, input) =>
      lock.withPermits(1)(readState(threadId, input)),
    ),
    action: Effect.fn("ComputerService.lockedAction")((threadId, input) =>
      lock.withPermits(1)(action(threadId, input)),
    ),
  });
});

export const layer = Layer.effect(ComputerService, make);
