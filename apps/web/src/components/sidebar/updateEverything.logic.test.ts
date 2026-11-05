import { EnvironmentId, type ServerSelfUpdateCapability } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  collectRestartingMachines,
  collectServerUpdateTargets,
  collectUpdateEverythingResult,
  describeUpdateCapsule,
  describeUpdateEverything,
  getUpdateEverythingToastView,
  runUpdateEverything,
  type UpdateEverythingMachine,
} from "./updateEverything.logic";

function machine(
  id: string,
  serverVersion: string,
  selfUpdate: ServerSelfUpdateCapability | undefined,
  overrides: Partial<UpdateEverythingMachine> = {},
): UpdateEverythingMachine {
  return {
    environmentId: EnvironmentId.make(id),
    label: id,
    serverConfig: {
      environment: {
        environmentId: EnvironmentId.make(id),
        label: id,
        platform: { os: "linux", arch: "x64" },
        serverVersion,
        capabilities: {
          repositoryIdentity: true,
          ...(selfUpdate ? { serverSelfUpdate: selfUpdate } : {}),
          ...(selfUpdate === "desktop-managed" ? { desktopAppUpdate: true } : {}),
        },
      },
      settings: { continueThreadsAfterServerUpdate: false },
    },
    connected: true,
    hostedByThisApp: false,
    canMaintain: true,
    updateState: { status: "idle" },
    ...overrides,
  };
}

describe("collectServerUpdateTargets", () => {
  it("updates remote servers that can move to the target and names every skipped one", () => {
    const { targets, skipped } = collectServerUpdateTargets(
      [
        machine("this-app", "0.0.40", "desktop-managed", { hostedByThisApp: true }),
        machine("service", "0.0.40", "boot-service"),
        machine("other-desktop", "0.0.49", "desktop-managed"),
        machine("offline", "0.0.40", "boot-service", { connected: false }),
        machine("never-connected", "0.0.40", "boot-service", { serverConfig: null }),
        machine("no-scope", "0.0.40", "boot-service", { canMaintain: false }),
        machine("busy", "0.0.40", "boot-service", {
          updateState: {
            status: "running",
            stage: "downloading",
            fromVersion: "0.0.40",
            targetVersion: "0.0.50",
          },
        }),
        machine("current", "0.0.50", "boot-service"),
        machine("current-offline", "0.0.50", "boot-service", { connected: false }),
        machine("manual", "0.0.40", undefined),
      ],
      "0.0.50",
    );

    expect(targets.map((target) => [target.serverLabel, target.targetVersion])).toEqual([
      ["service", "0.0.50"],
      ["other-desktop", "0.0.50"],
    ]);
    expect(skipped.map((entry) => [entry.label, entry.reason])).toEqual([
      ["offline", "연결되지 않음"],
      ["never-connected", "연결되지 않음"],
      ["no-scope", "업데이트 권한 없음"],
      ["busy", "업데이트 진행 중"],
      ["manual", "직접 업데이트해야 함"],
    ]);
  });

  it("skips servers whose policy refuses the update, with the policy's message", () => {
    const managed = (
      id: string,
      updates: { mode: "off" | "auto" },
      selfUpdate: "boot-service" | "desktop-managed" = "boot-service",
    ) => {
      const base = machine(id, "0.0.40", selfUpdate);
      return {
        ...base,
        serverConfig: {
          ...base.serverConfig!,
          managedPolicy: { organization: "Example Corp", lockedSettings: [], limits: { updates } },
        },
      };
    };
    const machines = [
      managed("off", { mode: "off" }),
      managed("automatic", { mode: "auto" }),
      managed("desktop-automatic", { mode: "auto" }, "desktop-managed"),
    ];

    expect(
      collectServerUpdateTargets(machines, "0.0.50").skipped.map((entry) => [
        entry.label,
        entry.reason,
      ]),
    ).toEqual([["off", "Example Corp에서 Liverary 업데이트를 관리합니다."]]);
    expect(
      collectServerUpdateTargets(machines, "0.0.50").targets.map((entry) => entry.serverLabel),
    ).toEqual(["automatic", "desktop-automatic"]);
  });
});

describe("collectRestartingMachines", () => {
  it("lists updated servers, and this app's servers only when it installs", () => {
    const withContinuation = (
      id: string,
      overrides: Partial<UpdateEverythingMachine> = {},
      enabled = false,
    ) => {
      const base = machine(id, "0.0.40", "boot-service", overrides);
      return {
        ...base,
        serverConfig: {
          environment: base.serverConfig!.environment,
          settings: { continueThreadsAfterServerUpdate: enabled },
        },
      };
    };
    const machines = [
      withContinuation("this-app", { hostedByThisApp: true }, true),
      withContinuation("alvin", {}, true),
      withContinuation("opted-out", {}, false),
      machine("old", "0.0.40", "boot-service"),
      withContinuation("providers-only"),
    ];
    const servers = ["alvin", "opted-out", "old"].map((id) => ({
      environmentId: EnvironmentId.make(id),
    }));

    expect(collectRestartingMachines(machines, servers, true)).toEqual([
      { environmentId: "this-app", continuesThreads: true },
      { environmentId: "alvin", continuesThreads: true },
      { environmentId: "opted-out", continuesThreads: false },
      { environmentId: "old", continuesThreads: false },
    ]);
    expect(
      collectRestartingMachines(machines, servers, false).map((entry) => entry.environmentId),
    ).toEqual(["alvin", "opted-out", "old"]);
  });
});

describe("runUpdateEverything", () => {
  it("still updates remote machines when the local download fails", async () => {
    const calls: string[] = [];
    const result = await runUpdateEverything({
      downloadLocal: async () => false,
      updateProviders: async () => {
        calls.push("providers");
      },
      updateServers: async () => {
        calls.push("servers");
      },
    });

    expect(calls).toEqual(["providers", "servers"]);
    expect(result.localReady).toBe(false);
  });
});

describe("collectUpdateEverythingResult", () => {
  it("keeps skipped servers and interrupted providers in the result after other updates succeed", () => {
    const result = collectUpdateEverythingResult({
      localVersion: "1.2.6",
      localFailures: [],
      servers: [
        { label: "Laptop", outcome: { status: "updated" } },
        { label: "Office", outcome: { status: "skipped" } },
      ],
      providers: [{ status: "updated" }, { status: "interrupted" }],
    });

    expect(result.updatedServers).toBe(1);
    expect(result.updatedProviders).toBe(1);
    expect(result.failures).toEqual([
      "Office: 업데이트를 시작하지 못했습니다",
      "에이전트 업데이트가 중단됐습니다.",
    ]);
    expect(getUpdateEverythingToastView(result, "1.2.6")).toMatchObject({ type: "error" });
  });
});

describe("describeUpdateEverything", () => {
  it("gives each machine one row with its T3 Code and provider updates", () => {
    const id = EnvironmentId.make;
    const { rows } = describeUpdateEverything({
      localVersion: "1.1.0",
      localMachines: [
        { environmentId: id("local"), label: "Mainbook" },
        { environmentId: id("wsl"), label: "Mainbook WSL" },
      ],
      servers: [
        {
          environmentId: id("npm"),
          serverLabel: "bb-1",
          selfUpdate: "respawn",
          targetVersion: "1.1.0",
        },
      ],
      providerMachines: [
        { environmentId: id("npm"), label: "bb-1", providers: ["Codex", "Claude"] },
        { environmentId: id("local"), label: "Mainbook", providers: ["Codex"] },
        { environmentId: id("manual"), label: "alvin", providers: ["Claude"] },
      ],
      skipped: [
        { environmentId: id("manual"), label: "alvin", reason: "needs a manual update" },
        { environmentId: id("offline"), label: "TheoRoom", reason: "not connected" },
      ],
    });

    expect(
      rows.map(({ label, app, skipped, providers }) => [label, app, skipped, providers]),
    ).toEqual([
      ["Mainbook", "this-app", null, ["Codex"]],
      ["Mainbook WSL", "this-app", null, []],
      ["bb-1", "server", null, ["Codex", "Claude"]],
      ["alvin", null, "needs a manual update", ["Claude"]],
      ["TheoRoom", null, "not connected", []],
    ]);
  });
});

describe("describeUpdateCapsule", () => {
  it("offers a retry for failed server updates", () => {
    const failed = {
      machine: {
        environmentId: EnvironmentId.make("remote"),
        label: "remote",
        updatesProviders: false,
        server: {
          environmentId: EnvironmentId.make("remote"),
          serverLabel: "remote",
          selfUpdate: "boot-service" as const,
          targetVersion: "0.1.3",
        },
        handedOffVersion: null,
        startedAt: 0,
        result: "failed" as const,
        failure: "offline",
        providerFailure: null,
      },
      status: "failed" as const,
    };
    const run = { localVersion: null, phase: "servers" as const, restartAt: null, machines: [] };

    expect(describeUpdateCapsule(run, [failed], null, 0).action).toBe("retry");
  });
});
