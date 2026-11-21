import * as DateTime from "effect/DateTime";
import type { ConnectionHop, SupervisorConnectionState } from "./model.ts";

export type ConnectionHopResult = "ok" | "failed" | "unchecked";

export interface ConnectionDiagnosisHop {
  readonly hop: ConnectionHop;
  readonly label: string;
  readonly result: ConnectionHopResult;
}

export interface ConnectionDiagnosis {
  readonly headline: string;
  readonly hops: ReadonlyArray<ConnectionDiagnosisHop>;
  readonly steps: ReadonlyArray<string>;
  readonly facts: ReadonlyArray<readonly [label: string, value: string]>;
}

export interface ConnectionDiagnosisInput {
  readonly hostLabel: string;
  readonly state: SupervisorConnectionState;
  readonly clientVersion?: string | undefined;
  readonly serverVersion?: string | null | undefined;
}

/** Describes a failure on this device or the environment it connects to. */
export function presentConnectionDiagnosis(
  input: ConnectionDiagnosisInput,
): ConnectionDiagnosis | null {
  const { hostLabel: host, state } = input;
  const failure = state.lastFailure;
  const offline = state.network === "offline" || state.phase === "offline";
  if (!offline && failure === null) return null;
  const outdated =
    failure?._tag === "ConnectionBlockedError" && failure.serverUpdateRequired === true;
  const hop: ConnectionHop = offline ? "device" : outdated ? "server" : (failure?.hop ?? "server");
  const denied = failure?.reason === "authentication" || failure?.reason === "permission";
  const headline = offline
    ? "This device is offline"
    : outdated
      ? `${host} runs an older Liverary`
      : hop === "device"
        ? "This device could not prepare the connection"
        : denied
          ? `Liverary on ${host} did not accept this device`
          : `Liverary on ${host} did not answer`;
  const steps = offline
    ? ["Connect this device to the internet. Liverary reconnects on its own."]
    : outdated
      ? [`Update Liverary on ${host}.`]
      : hop === "device"
        ? [
            "Restart Liverary on this device.",
            `If it keeps failing, remove ${host} from this device and add it again.`,
          ]
        : [
            `Make sure Liverary is running on ${host}.`,
            "Retry. If it keeps failing, copy the diagnostics.",
          ];
  const hops: ReadonlyArray<ConnectionDiagnosisHop> = [
    {
      hop: "device",
      label: "This device",
      result:
        hop === "device" ? "failed" : failure?.hop !== undefined || outdated ? "ok" : "unchecked",
    },
    {
      hop: "server",
      label: `Liverary on ${host}`,
      result: hop === "server" ? "failed" : "unchecked",
    },
  ];
  const facts: Array<readonly [string, string]> = [];
  const add = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") facts.push([label, String(value)]);
  };
  add("Cause", offline ? "offline" : outdated ? "outdated" : failure?.reason);
  add("HTTP status", failure?.httpStatus);
  add("Attempts", state.attempt > 0 ? state.attempt : null);
  add(
    "Next retry",
    state.retryAt === null ? null : DateTime.formatIso(DateTime.makeUnsafe(state.retryAt)),
  );
  add("Route", "Direct");
  add("App version", input.clientVersion);
  add("Host version", input.serverVersion);
  add("Error", failure?.detail);
  add("Trace ID", failure?.traceId);
  return { headline, hops, steps, facts };
}

const HOP_MARK = { ok: "ok", failed: "FAILED", unchecked: "not checked" } as const;

/** One plain-text block for bug reports. */
export function connectionDiagnosisText(hostLabel: string, diagnosis: ConnectionDiagnosis): string {
  return [
    `Liverary connection to ${hostLabel}: ${diagnosis.headline}`,
    "",
    ...diagnosis.hops.map((hop) => `${hop.label}: ${HOP_MARK[hop.result]}`),
    "",
    ...diagnosis.facts.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
}
