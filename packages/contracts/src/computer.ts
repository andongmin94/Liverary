import * as Schema from "effect/Schema";

const PositiveInt = Schema.Int.check(Schema.isGreaterThan(0));
const ElementIndex = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const ComputerStatus = Schema.Struct({
  available: Schema.Boolean,
  platform: Schema.String,
  reason: Schema.NullOr(Schema.String),
});
export type ComputerStatus = typeof ComputerStatus.Type;

export const ComputerApp = Schema.Struct({
  name: Schema.String,
  pid: PositiveInt,
});
export type ComputerApp = typeof ComputerApp.Type;

export const ComputerWindow = Schema.Struct({
  id: PositiveInt,
  title: Schema.String,
  width: Schema.Number,
  height: Schema.Number,
});

export const ComputerAppsResult = Schema.Struct({ apps: Schema.Array(ComputerApp) });
export type ComputerAppsResult = typeof ComputerAppsResult.Type;

export const ComputerAppInput = Schema.Struct({
  app: Schema.NonEmptyString.annotate({
    description: "App name or pid:<number> from computer_list_apps.",
  }),
});
export type ComputerAppInput = typeof ComputerAppInput.Type;

export const ComputerWindowsResult = Schema.Struct({
  app: ComputerApp,
  windows: Schema.Array(ComputerWindow),
});
export type ComputerWindowsResult = typeof ComputerWindowsResult.Type;

export const ComputerGetStateInput = Schema.Struct({
  ...ComputerAppInput.fields,
  windowId: Schema.optional(PositiveInt),
});
export type ComputerGetStateInput = typeof ComputerGetStateInput.Type;

export const ComputerSnapshot = Schema.Struct({
  snapshotId: Schema.String,
  app: ComputerApp,
  windowId: PositiveInt,
  windowTitle: Schema.String,
  coordinateSpace: Schema.Literal("screenshot"),
  tree: Schema.String,
});
export type ComputerSnapshot = typeof ComputerSnapshot.Type;

export const ComputerStateResult = Schema.Struct({
  snapshot: ComputerSnapshot,
  screenshot: Schema.NullOr(
    Schema.Struct({
      mimeType: Schema.Literal("image/png"),
      data: Schema.String,
      width: PositiveInt,
      height: PositiveInt,
    }),
  ),
  screenshotError: Schema.NullOr(Schema.String),
});
export type ComputerStateResult = typeof ComputerStateResult.Type;

const ComputerTarget = Schema.Union([
  Schema.Struct({ elementIndex: ElementIndex }),
  Schema.Struct({
    x: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
    y: Schema.Number.check(Schema.isGreaterThanOrEqualTo(0)),
  }),
]);
export type ComputerTarget = typeof ComputerTarget.Type;

const snapshotAction = {
  snapshotId: Schema.NonEmptyString.annotate({
    description: "The latest snapshotId returned to this thread.",
  }),
  foreground: Schema.optional(
    Schema.Boolean.annotate({
      description:
        "Allow raising the target window for real mouse or keyboard input. Default false; UI Automation actions can work in the background.",
    }),
  ),
};

export const ComputerActionInput = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("launch_app"),
    app: Schema.NonEmptyString,
    foreground: Schema.optional(Schema.Boolean),
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("click"),
    target: ComputerTarget,
    button: Schema.optional(Schema.Literals(["left", "right", "middle"])),
    count: Schema.optional(PositiveInt),
    modifiers: Schema.optional(Schema.NonEmptyString),
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("type_text"),
    text: Schema.NonEmptyString,
    elementIndex: Schema.optional(ElementIndex),
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("press_key"),
    key: Schema.NonEmptyString.annotate({
      description: "A key such as Enter, Tab, Escape, or Backspace.",
    }),
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("hotkey"),
    key: Schema.NonEmptyString.annotate({ description: "A combination such as Ctrl+A or Alt+F4." }),
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("paste_text"),
    text: Schema.NonEmptyString,
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("scroll"),
    target: ComputerTarget,
    direction: Schema.Literals(["up", "down", "left", "right"]),
    pages: Schema.optional(Schema.Number.check(Schema.isGreaterThan(0))),
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("drag"),
    from: ComputerTarget,
    to: ComputerTarget,
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("set_value"),
    elementIndex: ElementIndex,
    value: Schema.String,
  }),
  Schema.Struct({
    ...snapshotAction,
    action: Schema.Literal("perform_action"),
    elementIndex: ElementIndex,
    name: Schema.Literals(["Invoke", "Select", "Toggle", "Expand", "Collapse", "ScrollToVisible"]),
  }),
]);
export type ComputerActionInput = typeof ComputerActionInput.Type;

export class ComputerUnavailableError extends Schema.TaggedError<ComputerUnavailableError>()(
  "ComputerUnavailableError",
  { message: Schema.String },
) {}

export class ComputerOperationError extends Schema.TaggedError<ComputerOperationError>()(
  "ComputerOperationError",
  { operation: Schema.String, message: Schema.String },
) {}

export const ComputerError = Schema.Union([ComputerUnavailableError, ComputerOperationError]);
export type ComputerError = typeof ComputerError.Type;
