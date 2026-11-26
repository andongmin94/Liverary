import * as DateTime from "effect/DateTime";
import { mFallback, msg } from "gt-i18n";
import type { MFunctionType } from "gt-i18n/types";

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
  resolve: MFunctionType = mFallback,
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
    ? resolve(msg("This device is offline"))
    : outdated
      ? resolve(msg("{host} runs an older Liverary", { host }))
      : hop === "device"
        ? resolve(msg("This device could not prepare the connection"))
        : denied
          ? resolve(msg("Liverary on {host} did not accept this device", { host }))
          : resolve(msg("Liverary on {host} did not answer", { host }));
  const steps = offline
    ? [resolve(msg("Connect this device to the internet. Liverary reconnects on its own."))]
    : outdated
      ? [resolve(msg("Update Liverary on {host}.", { host }))]
      : hop === "device"
        ? [
            resolve(msg("Restart Liverary on this device.")),
            resolve(
              msg("If it keeps failing, remove {host} from this device and add it again.", {
                host,
              }),
            ),
          ]
        : failure?.reason === "authentication"
          ? [
              resolve(
                msg(
                  "This device's sign-in to {host} expired or was revoked. Pair it again with a new pairing link from {host}.",
                  { host },
                ),
              ),
            ]
          : [
              resolve(msg("Make sure Liverary is running on {host}.", { host })),
              resolve(msg("Retry. If it keeps failing, copy the diagnostics.")),
            ];
  const hops: ReadonlyArray<ConnectionDiagnosisHop> = [
    {
      hop: "device",
      label: resolve(msg("This device")),
      result:
        hop === "device" ? "failed" : failure?.hop !== undefined || outdated ? "ok" : "unchecked",
    },
    {
      hop: "server",
      label: resolve(msg("Liverary on {host}", { host })),
      result: hop === "server" ? "failed" : "unchecked",
    },
  ];
  const facts: Array<readonly [string, string]> = [];
  const add = (label: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined && value !== "") facts.push([label, String(value)]);
  };
  add(
    resolve(msg("Cause", { $context: "diagnostics field label" })),
    offline ? "offline" : outdated ? "outdated" : failure?.reason,
  );
  add(resolve(msg("HTTP status")), failure?.httpStatus);
  add(
    resolve(msg("Attempts", { $context: "diagnostics field label" })),
    state.attempt > 0 ? state.attempt : null,
  );
  add(
    resolve(msg("Next retry")),
    state.retryAt === null ? null : DateTime.formatIso(DateTime.makeUnsafe(state.retryAt)),
  );
  add(
    resolve(msg("Route", { $context: "diagnostics field label" })),
    resolve(msg("Direct", { $context: "connection route" })),
  );
  add(resolve(msg("App version")), input.clientVersion);
  add(resolve(msg("Host version")), input.serverVersion);
  add(resolve(msg("Error", { $context: "diagnostics field label" })), failure?.detail);
  add(resolve(msg("Trace ID")), failure?.traceId);
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
