import * as HostProcess from "@t3tools/shared/HostProcess";
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { vi } from "vite-plus/test";
import * as ElectronApp from "../electron/ElectronApp.ts";
import * as ElectronWindow from "../electron/ElectronWindow.ts";
import * as DesktopAppLinks from "./DesktopAppLinks.ts";
import * as DesktopWebLinks from "./DesktopWebLinks.ts";

const ignoreWebLinks = DesktopWebLinks.DesktopWebLinks.of({
  receive: () => Effect.void,
  setRendererReady: () => Effect.void,
});

const layerDesktopAppLinks = (listeners = new Map<string, (...args: unknown[]) => void>()) =>
  DesktopAppLinks.layer.pipe(
    Layer.provide(
      Layer.succeed(ElectronApp.ElectronApp, {
        on: (name: string, listener: (...args: unknown[]) => void) =>
          Effect.acquireRelease(
            Effect.sync(() => {
              listeners.set(name, listener);
            }),
            () =>
              Effect.sync(() => {
                listeners.delete(name);
              }),
          ).pipe(Effect.asVoid),
      } as unknown as ElectronApp.ElectronApp["Service"]),
    ),
  );

describe("DesktopAppLinks", () => {
  it.effect.each(["before configure", "after configure"] as const)(
    "reveals the running window when a second instance launches %s",
    (entry) => {
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
        const appLinks = yield* DesktopAppLinks.DesktopAppLinks;
        if (entry === "before configure") listeners.get("second-instance")?.({}, ["t3"]);
        yield* appLinks.configure;

        assert.equal(quit.mock.calls.length, 0);
        if (entry === "after configure") listeners.get("second-instance")!({}, ["t3"]);
        assert.strictEqual(yield* Effect.promise(() => revealed.promise), window);
      }).pipe(
        Effect.scoped,
        Effect.provide(layerDesktopAppLinks(listeners)),
        Effect.provideService(ElectronApp.ElectronApp, electronApp),
        Effect.provideService(ElectronWindow.ElectronWindow, electronWindow),
        Effect.provideService(DesktopWebLinks.DesktopWebLinks, ignoreWebLinks),
      );
    },
  );

  it.effect("delivers each queued startup link once, before later links", () => {
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
      const appLinks = yield* DesktopAppLinks.DesktopAppLinks;
      listeners.get("second-instance")?.({}, ["t3", first]);
      listeners.get("second-instance")?.({}, ["t3", second]);
      listeners.get("open-url")?.({ preventDefault: () => undefined }, launchPair);
      assert.deepEqual(received, []);

      yield* appLinks.configure;
      listeners.get("second-instance")!({}, ["t3", later]);
      yield* Effect.promise(() => delivered.promise);

      assert.deepEqual(received, [launchPair, first, second, later]);
    }).pipe(
      Effect.scoped,
      Effect.provide(layerDesktopAppLinks(listeners)),
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
});

it.effect("provider auth links navigate and reveal the running desktop", () => {
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
    const appLinks = yield* DesktopAppLinks.DesktopAppLinks;
    yield* appLinks.configure;
    const event = { preventDefault: vi.fn() };
    listeners.get("open-url")!(event, "liverary://app/auth/callback?code=unrelated-code");
    listeners.get("open-url")!(event, "liverary-dev://app/welcome");
    assert.equal(loadURL.mock.calls.length, 0);
    assert.equal(event.preventDefault.mock.calls.length, 0);
    listeners.get("second-instance")!({}, [
      "t3",
      "liverary://app/settings/providers?instanceId=work&code=never-forward",
    ]);
    yield* Effect.promise(() => revealed.promise);
    assert.deepEqual(loadURL.mock.calls, [["liverary://app/settings/providers?instanceId=work"]]);
    listeners.get("open-url")!(event, "liverary://app/welcome#agents:machine-id");
    assert.equal(event.preventDefault.mock.calls.length, 1);
  }).pipe(
    Effect.scoped,
    Effect.provide(layerDesktopAppLinks(listeners)),
    Effect.provideService(ElectronApp.ElectronApp, electronApp),
    Effect.provideService(ElectronWindow.ElectronWindow, electronWindow),
    Effect.provideService(DesktopWebLinks.DesktopWebLinks, ignoreWebLinks),
  );
});

it.effect("leaves old hosted Codex sign-in links unhandled", () =>
  Effect.gen(function* () {
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
    const link = new URL("liverary://auth/codex");
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
      const appLinks = yield* DesktopAppLinks.DesktopAppLinks;
      yield* appLinks.configure;
      const event = { preventDefault: vi.fn() };
      listeners.get("open-url")!(event, link.href);
      assert.strictEqual(event.preventDefault.mock.calls.length, 0);
    }).pipe(
      Effect.provide(layerDesktopAppLinks(listeners)),
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
      const appLinks = yield* DesktopAppLinks.DesktopAppLinks;
      yield* appLinks.configure;
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
      assert.strictEqual(open("liverary-dev://new?prompt=hi"), 0);
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
      Effect.provide(layerDesktopAppLinks(listeners)),
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
