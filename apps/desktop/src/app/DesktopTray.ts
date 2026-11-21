import { msg } from "gt-i18n";
import { m } from "../i18n/messages.ts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Scope from "effect/Scope";

import * as Electron from "electron";

import * as ElectronApp from "../electron/ElectronApp.ts";

import * as DesktopWindow from "../window/DesktopWindow.ts";
import * as DesktopAssets from "./DesktopAssets.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import { makeComponentLogger } from "./DesktopObservability.ts";

const { logError } = makeComponentLogger("tray");

export class DesktopTray extends Context.Service<
  DesktopTray,
  { readonly configure: Effect.Effect<void, never, Scope.Scope> }
>()("@t3tools/desktop/app/DesktopTray") {}

/** @public */
export const make = Effect.gen(function* () {
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const assets = yield* DesktopAssets.DesktopAssets;
  const app = yield* ElectronApp.ElectronApp;
  const window = yield* DesktopWindow.DesktopWindow;
  const runPromise = Effect.runPromiseWith(yield* Effect.context<never>());

  const runAction = (
    action: string,
    effect: Effect.Effect<void, DesktopWindow.DesktopWindowError>,
  ) => {
    void runPromise(
      effect.pipe(Effect.catchCause((cause) => logError("tray action failed", { action, cause }))),
    );
  };

  const configure = Effect.gen(function* () {
    if (environment.platform !== "win32" && environment.platform !== "linux") return;
    const icons = yield* assets.iconPaths;
    const icon = environment.platform === "win32" ? icons.ico : icons.png;
    const iconPath = yield* Option.match(icon, {
      onNone: () => Effect.die(new Error("The desktop tray icon is unavailable.")),
      onSome: Effect.succeed,
    });
    const tray = yield* Effect.acquireRelease(
      Effect.sync(() => new Electron.Tray(iconPath)),
      (tray) => Effect.sync(() => tray.destroy()),
    );
    const open = () => runAction("open", window.activate);
    tray.setToolTip(environment.displayName);
    tray.setContextMenu(
      Electron.Menu.buildFromTemplate([
        { id: "open", label: m(msg("Open")), click: open },
        { type: "separator" },
        { id: "quit", label: m(msg("Quit")), click: () => runAction("quit", app.quit) },
      ]),
    );
    tray.on("click", open);
  }).pipe(Effect.withSpan("desktop.tray.configure"));

  return DesktopTray.of({ configure });
});

export const layer = Layer.effect(DesktopTray, make);
