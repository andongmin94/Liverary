// @effect-diagnostics nodeBuiltinImport:off - Electron profile tests use a temporary OS directory.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodePathLayer from "@effect/platform-node/NodePath";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { afterAll, beforeEach, vi } from "vite-plus/test";

const clerkStateDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-desktop-clerk-"));
afterAll(() => {
  NodeFS.rmSync(clerkStateDir, { recursive: true, force: true });
});

const { createClerkBridgeMock, requestSingleInstanceLockMock, storageAdapter, storageMock } =
  vi.hoisted(() => ({
    createClerkBridgeMock: vi.fn(),
    requestSingleInstanceLockMock: vi.fn(() => true),
    storageAdapter: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    storageMock: vi.fn(),
  }));

vi.mock("@clerk/electron", () => ({
  createClerkBridge: createClerkBridgeMock,
}));

vi.mock("@clerk/electron/storage", () => ({
  storage: storageMock,
}));
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as ElectronApp from "../electron/ElectronApp.ts";
import * as ElectronWindow from "../electron/ElectronWindow.ts";
import * as DesktopClerk from "./DesktopClerk.ts";
import * as DesktopWebLinks from "./DesktopWebLinks.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import * as DesktopPreReadyFileSystem from "./DesktopPreReadyFileSystem.ts";

const ignoreWebLinks = DesktopWebLinks.DesktopWebLinks.of({
  receive: () => Effect.void,
  setRendererReady: () => Effect.void,
});

const layerDesktopClerk = (
  isDevelopment = true,
  events: string[] = [],
  platform: NodeJS.Platform = "darwin",
  fileSystemLayer: Layer.Layer<FileSystem.FileSystem> = FileSystem.layerNoop({
    exists: () => Effect.succeed(false),
  }),
  listeners = new Map<string, (...args: unknown[]) => void>(),
  appDataDirectory = "/tmp/app-data",
) => {
  const environment = DesktopEnvironment.DesktopEnvironment.of({
    stateDir: clerkStateDir,
    isDevelopment,
    appDataDirectory,
    platform,
  } as unknown as DesktopEnvironment.DesktopEnvironment["Service"]);

  const electronApp = {
    setPath: (name: string, value: string) =>
      Effect.sync(() => {
        events.push(`setPath:${name}:${value}`);
      }),
    requestSingleInstanceLock: Effect.sync(() => {
      events.push("requestSingleInstanceLock");
      return requestSingleInstanceLockMock();
    }),
    releaseSingleInstanceLock: Effect.sync(() => {
      events.push("releaseSingleInstanceLock");
    }),
    quit: Effect.sync(() => {
      events.push("quit");
    }),
    on: (name: string, listener: (...args: unknown[]) => void) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          events.push(`on:${name}`);
          listeners.set(name, listener);
        }),
        () =>
          Effect.sync(() => {
            listeners.delete(name);
          }),
      ).pipe(Effect.asVoid),
  } as unknown as ElectronApp.ElectronApp["Service"];

  return DesktopClerk.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        NodePathLayer.layerPosix,
        Layer.succeed(DesktopEnvironment.DesktopEnvironment, environment),
        Layer.succeed(ElectronApp.ElectronApp, electronApp),
        fileSystemLayer,
      ),
    ),
  );
};

describe("DesktopClerk", () => {
  beforeEach(() => {
    createClerkBridgeMock.mockReset();
    requestSingleInstanceLockMock.mockReset().mockReturnValue(true);
    storageMock.mockReset();
  });

  it.each([
    {
      name: "packaged macOS",
      isDevelopment: false,
      platform: "darwin" as const,
      userData: "/tmp/app-data/liverary",
      profileState: "fresh" as const,
    },
    {
      name: "packaged Linux",
      isDevelopment: false,
      platform: "linux" as const,
      userData: "/tmp/app-data/liverary",
      profileState: "fresh" as const,
    },
    {
      name: "packaged Windows",
      isDevelopment: false,
      platform: "win32" as const,
      userData: "/tmp/app-data/liverary",
      profileState: "fresh" as const,
    },
    {
      name: "development",
      isDevelopment: true,
      platform: "win32" as const,
      userData: "/tmp/app-data/liverary-dev",
      profileState: "fresh" as const,
    },
    {
      name: "legacy Windows profile",
      isDevelopment: false,
      platform: "win32" as const,
      userData: "",
      profileState: "legacy" as const,
    },
    {
      name: "already migrated development profile",
      isDevelopment: true,
      platform: "win32" as const,
      userData: "",
      profileState: "migrated" as const,
    },
  ])(
    "creates the bridge before startup can yield to the event loop ($name)",
    ({ isDevelopment, platform, userData, profileState }) => {
      const events: string[] = [];
      storageMock.mockReturnValue(storageAdapter);
      createClerkBridgeMock.mockImplementation(() => {
        events.push("createClerkBridge");
        return { cleanup: vi.fn(), isPrimaryInstance: true };
      });
      const directory =
        profileState === "fresh"
          ? null
          : NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-clerk-profile-"));
      if (directory)
        assert.equal(
          NodePath.dirname(NodePath.resolve(directory)),
          NodePath.resolve(NodeOS.tmpdir()),
        );
      const appDataDirectory = directory ?? "/tmp/app-data";
      const canonical = directory
        ? NodePath.posix.join(directory, isDevelopment ? "liverary-dev" : "liverary")
        : userData;
      const legacy = directory
        ? NodePath.posix.join(directory, isDevelopment ? "t3-custom-dev" : "t3-custom")
        : null;
      const bytes = Uint8Array.from([0, 128, 255, 3]);
      try {
        if (legacy) {
          NodeFS.mkdirSync(legacy);
          NodeFS.writeFileSync(NodePath.posix.join(legacy, "Local State"), bytes);
          if (profileState === "migrated") {
            NodeFS.renameSync(legacy, canonical);
            NodeFS.symlinkSync(
              canonical,
              legacy,
              HostProcess.Platform.defaultValue() === "win32" ? "junction" : "dir",
            );
          }
        }
        // oxlint-disable-next-line t3code/no-manual-effect-runtime-in-tests -- The assertion IS that the layer builds synchronously; it.effect would mask a regression to async.
        Effect.runSync(
          Effect.scoped(
            Layer.build(
              layerDesktopClerk(
                isDevelopment,
                events,
                platform,
                DesktopPreReadyFileSystem.layer,
                undefined,
                appDataDirectory,
              ),
            ),
          ),
        );

        assert.deepEqual(events, [
          `setPath:userData:${legacy ?? canonical}`,
          "requestSingleInstanceLock",
          ...(profileState === "legacy"
            ? [
                "releaseSingleInstanceLock",
                `setPath:userData:${legacy}`,
                "requestSingleInstanceLock",
              ]
            : []),
          ...(legacy ? [`setPath:userData:${canonical}`] : []),
          "on:second-instance",
          "on:open-url",
          "createClerkBridge",
        ]);
        if (legacy) {
          assert.equal(NodeFS.realpathSync(legacy), NodeFS.realpathSync(canonical));
          assert.deepEqual(
            new Uint8Array(NodeFS.readFileSync(NodePath.posix.join(canonical, "Local State"))),
            bytes,
          );
        }
        assert.deepEqual(storageMock.mock.calls, [
          [{ path: NodePath.join(NodePath.resolve(clerkStateDir), "clerk") }],
        ]);
        assert.notStrictEqual(createClerkBridgeMock.mock.calls[0]?.[0]?.storage, storageAdapter);
      } finally {
        if (directory) NodeFS.rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it.effect.each(["before configure", "after configure"] as const)(
    "reveals the running window when a second instance launches %s",
    (entry) => {
      storageMock.mockReturnValue(storageAdapter);
      createClerkBridgeMock.mockReturnValue({ cleanup: vi.fn(), isPrimaryInstance: true });
      const quit = vi.fn();
      const listeners = new Map<string, (...args: unknown[]) => void>();
      const revealed = Promise.withResolvers<unknown>();
      const window = { id: 1 };
      const electronApp = {
        quit: Effect.sync(quit),
        on: (eventName: string, listener: (...args: unknown[]) => void) =>
          Effect.sync(() => {
            listeners.set(eventName, listener);
          }),
      } as unknown as ElectronApp.ElectronApp["Service"];
      const electronWindow = {
        currentMainOrFirst: Effect.succeedSome(window),
        reveal: (value: unknown) => Effect.sync(() => revealed.resolve(value)),
      } as unknown as ElectronWindow.ElectronWindow["Service"];

      return Effect.gen(function* () {
        const clerk = yield* DesktopClerk.DesktopClerk;
        if (entry === "before configure") listeners.get("second-instance")?.({}, ["t3"]);
        yield* clerk.configure;

        assert.equal(quit.mock.calls.length, 0);
        if (entry === "after configure") listeners.get("second-instance")!({}, ["t3"]);
        assert.strictEqual(yield* Effect.promise(() => revealed.promise), window);
      }).pipe(
        Effect.scoped,
        Effect.provide(layerDesktopClerk(true, [], "darwin", undefined, listeners)),
        Effect.provideService(ElectronApp.ElectronApp, electronApp),
        Effect.provideService(ElectronWindow.ElectronWindow, electronWindow),
        Effect.provideService(DesktopWebLinks.DesktopWebLinks, ignoreWebLinks),
      );
    },
  );

  it.effect("delivers each queued startup link once, before later links", () => {
    storageMock.mockReturnValue(storageAdapter);
    createClerkBridgeMock.mockReturnValue({ cleanup: vi.fn(), isPrimaryInstance: true });
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const received: string[] = [];
    const first = "liverary://new?prompt=first";
    const second = "liverary://threads/env-1/thread-1";
    const later = "liverary://new?prompt=later";
    const launchPair = "liverary://pair?pairingUrl=https%3A%2F%2Fvps.example.com%2F%23token%3Dabc";
    const delivered = Promise.withResolvers<void>();
    const electronApp = {
      on: (name: string, listener: (...args: unknown[]) => void) =>
        Effect.sync(() => {
          listeners.set(name, listener);
        }),
    } as unknown as ElectronApp.ElectronApp["Service"];

    return Effect.gen(function* () {
      const clerk = yield* DesktopClerk.DesktopClerk;
      listeners.get("second-instance")?.({}, ["t3", first]);
      listeners.get("second-instance")?.({}, ["t3", second]);
      listeners.get("open-url")?.({ preventDefault: () => undefined }, launchPair);
      assert.deepEqual(received, []);

      yield* clerk.configure;
      listeners.get("second-instance")!({}, ["t3", later]);
      yield* Effect.promise(() => delivered.promise);

      assert.deepEqual(received, [launchPair, first, second, later]);
    }).pipe(
      Effect.scoped,
      Effect.provide(layerDesktopClerk(true, [], "darwin", undefined, listeners)),
      Effect.provideService(ElectronApp.ElectronApp, electronApp),
      Effect.provideService(
        ElectronWindow.ElectronWindow,
        {} as ElectronWindow.ElectronWindow["Service"],
      ),
      Effect.provideService(
        DesktopWebLinks.DesktopWebLinks,
        DesktopWebLinks.DesktopWebLinks.of({
          receive: (url) =>
            Effect.sync(() => {
              received.push(url);
              if (url === later) delivered.resolve();
            }),
          setRendererReady: () => Effect.void,
        }),
      ),
    );
  });

  it.effect.each([
    { platform: "darwin" as const, legacyProfile: false },
    { platform: "win32" as const, legacyProfile: false },
    { platform: "linux" as const, legacyProfile: false },
    { platform: "win32" as const, legacyProfile: true },
  ])(
    "quits a second launch before initializing Clerk or the application runtime on $platform (legacy: $legacyProfile)",
    ({ platform, legacyProfile }) =>
      Effect.gen(function* () {
        requestSingleInstanceLockMock.mockReturnValueOnce(false);
        createClerkBridgeMock.mockReturnValue({ cleanup: vi.fn(), isPrimaryInstance: true });
        const events: string[] = [];
        const directory = legacyProfile
          ? NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "liverary-clerk-active-"))
          : null;
        if (directory)
          assert.equal(
            NodePath.dirname(NodePath.resolve(directory)),
            NodePath.resolve(NodeOS.tmpdir()),
          );
        const legacy = directory ? NodePath.posix.join(directory, "t3-custom") : null;
        if (legacy) {
          NodeFS.mkdirSync(legacy);
          NodeFS.writeFileSync(NodePath.posix.join(legacy, "Local State"), "old-key");
        }
        try {
          const runtime = layerDesktopClerk(
            false,
            events,
            platform,
            directory ? DesktopPreReadyFileSystem.layer : undefined,
            undefined,
            directory ?? undefined,
          ).pipe(
            Layer.flatMap(() =>
              Layer.effectDiscard(
                Effect.sync(() => {
                  events.push("initializeApplicationRuntime");
                }),
              ),
            ),
          );
          const exit = yield* Effect.exit(Effect.scoped(Layer.build(runtime)));

          assert.isTrue(Exit.hasInterrupts(exit));
          assert.deepEqual(events, [
            `setPath:userData:${legacy ?? "/tmp/app-data/liverary"}`,
            "requestSingleInstanceLock",
            "quit",
          ]);
          assert.equal(createClerkBridgeMock.mock.calls.length, 0);
          assert.equal(storageMock.mock.calls.length, 0);
          if (legacy && directory) {
            assert.equal(
              NodeFS.readFileSync(NodePath.posix.join(legacy, "Local State"), "utf8"),
              "old-key",
            );
            assert.isFalse(NodeFS.existsSync(NodePath.posix.join(directory, "liverary")));
          }
        } finally {
          if (directory) NodeFS.rmSync(directory, { recursive: true, force: true });
        }
      }),
  );
});

it.effect.each([false, true])(
  "provider auth deep links navigate and reveal the running desktop without handling Clerk URLs (development=%s)",
  (isDevelopment) => {
    const scheme = isDevelopment ? "liverary-dev" : "liverary";
    storageMock.mockReturnValue(storageAdapter);
    createClerkBridgeMock.mockReturnValue({ cleanup: vi.fn(), isPrimaryInstance: true });
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const revealed = Promise.withResolvers<void>();
    const loadURL = vi.fn(async (_url: string) => undefined);
    const window = { loadURL };
    const electronApp = {
      on: (name: string, listener: (...args: unknown[]) => void) =>
        Effect.sync(() => {
          listeners.set(name, listener);
        }),
    } as unknown as ElectronApp.ElectronApp["Service"];
    const electronWindow = {
      currentMainOrFirst: Effect.succeedSome(window),
      reveal: () => Effect.sync(() => revealed.resolve()),
    } as unknown as ElectronWindow.ElectronWindow["Service"];
    return Effect.gen(function* () {
      const clerk = yield* DesktopClerk.DesktopClerk;
      yield* clerk.configure;
      const event = { preventDefault: vi.fn() };
      listeners.get("open-url")!(event, `${scheme}://app/auth/callback?code=clerk-code`);
      listeners.get("open-url")!(
        event,
        `${isDevelopment ? "liverary" : "liverary-dev"}://app/welcome`,
      );
      assert.equal(loadURL.mock.calls.length, 0);
      assert.equal(event.preventDefault.mock.calls.length, 0);
      listeners.get("second-instance")!({}, [
        "t3",
        `${scheme}://app/settings/providers?instanceId=work&code=never-forward`,
      ]);
      yield* Effect.promise(() => revealed.promise);
      assert.deepEqual(loadURL.mock.calls, [
        [`${scheme}://app/settings/providers?instanceId=work`],
      ]);
      listeners.get("open-url")!(event, `${scheme}://app/welcome#agents:machine-id`);
      assert.equal(event.preventDefault.mock.calls.length, 1);
    }).pipe(
      Effect.scoped,
      Effect.provide(layerDesktopClerk(isDevelopment, [], "darwin", undefined, listeners)),
      Effect.provideService(ElectronApp.ElectronApp, electronApp),
      Effect.provideService(ElectronWindow.ElectronWindow, electronWindow),
      Effect.provideService(DesktopWebLinks.DesktopWebLinks, ignoreWebLinks),
    );
  },
);

it.effect("leaves old hosted Codex sign-in links unhandled", () =>
  Effect.gen(function* () {
    storageMock.mockReturnValue(storageAdapter);
    createClerkBridgeMock.mockReturnValue({ cleanup: vi.fn(), isPrimaryInstance: true });
    const authorize = new URL("https://auth.openai.com/api/accounts/authorize");
    authorize.search = new URLSearchParams({
      client_id: "dynamic_agent_client",
      response_type: "code",
      redirect_uri: "http://127.0.0.1:1455/auth/callback",
      state: "a".repeat(43),
      code_challenge_method: "S256",
      code_challenge: "b".repeat(43),
    }).toString();
    const request = {
      authorizationUrl: authorize.toString(),
      returnUrl: "https://app.t3.codes/welcome#agents:remote-one",
      environmentId: "remote-one",
      instanceId: "work",
      flowId: "flow-one",
    };
    const link = new URL("liverary-dev://auth/codex");
    link.searchParams.set("request", JSON.stringify(request));
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const electronApp = {
      whenReady: Effect.never,
      on: (event: string, listener: (...args: unknown[]) => void) =>
        Effect.sync(() => {
          listeners.set(event, listener);
        }),
    } as unknown as ElectronApp.ElectronApp["Service"];
    yield* Effect.gen(function* () {
      const clerk = yield* DesktopClerk.DesktopClerk;
      yield* clerk.configure;
      const event = { preventDefault: vi.fn() };
      listeners.get("open-url")!(event, link.href);
      assert.strictEqual(event.preventDefault.mock.calls.length, 0);
    }).pipe(
      Effect.provide(layerDesktopClerk(true, [], "darwin", undefined, listeners)),
      Effect.provideService(HostProcess.Arguments, []),
      Effect.provideService(ElectronApp.ElectronApp, electronApp),
      Effect.provideService(
        ElectronWindow.ElectronWindow,
        {} as ElectronWindow.ElectronWindow["Service"],
      ),
      Effect.provideService(DesktopWebLinks.DesktopWebLinks, ignoreWebLinks),
    );
  }).pipe(Effect.scoped),
);

it.effect("hands web and app links to the renderer and leaves other links alone", () =>
  Effect.gen(function* () {
    storageMock.mockReturnValue(storageAdapter);
    createClerkBridgeMock.mockReturnValue({ cleanup: vi.fn(), isPrimaryInstance: true });
    const listeners = new Map<string, (...args: unknown[]) => void>();
    const electronApp = {
      whenReady: Effect.void,
      on: (name: string, listener: (...args: unknown[]) => void) =>
        Effect.sync(() => {
          listeners.set(name, listener);
        }),
    } as unknown as ElectronApp.ElectronApp["Service"];
    const received: Array<string> = [];
    const pairLink = "liverary://pair?pairingUrl=https%3A%2F%2Fvps.example.com%2F%23token%3Dabc";
    yield* Effect.gen(function* () {
      const clerk = yield* DesktopClerk.DesktopClerk;
      yield* clerk.configure;
      const open = (url: string) => {
        const event = { preventDefault: vi.fn() };
        listeners.get("open-url")!(event, url);
        return event.preventDefault.mock.calls.length;
      };
      assert.strictEqual(open("https://example.com/page"), 1);
      assert.strictEqual(open("http://localhost:3000/"), 1);
      assert.strictEqual(open("liverary://new?prompt=hi"), 1);
      assert.strictEqual(open("liverary://threads/env-1/thread-1"), 1);
      assert.strictEqual(open(pairLink), 1);
      assert.strictEqual(open("liverary://pair"), 0);
      assert.strictEqual(open("t3custom://new?prompt=hi"), 0);
      assert.strictEqual(open("t3custom-dev://threads/env-1/thread-1"), 0);
      assert.strictEqual(open("mailto:hello@example.com"), 0);
      assert.strictEqual(open("liverary://somewhere-else"), 0);
      yield* Effect.yieldNow;
      assert.deepStrictEqual(received, [
        "https://example.com/page",
        "http://localhost:3000/",
        "liverary://new?prompt=hi",
        "liverary://threads/env-1/thread-1",
        pairLink,
      ]);
    }).pipe(
      Effect.provide(layerDesktopClerk(true, [], "darwin", undefined, listeners)),
      Effect.provideService(HostProcess.Arguments, ["t3"]),
      Effect.provideService(ElectronApp.ElectronApp, electronApp),
      Effect.provideService(
        ElectronWindow.ElectronWindow,
        {} as ElectronWindow.ElectronWindow["Service"],
      ),
      Effect.provideService(
        DesktopWebLinks.DesktopWebLinks,
        DesktopWebLinks.DesktopWebLinks.of({
          receive: (url) => Effect.sync(() => void received.push(url)),
          setRendererReady: () => Effect.void,
        }),
      ),
    );
  }).pipe(Effect.scoped),
);
