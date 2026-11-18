// @effect-diagnostics nodeBuiltinImport:off - Stands in for an Electron webContents.
import { assert, describe, it } from "@effect/vitest";
import * as NodeEvents from "node:events";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as DesktopWindow from "../window/DesktopWindow.ts";
import * as ElectronApp from "../electron/ElectronApp.ts";
import * as ElectronWindow from "../electron/ElectronWindow.ts";
import { WEB_LINK_OPEN_CHANNEL } from "../ipc/channels.ts";
import * as DesktopWebLinks from "./DesktopWebLinks.ts";

const makeWindow = ({
  initiallyOpen = true,
  whenReady = Effect.void,
}: { initiallyOpen?: boolean; whenReady?: Effect.Effect<void> } = {}) => {
  const sent: Array<string> = [];
  const createWindow = () => {
    let destroyed = false;
    const webContents = Object.assign(new NodeEvents.EventEmitter(), {
      isDestroyed: () => destroyed,
      close: () => {
        destroyed = true;
        webContents.emit("destroyed");
      },
      send: (channel: string, url: string) => {
        if (channel === WEB_LINK_OPEN_CHANNEL) sent.push(url);
      },
    });
    return { webContents } as unknown as Electron.BrowserWindow;
  };
  let window = initiallyOpen ? createWindow() : undefined;
  const reload = () =>
    window?.webContents.emit("did-start-navigation", { isMainFrame: true, isSameDocument: false });
  const destroy = () => {
    window?.webContents.close();
    window = undefined;
  };
  const layer = DesktopWebLinks.layer.pipe(
    Layer.provide(
      Layer.succeed(DesktopWindow.DesktopWindow, {
        activate: Effect.sync(() => {
          window ??= createWindow();
        }),
      } as unknown as DesktopWindow.DesktopWindow["Service"]),
    ),
    Layer.provide(Layer.mock(ElectronApp.ElectronApp)({ whenReady })),
    Layer.provide(
      Layer.succeed(
        ElectronWindow.ElectronWindow,
        ElectronWindow.ElectronWindow.of({
          currentMainOrFirst: Effect.sync(() => Option.fromUndefinedOr(window)),
        } as unknown as ElectronWindow.ElectronWindow["Service"]),
      ),
    ),
  );
  return { sent, layer, reload, destroy, current: () => window };
};

describe("DesktopWebLinks", () => {
  it.effect("holds links until the renderer listens, then delivers them in order", () =>
    Effect.gen(function* () {
      const ready = yield* Deferred.make<void>();
      const { sent, layer, destroy, current } = makeWindow({
        initiallyOpen: false,
        whenReady: Deferred.await(ready),
      });
      yield* Effect.gen(function* () {
        const webLinks = yield* DesktopWebLinks.DesktopWebLinks;
        const first = yield* webLinks
          .receive("https://example.com/first")
          .pipe(Effect.forkChild({ startImmediately: true }));
        const second = yield* webLinks
          .receive("https://example.com/second")
          .pipe(Effect.forkChild({ startImmediately: true }));
        assert.isUndefined(current());
        assert.deepStrictEqual(sent, []);

        yield* Deferred.succeed(ready, undefined);
        yield* Fiber.join(first);
        yield* Fiber.join(second);
        assert.isDefined(current());
        assert.deepStrictEqual(sent, []);

        yield* webLinks.setRendererReady(true);
        assert.deepStrictEqual(sent, ["https://example.com/first", "https://example.com/second"]);

        yield* webLinks.receive("https://example.com/third");
        assert.deepStrictEqual(sent.at(-1), "https://example.com/third");

        yield* webLinks.setRendererReady(false);
        yield* webLinks.receive("https://example.com/fourth");
        assert.strictEqual(sent.length, 3);
        yield* webLinks.setRendererReady(true);

        const closedWindow = current();
        destroy();
        yield* webLinks.receive("https://example.com/after-close");
        assert.isDefined(current());
        assert.notStrictEqual(current(), closedWindow);
        assert.strictEqual(sent.length, 4);

        yield* webLinks.setRendererReady(true);
        yield* webLinks.setRendererReady(true);
        assert.deepStrictEqual(sent, [
          "https://example.com/first",
          "https://example.com/second",
          "https://example.com/third",
          "https://example.com/fourth",
          "https://example.com/after-close",
        ]);
      }).pipe(Effect.provide(layer));
    }),
  );

  it.effect("holds links that arrive while the web app reloads until it listens again", () => {
    const { sent, layer, reload } = makeWindow();
    return Effect.gen(function* () {
      const webLinks = yield* DesktopWebLinks.DesktopWebLinks;
      yield* webLinks.setRendererReady(true);
      reload();
      yield* webLinks.receive("https://example.com/during-reload");
      assert.deepStrictEqual(sent, []);

      yield* webLinks.setRendererReady(true);
      assert.deepStrictEqual(sent, ["https://example.com/during-reload"]);
    }).pipe(Effect.provide(layer));
  });
});
