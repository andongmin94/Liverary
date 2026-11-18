import * as NodePath from "@effect/platform-node/NodePath";
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import type * as Electron from "electron";
import { beforeEach, vi } from "vite-plus/test";

const { createTray, buildMenu } = vi.hoisted(() => ({
  createTray: vi.fn(),
  buildMenu: vi.fn(),
}));

vi.mock("electron", () => ({
  Tray: createTray,
  Menu: { buildFromTemplate: buildMenu },
}));

import * as ElectronApp from "../electron/ElectronApp.ts";
import * as DesktopWindow from "../window/DesktopWindow.ts";
import * as DesktopAssets from "./DesktopAssets.ts";
import * as DesktopConfig from "./DesktopConfig.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import * as DesktopTray from "./DesktopTray.ts";

function layerTest(
  platform: NodeJS.Platform,
  activate: Effect.Effect<void>,
  quit: Effect.Effect<void>,
) {
  return DesktopTray.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        DesktopEnvironment.layer({
          dirname: "/repo/apps/desktop/dist-electron",
          homeDirectory: "/home/test",
          platform,
          processArch: "x64",
          appVersion: "1.0.0",
          appPath: "/repo",
          isPackaged: true,
          resourcesPath: "/repo/resources",
          runningUnderArm64Translation: false,
        }).pipe(Layer.provide(Layer.mergeAll(NodePath.layerPosix, DesktopConfig.layerTest({})))),
        Layer.mock(DesktopAssets.DesktopAssets)({
          iconPaths: Effect.succeed({
            ico: Option.some("/assets/icon.ico"),
            png: Option.some("/assets/icon.png"),
            icns: Option.none(),
          }),
        }),
        Layer.mock(ElectronApp.ElectronApp)({ quit }),
        Layer.mock(DesktopWindow.DesktopWindow)({ activate }),
      ),
    ),
  );
}

describe("DesktopTray", () => {
  beforeEach(() => {
    createTray.mockReset();
    buildMenu.mockReset();
  });

  it.effect.each(["win32", "linux"] as const)(
    "reopens the window and requests normal shutdown while owning the %s tray",
    (platform) =>
      Effect.gen(function* () {
        const listeners = new Map<string, () => void>();
        const tray = {
          setToolTip: vi.fn(),
          setContextMenu: vi.fn(),
          on: (event: string, listener: () => void) => listeners.set(event, listener),
          destroy: vi.fn(),
        };
        let menu: Electron.MenuItemConstructorOptions[] = [];
        createTray.mockImplementation(function () {
          return tray;
        });
        buildMenu.mockImplementation((template: Electron.MenuItemConstructorOptions[]) => {
          menu = template;
          return {};
        });
        let visible = false;
        let opened = yield* Deferred.make<void>();
        const quitRequested = yield* Deferred.make<void>();
        const activate = Effect.sync(() => {
          visible = true;
        }).pipe(
          Effect.andThen(Effect.suspend(() => Deferred.succeed(opened, undefined))),
          Effect.asVoid,
        );
        const quit = Deferred.succeed(quitRequested, undefined).pipe(Effect.asVoid);
        const click = (id: string) => {
          const item = menu.find((entry) => entry.id === id);
          assert.isDefined(item?.click);
          item!.click!({} as Electron.MenuItem, undefined, {} as Electron.KeyboardEvent);
        };

        yield* Effect.scoped(
          Effect.gen(function* () {
            yield* (yield* DesktopTray.DesktopTray).configure;
            click("open");
            yield* Deferred.await(opened);
            assert.isTrue(visible);

            visible = false;
            opened = yield* Deferred.make<void>();
            listeners.get("click")!();
            yield* Deferred.await(opened);
            assert.isTrue(visible);

            click("quit");
            yield* Deferred.await(quitRequested);
            assert.equal(tray.destroy.mock.calls.length, 0);
          }).pipe(Effect.provide(layerTest(platform, activate, quit))),
        );
        assert.equal(tray.destroy.mock.calls.length, 1);
      }),
  );

  it.effect("leaves macOS activation and quitting to the Dock", () =>
    Effect.scoped(
      Effect.gen(function* () {
        yield* (yield* DesktopTray.DesktopTray).configure;
        assert.equal(createTray.mock.calls.length, 0);
      }).pipe(
        Effect.provide(
          layerTest(
            "darwin",
            Effect.die("unexpected tray activation"),
            Effect.die("unexpected tray quit"),
          ),
        ),
      ),
    ),
  );
});
