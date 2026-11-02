import { EnvironmentId, ServerConfig } from "@t3tools/contracts";
import * as Schema from "effect/Schema";
import { Atom } from "effect/reactivity";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { appAtomRegistry } from "~/rpc/atomRegistry";
import { serverEnvironment } from "~/state/server";
import { environmentSession } from "~/state/session";
import { startDesktopUpdateLaunchNotice } from "./updateEverythingRun";

const decodeConfig = Schema.decodeUnknownSync(ServerConfig);

function configFor(environmentId: EnvironmentId, serverVersion: string) {
  return decodeConfig({
    environment: {
      environmentId,
      label: environmentId,
      platform: { os: "linux", arch: "x64" },
      serverVersion,
      capabilities: { repositoryIdentity: true },
    },
    auth: {
      policy: "loopback-browser",
      bootstrapMethods: [],
      sessionMethods: [],
      sessionCookieName: "test",
    },
    cwd: "/test",
    keybindingsConfigPath: "/test/keybindings.json",
    keybindings: [],
    issues: [],
    providers: [],
    availableEditors: [],
    observability: {
      logsDirectoryPath: "/test/logs",
      localTracingEnabled: false,
      otlpTracesEnabled: false,
      otlpMetricsEnabled: false,
    },
    settings: {},
  });
}

function relaunchWhileRestarting(environmentId: EnvironmentId, targetVersion = "9.9.9") {
  const now = 1_800_000_000_000;
  vi.useFakeTimers({ now });
  const store = new Map([
    [
      "t3code:update-everything-result:v1",
      JSON.stringify({
        savedAt: now,
        localVersion: null,
        updatedServers: 0,
        updatedProviders: 0,
        failures: [],
        handedOff: [{ environmentId, label: "Slow", targetVersion, startedAt: now }],
      }),
    ],
  ]);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
    },
  });
  return startDesktopUpdateLaunchNotice();
}

describe("startDesktopUpdateLaunchNotice", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps a server that is still restarting from looking idle after the app relaunches", async () => {
    const environmentId = EnvironmentId.make("slow-machine");
    const stop = relaunchWhileRestarting(environmentId);
    try {
      // Lets the registry run its cleanup of unobserved atoms before the UI mounts.
      await vi.advanceTimersByTimeAsync(1_000);
      expect(appAtomRegistry.get(serverEnvironment.updateStateAtom(environmentId))).toMatchObject({
        status: "running",
        stage: "resuming",
        targetVersion: "9.9.9",
      });
    } finally {
      await vi.advanceTimersByTimeAsync(32 * 60 * 1000);
      stop();
    }
  });

  it("clears the restored state when the server never comes back", async () => {
    const environmentId = EnvironmentId.make("lost-machine");
    const stateAtom = serverEnvironment.updateStateAtom(environmentId);
    const stop = relaunchWhileRestarting(environmentId);
    // Observed like the UI does, so the registry cannot reset it by dropping the atom.
    const release = appAtomRegistry.mount(stateAtom);
    try {
      await vi.advanceTimersByTimeAsync(32 * 60 * 1000);
      expect(appAtomRegistry.get(stateAtom)).toEqual({ status: "idle" });
    } finally {
      release();
      stop();
    }
  });

  it.each([
    { name: "cached target without a session", cachedVersion: "0.1.6", liveVersion: null },
    {
      name: "previous nightly on the same version core",
      cachedVersion: "0.1.6-nightly.20261101.1",
      liveVersion: "0.1.6-nightly.20261101.1",
    },
    { name: "previous higher version", cachedVersion: "0.1.7", liveVersion: "0.1.7" },
  ])(
    "waits for the exact live target instead of $name",
    async ({ name, cachedVersion, liveVersion }) => {
      const environmentId = EnvironmentId.make(name);
      const targetVersion = "0.1.6";
      const cachedConfig = Atom.make(configFor(environmentId, cachedVersion));
      const liveConfig = Atom.make<ServerConfig | null>(
        liveVersion === null ? null : configFor(environmentId, liveVersion),
      );
      using _cached = vi.spyOn(serverEnvironment, "configValueAtom").mockReturnValue(cachedConfig);
      using _live = vi
        .spyOn(environmentSession, "initialConfigValueAtom")
        .mockReturnValue(liveConfig);
      const releaseLive = appAtomRegistry.mount(liveConfig);
      const stateAtom = serverEnvironment.updateStateAtom(environmentId);
      const releaseState = appAtomRegistry.mount(stateAtom);
      const stop = relaunchWhileRestarting(environmentId, targetVersion);
      try {
        expect(appAtomRegistry.get(stateAtom)).toMatchObject({
          status: "running",
          stage: "resuming",
          targetVersion,
        });

        appAtomRegistry.set(liveConfig, configFor(environmentId, targetVersion));
        await vi.advanceTimersByTimeAsync(0);
        expect(appAtomRegistry.get(stateAtom)).toEqual({ status: "idle" });
      } finally {
        await vi.advanceTimersByTimeAsync(32 * 60 * 1000);
        releaseState();
        releaseLive();
        stop();
      }
    },
  );
});
