import { describe, expect, it } from "@effect/vitest";
import { presentConnectionDiagnosis } from "./diagnosis.ts";
import { mapRemoteEnvironmentError } from "./errors.ts";
import {
  AVAILABLE_CONNECTION_STATE,
  ConnectionBlockedError,
  type ConnectionAttemptError,
  type SupervisorConnectionState,
} from "./model.ts";
import { RemoteEnvironmentAuthFetchError } from "../rpc/http.ts";

const backoff = (lastFailure: ConnectionAttemptError): SupervisorConnectionState => ({
  ...AVAILABLE_CONNECTION_STATE,
  desired: true,
  network: "online",
  phase: "backoff",
  attempt: 3,
  lastFailure,
  retryAt: Date.UTC(2026, 9, 19, 12, 0, 30),
});
const diagnose = (state: SupervisorConnectionState) =>
  presentConnectionDiagnosis({ hostLabel: "Mac mini", state });

describe("presentConnectionDiagnosis", () => {
  it("reports this device as offline before the environment", () => {
    const failure = mapRemoteEnvironmentError(
      new RemoteEnvironmentAuthFetchError({ message: "Failed to fetch", cause: new TypeError() }),
    );
    const state = { ...backoff(failure), network: "offline" as const };
    expect(diagnose(state)?.headline).toBe("This device is offline");
    expect(diagnose(state)?.hops.map(({ hop, result }) => `${hop}:${result}`)).toEqual([
      "device:failed",
      "server:unchecked",
    ]);
    expect(diagnose(backoff(failure))?.headline).toBe("Liverary on Mac mini did not answer");
  });
  it("does not report hops as working when the failure names none", () => {
    const failure = new ConnectionBlockedError({
      reason: "authentication",
      detail: "The environment credential is invalid.",
    });
    expect(
      diagnose(backoff(failure))?.hops.map(({ hop, result }) => `${hop}:${result}`),
    ).not.toContainEqual(expect.stringMatching(/:ok$/));
  });
});
