import { managedUpdatesDenial } from "~/locales/ko/managedPolicy";
import type { ServerUpdateState } from "@t3tools/client-runtime/state/server";
import { type EnvironmentId, type ServerConfig } from "@t3tools/contracts";

import { sidebarKo } from "~/locales/ko/sidebar";
import {
  resolveServerSelfUpdateCapability,
  resolveVersionMismatch,
  supportsDesktopAppUpdate,
} from "~/versionSkew";
import type { ServerUpdateOutcome, ServerUpdateTarget } from "../ServerUpdateAction";

export interface UpdateEverythingMachine {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly serverConfig: {
    readonly environment: ServerConfig["environment"];
    readonly settings: Pick<ServerConfig["settings"], "continueThreadsAfterServerUpdate">;
    readonly managedPolicy?: ServerConfig["managedPolicy"];
  } | null;
  readonly connected: boolean;
  readonly hostedByThisApp: boolean;
  readonly canMaintain: boolean;
  readonly updateState: ServerUpdateState;
}

export interface RestartingMachine {
  readonly environmentId: EnvironmentId;
  readonly continuesThreads: boolean;
}

export function collectRestartingMachines(
  machines: ReadonlyArray<UpdateEverythingMachine>,
  servers: ReadonlyArray<Pick<ServerUpdateTarget, "environmentId">>,
  installsLocal: boolean,
): RestartingMachine[] {
  const updated = new Set(servers.map((server) => server.environmentId));
  return machines.flatMap((machine) => {
    const config = machine.serverConfig;
    if (
      config === null ||
      !machine.connected ||
      !(updated.has(machine.environmentId) || (installsLocal && machine.hostedByThisApp))
    ) {
      return [];
    }
    return [
      {
        environmentId: machine.environmentId,
        continuesThreads: config.settings.continueThreadsAfterServerUpdate === true,
      },
    ];
  });
}

export interface SkippedMachine {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly reason: string;
}

/** Skip current and app-hosted servers; the latter update with the app and would relaunch mid-run.
 * Desktop-managed servers use their own feed. Each server's updater checks that it can install the
 * release before it restarts, so no registry precheck runs here. */
export function collectServerUpdateTargets(
  machines: ReadonlyArray<UpdateEverythingMachine>,
  targetVersion: string,
): {
  readonly targets: ServerUpdateTarget[];
  readonly skipped: SkippedMachine[];
} {
  const targets: ServerUpdateTarget[] = [];
  const skipped: SkippedMachine[] = [];
  for (const machine of machines) {
    const config = machine.serverConfig;
    if (machine.hostedByThisApp) continue;
    if (
      config !== null &&
      resolveVersionMismatch(config.environment.serverVersion, targetVersion) === null
    ) {
      continue;
    }
    const skip = (reason: string) =>
      skipped.push({ environmentId: machine.environmentId, label: machine.label, reason });
    const unavailable = unavailableReason(machine);
    if (config === null || unavailable !== null) {
      skip(unavailable ?? sidebarKo.updateMachineDisconnected);
      continue;
    }
    const selfUpdate = resolveServerSelfUpdateCapability(config);
    const managedDenial = managedUpdatesDenial(config.managedPolicy);
    if (managedDenial !== undefined) {
      skip(managedDenial);
      continue;
    }
    const desktopAppUpdate = supportsDesktopAppUpdate(config);
    if (selfUpdate === null) {
      skip(sidebarKo.manualUpdateRequired);
      continue;
    }
    if (selfUpdate === "desktop-managed" && !desktopAppUpdate) {
      skip(sidebarKo.newerDesktopRequired);
      continue;
    }
    const target: ServerUpdateTarget = {
      environmentId: machine.environmentId,
      serverLabel: machine.label,
      selfUpdate,
      installation: config.environment.capabilities.serverInstallation,
      desktopAppUpdate,
      targetVersion,
    };
    targets.push(target);
  }
  return { targets, skipped };
}

function unavailableReason(machine: UpdateEverythingMachine): string | null {
  if (machine.serverConfig === null || !machine.connected)
    return sidebarKo.updateMachineDisconnected;
  if (!machine.canMaintain) return sidebarKo.updatePermissionRequired;
  if (machine.updateState.status === "running") return sidebarKo.updateAlreadyRunning;
  return null;
}

export interface UpdateEverythingSteps<Providers, Servers> {
  readonly downloadLocal?: () => Promise<boolean>;
  readonly updateProviders: () => Promise<Providers>;
  readonly updateServers: () => Promise<Servers>;
}

/** Finish provider installs before server restarts. Install this app last when localReady; failed
 * downloads skip only that install. */
export async function runUpdateEverything<Providers, Servers>(
  steps: UpdateEverythingSteps<Providers, Servers>,
): Promise<{
  readonly localReady: boolean;
  readonly providers: Providers;
  readonly servers: Servers;
}> {
  const [localReady, remote] = await Promise.all([
    steps.downloadLocal?.() ?? Promise.resolve(true),
    steps
      .updateProviders()
      .then(async (providers) => ({ providers, servers: await steps.updateServers() })),
  ]);
  return { localReady, ...remote };
}

export type UpdateRunMachineStatus =
  | "providers"
  | "waiting"
  | "downloading"
  | "restarting"
  | "done"
  | "failed";

export interface UpdateRunMachine {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly updatesProviders: boolean;
  readonly server: ServerUpdateTarget | null;
  readonly handedOffVersion: string | null;
  readonly startedAt: number;
  readonly result: "done" | "failed" | null;
  readonly failure: string | null;
  readonly providerFailure: string | null;
}

export interface UpdateEverythingRun {
  readonly localVersion: string | null;
  readonly phase: "providers" | "servers" | "countdown" | "installing";
  readonly restartAt: number | null;
  readonly machines: ReadonlyArray<UpdateRunMachine>;
}

export function resolveUpdateRunMachineStatus(
  machine: UpdateRunMachine,
  phase: UpdateEverythingRun["phase"],
  serverState: ServerUpdateState,
): UpdateRunMachineStatus {
  if (machine.result !== null) return machine.result;
  if (machine.handedOffVersion !== null) return "restarting";
  if (phase === "providers" && machine.updatesProviders) return "providers";
  if (machine.server !== null && serverState.status === "running") {
    return serverState.stage === "resuming" ? "restarting" : "downloading";
  }
  return "waiting";
}

export function isServerUpdateHandedOff(state: ServerUpdateState): boolean {
  return state.status === "running" && state.stage === "resuming";
}

export function closeFinishedUpdateRun(run: UpdateEverythingRun): UpdateEverythingRun | null {
  return run.phase === "servers" &&
    run.localVersion === null &&
    run.machines.every((machine) => machine.result === "done")
    ? null
    : run;
}

const UPDATE_SLOW_AFTER_MS = 3 * 60 * 1000;

export function formatUpdateElapsed(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return sidebarKo.updateElapsedUnderMinute;
  if (minutes < 60) return sidebarKo.updateElapsedMinutes(minutes);
  return sidebarKo.updateElapsedHours(Math.floor(minutes / 60), minutes % 60);
}

export interface UpdateRunMachineView {
  readonly machine: UpdateRunMachine;
  readonly status: UpdateRunMachineStatus;
}

export type UpdateRunLocalState =
  | { readonly status: "downloading"; readonly percent: number | null }
  | { readonly status: "waiting" }
  | null;

export interface UpdateCapsuleView {
  readonly tone: "default" | "slow" | "failed";
  readonly label: string;
  readonly slow?: { readonly status: string; readonly elapsed: string };
  readonly action: "later" | "retry" | "dismiss" | null;
}

const isActive = (status: UpdateRunMachineStatus) => status !== "done" && status !== "failed";

export function describeUpdateCapsule(
  run: UpdateEverythingRun,
  machines: ReadonlyArray<UpdateRunMachineView>,
  local: UpdateRunLocalState,
  now: number,
): UpdateCapsuleView {
  if (run.phase === "countdown" && run.restartAt !== null) {
    const seconds = Math.max(0, Math.ceil((run.restartAt - now) / 1000));
    return { tone: "default", label: sidebarKo.restartsIn(seconds), action: "later" };
  }
  if (run.phase === "installing") {
    return { tone: "default", label: sidebarKo.restarting, action: null };
  }
  const active = machines.filter(({ status }) => isActive(status) && status !== "waiting");
  const slowest = active.toSorted((a, b) => a.machine.startedAt - b.machine.startedAt)[0];
  if (slowest && now - slowest.machine.startedAt >= UPDATE_SLOW_AFTER_MS) {
    return {
      tone: "slow",
      label: slowest.machine.label,
      slow: {
        status: RUN_STATUS_LABELS[slowest.status],
        elapsed: formatUpdateElapsed(now - slowest.machine.startedAt),
      },
      action: null,
    };
  }
  const done = machines.filter(({ status }) => status === "done").length;
  if (machines.some(({ status }) => isActive(status))) {
    return {
      tone: "default",
      label: sidebarKo.updatedMachineCount(done, machines.length),
      action: null,
    };
  }
  if (local?.status === "downloading") {
    return {
      tone: "default",
      label: sidebarKo.downloadingPercent(local.percent),
      action: null,
    };
  }
  const failed = machines.filter(({ status }) => status === "failed");
  if (failed.length > 0) {
    return {
      tone: "failed",
      label:
        failed.length === 1
          ? sidebarKo.updateMachineFailed(failed[0]!.machine.label)
          : sidebarKo.updateMachinesFailed(failed.length),
      action: failed.some(({ machine }) => machine.server !== null) ? "retry" : "dismiss",
    };
  }
  return {
    tone: "default",
    label: sidebarKo.updatedMachineCount(done, machines.length),
    action: null,
  };
}

export const RUN_STATUS_LABELS: Record<UpdateRunMachineStatus, string> = {
  providers: sidebarKo.updatingProviders,
  waiting: sidebarKo.waiting,
  downloading: sidebarKo.downloadingPercent(null),
  restarting: sidebarKo.restarting,
  done: sidebarKo.done,
  failed: sidebarKo.failed,
};

export interface UpdateEverythingResult {
  readonly localVersion: string | null;
  readonly updatedServers: number;
  readonly updatedProviders: number;
  readonly failures: ReadonlyArray<string>;
  readonly restarting: ReadonlyArray<string>;
}

export function collectUpdateEverythingResult(input: {
  readonly localVersion: string | null;
  readonly localFailures: ReadonlyArray<string>;
  readonly servers: ReadonlyArray<{
    readonly label: string;
    readonly outcome: ServerUpdateOutcome;
  }>;
  readonly providers: ReadonlyArray<
    | { readonly status: "interrupted" | "updated" }
    | { readonly status: "failed"; readonly line: string }
  >;
}): UpdateEverythingResult {
  return {
    localVersion: input.localVersion,
    updatedServers: input.servers.filter(({ outcome }) => outcome.status === "updated").length,
    updatedProviders: input.providers.filter((outcome) => outcome.status === "updated").length,
    restarting: [],
    failures: [
      ...input.localFailures.map((failure) => `${sidebarKo.thisApp}: ${failure}`),
      ...input.servers.flatMap(({ label, outcome }) =>
        outcome.status === "updated"
          ? []
          : [
              `${label}: ${outcome.status === "failed" ? outcome.message : sidebarKo.startUpdateFailed}`,
            ],
      ),
      ...input.providers.flatMap((outcome) =>
        outcome.status === "failed"
          ? [outcome.line]
          : outcome.status === "interrupted"
            ? [sidebarKo.providerUpdateInterrupted]
            : [],
      ),
    ],
  };
}

export function getUpdateEverythingToastView(
  result: UpdateEverythingResult,
  appVersion: string,
): {
  readonly type: "success" | "error";
  readonly title: string;
  readonly description?: string;
} | null {
  const parts = [
    result.localVersion !== null && result.localVersion === appVersion ? sidebarKo.thisApp : null,
    result.updatedServers === 0 ? null : sidebarKo.updatedServerCount(result.updatedServers),
    result.updatedProviders === 0 ? null : sidebarKo.updatedProviderCount(result.updatedProviders),
  ].filter((part) => part !== null);
  const restarting =
    result.restarting.length === 0
      ? []
      : [sidebarKo.machinesStillRestarting(result.restarting.join(", "))];
  if (result.failures.length === 0) {
    if (parts.length === 0) return null;
    return {
      type: "success",
      title: sidebarKo.updatedTargets(parts.join(", ")),
      ...(restarting.length === 0 ? {} : { description: restarting.join("\n") }),
    };
  }
  return {
    type: "error",
    title: parts.length === 0 ? sidebarKo.updateFailed : sidebarKo.updatedTargets(parts.join(", ")),
    description: [...result.failures, ...restarting].join("\n"),
  };
}

export interface UpdateEverythingPlan {
  readonly localVersion: string | null;
  /** Machines whose servers this app hosts; this app's update restarts them. */
  readonly localMachines: ReadonlyArray<{
    readonly environmentId: EnvironmentId;
    readonly label: string;
  }>;
  readonly servers: ReadonlyArray<
    Pick<ServerUpdateTarget, "environmentId" | "serverLabel" | "selfUpdate" | "targetVersion">
  >;
  readonly providerMachines: ReadonlyArray<{
    readonly environmentId: EnvironmentId;
    readonly label: string;
    readonly providers: ReadonlyArray<string>;
  }>;
  readonly skipped: ReadonlyArray<SkippedMachine>;
}

export interface UpdateEverythingRow {
  readonly environmentId: EnvironmentId | null;
  readonly label: string;
  readonly app: "this-app" | "server" | "desktop-app" | null;
  readonly skipped: string | null;
  readonly providers: ReadonlyArray<string>;
}

/** One row per machine: this app's machines first, then servers, provider-only, and skipped. */
export function describeUpdateEverything(plan: UpdateEverythingPlan): {
  readonly summary: string;
  readonly version: string | null;
  readonly providerCount: number;
  readonly rows: ReadonlyArray<UpdateEverythingRow>;
} {
  const providerCount = plan.providerMachines.reduce(
    (count, machine) => count + machine.providers.length,
    0,
  );
  const summary = sidebarKo.updateTargets(
    [
      plan.localVersion ? sidebarKo.thisApp : null,
      plan.servers.length === 0 ? null : sidebarKo.updatedServerCount(plan.servers.length),
      providerCount === 0 ? null : sidebarKo.updatedProviderCount(providerCount),
    ]
      .filter((part) => part !== null)
      .join(", "),
  );

  const rows = new Map<EnvironmentId | null, UpdateEverythingRow>();
  const update = (
    environmentId: EnvironmentId | null,
    label: string,
    change: Partial<UpdateEverythingRow>,
  ) => {
    const row = rows.get(environmentId) ?? {
      environmentId,
      label,
      app: null,
      skipped: null,
      providers: [],
    };
    rows.set(environmentId, { ...row, ...change });
  };
  if (plan.localVersion) {
    if (plan.localMachines.length === 0) update(null, sidebarKo.thisApp, { app: "this-app" });
    for (const machine of plan.localMachines) {
      update(machine.environmentId, machine.label, { app: "this-app" });
    }
  }
  for (const server of plan.servers) {
    update(server.environmentId, server.serverLabel, {
      app: server.selfUpdate === "desktop-managed" ? "desktop-app" : "server",
    });
  }
  for (const machine of plan.providerMachines) {
    update(machine.environmentId, machine.label, { providers: machine.providers });
  }
  for (const machine of plan.skipped) {
    update(machine.environmentId, machine.label, { skipped: machine.reason });
  }

  return {
    summary,
    version:
      plan.localVersion ??
      plan.servers.find((server) => server.selfUpdate !== "desktop-managed")?.targetVersion ??
      null,
    providerCount,
    rows: Array.from(rows.values()),
  };
}
