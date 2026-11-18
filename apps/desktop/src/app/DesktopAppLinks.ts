import * as NodeURL from "node:url";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { providerAuthReturnUrl } from "@t3tools/shared/providerAuthReturnUrl";
import { promptLinkAppPath } from "@t3tools/shared/promptLinks";
import { readPairingAppLink } from "@t3tools/shared/remote";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as ElectronApp from "../electron/ElectronApp.ts";
import * as ElectronProtocol from "../electron/ElectronProtocol.ts";
import * as DesktopWindow from "../window/DesktopWindow.ts";
import { makeComponentLogger } from "./DesktopObservability.ts";
import * as DesktopWebLinks from "./DesktopWebLinks.ts";

const { logWarning } = makeComponentLogger("desktop-app-links");

export class DesktopAppLinks extends Context.Service<
  DesktopAppLinks,
  {
    readonly configure: Effect.Effect<
      void,
      never,
      DesktopWindow.DesktopWindow | DesktopWebLinks.DesktopWebLinks
    >;
  }
>()("@t3tools/desktop/app/DesktopAppLinks") {}

/** @public */
export const make = Effect.gen(function* () {
  const electronApp = yield* ElectronApp.ElectronApp;
  const pendingSecondInstances: Array<readonly string[]> = [];
  let handleSecondInstance = (argv: readonly string[]) => {
    pendingSecondInstances.push(argv);
  };
  yield* electronApp.on("second-instance", (_event: unknown, argv: readonly string[]) => {
    handleSecondInstance(argv);
  });
  // macOS hands a launch link to open-url, which can fire before configure runs.
  const pendingOpenUrls: Array<string> = [];
  let handleOpenUrl = (url: string) => {
    pendingOpenUrls.push(url);
    return true;
  };
  yield* electronApp.on("open-url", (event: { preventDefault: () => void }, url: string) => {
    if (handleOpenUrl(url)) event.preventDefault();
  });
  const pendingOpenFiles: Array<string> = [];
  let handleOpenFile = (url: string) => {
    pendingOpenFiles.push(url);
  };
  yield* electronApp.on("open-file", (event: { preventDefault: () => void }, path: string) => {
    if (!DesktopWebLinks.isWebPageFile(path)) return;
    event.preventDefault();
    handleOpenFile(NodeURL.pathToFileURL(path).href);
  });

  return DesktopAppLinks.of({
    configure: Effect.gen(function* () {
      const desktopWindow = yield* DesktopWindow.DesktopWindow;
      const webLinks = yield* DesktopWebLinks.DesktopWebLinks;
      const runPromise = Effect.runPromiseWith(yield* Effect.context<never>());

      const openAppLink = (value: string | undefined) => {
        if (!value) return false;
        const protocol = URL.parse(value)?.protocol;
        if (
          protocol !== `${ElectronProtocol.DESKTOP_SCHEME}:` &&
          protocol !== "https:" &&
          protocol !== "http:"
        )
          return false;
        const authReturn =
          protocol === `${ElectronProtocol.DESKTOP_SCHEME}:`
            ? providerAuthReturnUrl(value)
            : undefined;
        if (!authReturn && promptLinkAppPath(value) === null && readPairingAppLink(value) === null)
          return false;
        void runPromise(webLinks.receive(authReturn ?? value));
        return true;
      };
      const args = yield* HostProcess.Arguments;
      args.some(openAppLink);
      const openWebLink = (url: string) => {
        if (!DesktopWebLinks.isWebLink(url)) return false;
        void runPromise(webLinks.receive(url));
        return true;
      };
      handleOpenUrl = (url) => openWebLink(url) || openAppLink(url);
      for (const url of pendingOpenUrls.splice(0)) handleOpenUrl(url);
      handleOpenFile = (url) => {
        void runPromise(webLinks.receive(url));
      };
      for (const url of pendingOpenFiles.splice(0)) handleOpenFile(url);
      handleSecondInstance = (argv) => {
        if (argv?.some(openAppLink)) return;
        void runPromise(
          electronApp.whenReady.pipe(
            Effect.andThen(desktopWindow.activate),
            Effect.catchCause((cause) =>
              logWarning("failed to activate desktop window", { cause }),
            ),
          ),
        );
      };
      for (const argv of pendingSecondInstances.splice(0)) handleSecondInstance(argv);
    }).pipe(Effect.withSpan("desktop.appLinks.configure")),
  });
});

export const layer = Layer.effect(DesktopAppLinks, make);
