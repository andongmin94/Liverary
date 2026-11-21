import { msg } from "gt-i18n";
import { m } from "../i18n/messages.ts";

import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import * as Electron from "electron";

import { makeComponentLogger } from "../app/DesktopObservability.ts";
import * as ElectronDialog from "../electron/ElectronDialog.ts";
import * as ElectronMenu from "../electron/ElectronMenu.ts";
import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import * as DesktopUpdates from "../updates/DesktopUpdates.ts";
import * as DesktopWindow from "./DesktopWindow.ts";

export class DesktopApplicationMenuActionError extends Schema.TaggedError<DesktopApplicationMenuActionError>()(
  "DesktopApplicationMenuActionError",
  {
    action: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Desktop menu action "${this.action}" failed.`;
  }
}

export class DesktopApplicationMenu extends Context.Service<
  DesktopApplicationMenu,
  {
    readonly configure: Effect.Effect<void>;
  }
>()("@t3tools/desktop/window/DesktopApplicationMenu") {}

type DesktopApplicationMenuRuntimeServices =
  | DesktopUpdates.DesktopUpdates
  | DesktopWindow.DesktopWindow
  | ElectronDialog.ElectronDialog;

const { logInfo: logUpdaterInfo } = makeComponentLogger("desktop-updater");

const { logError: logMenuError } = makeComponentLogger("desktop-menu");

const dispatchMenuAction = Effect.fn("desktop.menu.dispatchMenuAction")(function* (
  action: string,
): Effect.fn.Return<void, DesktopWindow.DesktopWindowError, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.dispatchMenuAction(action, {
    reveal: action !== "paste-as-text",
  });
});

const zoomMainWindow = Effect.fn("desktop.menu.zoomMainWindow")(function* (
  direction: DesktopWindow.MainWindowZoomDirection,
): Effect.fn.Return<void, never, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.zoomMain(direction);
});

const runMainContentsCommand = Effect.fn("desktop.menu.runMainContentsCommand")(function* (
  command: DesktopWindow.MainWindowContentsCommand,
): Effect.fn.Return<void, never, DesktopWindow.DesktopWindow> {
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.runMainContentsCommand(command);
});

const checkForUpdatesFromMenu = Effect.gen(function* () {
  const updates = yield* DesktopUpdates.DesktopUpdates;
  const electronDialog = yield* ElectronDialog.ElectronDialog;
  const result = yield* updates.check("menu");
  const updateState = result.state;

  if (updateState.status === "up-to-date") {
    yield* electronDialog.showMessageBox({
      type: "info",
      title: m(msg("Up to date")),
      message: m(
        msg("Liverary {value0} is up to date.", { value0: String(updateState.currentVersion) }),
      ),
      buttons: [m(msg("OK"))],
    });
  } else if (updateState.status === "available") {
    const { response } = yield* electronDialog.showMessageBox({
      type: "info",
      title: m(msg("Update available")),
      message: m(
        msg("{name} is available.", { name: String(updateName(updateState.availableVersion)) }),
      ),
      detail: m(
        msg("You''re running T3 Code {version}.", { version: String(updateState.currentVersion) }),
      ),
      buttons: [m(msg("Download")), m(msg("Later"))],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) yield* updates.download;
  } else if (updateState.status === "downloading") {
    yield* electronDialog.showMessageBox({
      type: "info",
      title: m(msg("Update downloading")),
      message: m(
        msg("{name} is already downloading.", {
          name: String(updateName(updateState.availableVersion)),
        }),
      ),
      buttons: [m(msg("OK"))],
    });
  } else if (updateState.status === "downloaded") {
    const { response } = yield* electronDialog.showMessageBox({
      type: "info",
      title: m(msg("Update ready")),
      message: m(
        msg("{name} is ready to install.", {
          name: String(updateName(updateState.downloadedVersion ?? updateState.availableVersion)),
        }),
      ),
      detail: m(msg("Liverary will restart to install it. Any running tasks will be interrupted.")),
      buttons: [m(msg("Restart")), m(msg("Later"))],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) yield* updates.install;
  } else if (updateState.status === "error") {
    yield* electronDialog.showMessageBox({
      type: "warning",
      title: m(msg("Update check failed")),
      message: m(msg("Could not check for updates.")),
      detail: updateState.message ?? m(msg("An unknown error occurred. Try again in a moment.")),
      buttons: [m(msg("OK"))],
    });
  }
}).pipe(Effect.withSpan("desktop.menu.checkForUpdates"));

const handleCheckForUpdatesMenuClick = Effect.gen(function* () {
  const updates = yield* DesktopUpdates.DesktopUpdates;
  const electronDialog = yield* ElectronDialog.ElectronDialog;
  const disabledReason = yield* updates.disabledReason;
  if (Option.isSome(disabledReason)) {
    yield* logUpdaterInfo("manual update check requested, but updates are disabled", {
      disabledReason: disabledReason.value,
    });
    yield* electronDialog.showMessageBox({
      type: "info",
      title: m(msg("Updates unavailable")),
      message: m(msg("Automatic updates are currently unavailable.")),
      detail: disabledReason.value,
      buttons: [m(msg("OK"))],
    });
    return;
  }

  // Opening a window before backend confirmation can strand it on failed auth bootstrap.
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  yield* desktopWindow.activate;
  yield* checkForUpdatesFromMenu;
}).pipe(Effect.withSpan("desktop.menu.handleCheckForUpdatesClick"));

/** @public */
export const make = Effect.gen(function* () {
  const electronMenu = yield* ElectronMenu.ElectronMenu;
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const context = yield* Effect.context<DesktopApplicationMenuRuntimeServices>();
  const runPromise = Effect.runPromiseWith(context);

  const runMenuEffect = <E>(
    action: string,
    effect: Effect.Effect<void, E, DesktopApplicationMenuRuntimeServices>,
  ) => {
    void runPromise(
      effect.pipe(
        Effect.annotateLogs({ action }),
        Effect.withSpan("desktop.menu.action"),
        Effect.catchCause((cause) => {
          const error = new DesktopApplicationMenuActionError({ action, cause });
          return logMenuError(error.message, { error });
        }),
      ),
    );
  };

  const configure = Effect.gen(function* () {
    const checkForUpdatesClick = () => {
      runMenuEffect("check-for-updates", handleCheckForUpdatesMenuClick);
    };
    const settingsClick = () => {
      runMenuEffect("open-settings", dispatchMenuAction("open-settings"));
    };
    // Chromium and the renderer already handle this chord; injecting another paste duplicates text.
    const pasteAsTextClick = (
      _item: Electron.MenuItem,
      _window: Electron.BaseWindow | undefined,
      event: Electron.KeyboardEvent,
    ) => {
      if (event.triggeredByAccelerator === true) return;
      runMenuEffect("paste-as-text", dispatchMenuAction("paste-as-text"));
    };
    const zoomClick = (direction: DesktopWindow.MainWindowZoomDirection) => () => {
      runMenuEffect(`zoom-${direction}`, zoomMainWindow(direction));
    };
    const mainContentsClick = (command: DesktopWindow.MainWindowContentsCommand) => () => {
      runMenuEffect(command, runMainContentsCommand(command));
    };
    const template: Electron.MenuItemConstructorOptions[] = [];

    if (environment.platform === "darwin") {
      template.push({
        label: environment.displayName,
        submenu: [
          {
            role: "about",
            label: m(msg("About {value0}", { value0: String(environment.displayName) })),
          },
          {
            label: m(msg("Check for Updates…")),
            click: checkForUpdatesClick,
          },
          { type: "separator" },
          {
            label: m(msg("Settings…")),
            accelerator: "CmdOrCtrl+,",
            click: settingsClick,
          },
          { type: "separator" },
          { role: "services", label: m(msg("Services")) },
          { type: "separator" },
          {
            role: "hide",
            label: m(msg("Hide {value0}", { value0: String(environment.displayName) })),
          },
          { role: "hideOthers", label: m(msg("Hide Others")) },
          { role: "unhide", label: m(msg("Show All")) },
          { type: "separator" },
          {
            role: "quit",
            label: m(msg("Quit {value0}", { value0: String(environment.displayName) })),
          },
        ],
      });
    }

    template.push(
      {
        label: m(msg("File")),
        submenu: [
          ...(environment.platform === "darwin"
            ? []
            : [
                {
                  label: m(msg("Settings…")),
                  accelerator: "CmdOrCtrl+,",
                  click: settingsClick,
                },
                { type: "separator" as const },
              ]),
          {
            label: m(msg("Close Developer Tools")),
            accelerator: "CmdOrCtrl+W",
            visible: false,
            click: () => {
              Electron.webContents
                .getAllWebContents()
                .find((contents) => !contents.isDestroyed() && contents.isDevToolsFocused())
                ?.closeDevTools();
            },
          },
          // Cmd/Ctrl+W belongs to the renderer's tab close; it must never close the window.
          environment.platform === "darwin"
            ? { label: m(msg("Close Window")), click: (_item, window) => window?.close() }
            : { role: "quit", label: m(msg("Quit")) },
        ],
      },
      {
        label: m(msg("Edit")),
        submenu: [
          { role: "undo", label: m(msg("Undo")) },
          { role: "redo", label: m(msg("Redo")) },
          { type: "separator" },
          { role: "cut", label: m(msg("Cut")) },
          { role: "copy", label: m(msg("Copy")) },
          { role: "paste", label: m(msg("Paste")) },
          {
            label: m(msg("Paste and Match Style")),
            accelerator: "CmdOrCtrl+Shift+V",
            click: pasteAsTextClick,
          },
          { role: "delete", label: m(msg("Delete")) },
          { type: "separator" },
          { role: "selectAll", label: m(msg("Select All")) },
          ...(environment.platform === "darwin"
            ? [
                { type: "separator" as const },
                {
                  label: m(msg("Speech")),
                  submenu: [
                    { role: "startSpeaking" as const, label: m(msg("Start Speaking")) },
                    { role: "stopSpeaking" as const, label: m(msg("Stop Speaking")) },
                  ],
                },
              ]
            : []),
        ],
      },
      {
        label: m(msg("View")),
        submenu: [
          /* Native reload/DevTools/zoom roles target focused guests; these commands must target the app. */
          {
            label: m(msg("Reload")),
            accelerator: "CmdOrCtrl+R",
            click: mainContentsClick("reload"),
          },
          {
            label: m(msg("Force Reload")),
            accelerator: "Shift+CmdOrCtrl+R",
            click: mainContentsClick("forceReload"),
          },
          {
            label: m(msg("Toggle Developer Tools")),
            accelerator: environment.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
            click: mainContentsClick("toggleDevTools"),
          },
          { type: "separator" },
          { label: m(msg("Actual Size")), accelerator: "CmdOrCtrl+0", click: zoomClick("reset") },
          { label: m(msg("Zoom In")), accelerator: "CmdOrCtrl+=", click: zoomClick("in") },
          {
            label: m(msg("Zoom In")),
            accelerator: "CmdOrCtrl+Plus",
            visible: false,
            click: zoomClick("in"),
          },
          ...(environment.platform === "darwin"
            ? [
                {
                  label: m(msg("Zoom In")),
                  accelerator: "CmdOrCtrl+Shift+=",
                  visible: false,
                  click: zoomClick("in"),
                },
              ]
            : []),
          { label: m(msg("Zoom Out")), accelerator: "CmdOrCtrl+-", click: zoomClick("out") },
          // Keypad codes do not match number-row accelerators.
          {
            label: m(msg("Actual Size")),
            accelerator: "CmdOrCtrl+num0",
            visible: false,
            click: zoomClick("reset"),
          },
          {
            label: m(msg("Zoom In")),
            accelerator: "CmdOrCtrl+numadd",
            visible: false,
            click: zoomClick("in"),
          },
          {
            label: m(msg("Zoom Out")),
            accelerator: "CmdOrCtrl+numsub",
            visible: false,
            click: zoomClick("out"),
          },
          { type: "separator" },
          { role: "togglefullscreen", label: m(msg("Toggle Full Screen")) },
        ],
      },
      {
        // Electron's default Window submenu adds a Ctrl+W close role off macOS.
        role: "windowMenu",
        label: m(msg("Window")),
        submenu: [
          { role: "minimize", label: m(msg("Minimize")) },
          { role: "zoom", label: m(msg("Zoom")) },
          ...(environment.platform === "darwin"
            ? [
                { type: "separator" as const },
                { role: "front" as const, label: m(msg("Bring All to Front")) },
              ]
            : []),
        ],
      },
      {
        role: "help",
        label: m(msg("Help")),
        submenu: [
          {
            label: m(msg("Check for Updates…")),
            click: checkForUpdatesClick,
          },
        ],
      },
    );

    yield* electronMenu.setApplicationMenu(template);
  }).pipe(Effect.withSpan("desktop.menu.configure"));

  return DesktopApplicationMenu.of({
    configure,
  });
});

export const layer = Layer.effect(DesktopApplicationMenu, make);

const updateName = (version: string | null) =>
  version === null ? m(msg("A new version of Liverary")) : `Liverary ${version}`;
