import { EnvironmentId } from "@t3tools/contracts";
import type { ServerUpdateState } from "@t3tools/client-runtime/state/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const branding = vi.hoisted(() => ({ APP_VERSION: "0.0.34" }));
vi.mock("./branding", () => branding);

import { APP_VERSION } from "./branding";
import {
  buildVersionMismatchDismissalKey,
  dismissServerUpdateFailure,
  dismissVersionMismatch,
  isServerUpdateFailureDismissed,
  isVersionMismatchDismissed,
  resolveVersionMismatch,
} from "./versionSkew";

const MISMATCH_HINT =
  "Version mismatch. Try syncing the client and server to the same Liverary version.";

describe("versionSkew", () => {
  beforeEach(() => {
    branding.APP_VERSION = "0.0.34";
  });

  it("dismisses only the current failed attempt without clearing its retry state", () => {
    const failure = {
      status: "failed",
      stage: "downloading",
      fromVersion: "0.0.33",
      targetVersion: "0.0.34",
      message: "Download failed.",
    } as const satisfies ServerUpdateState;
    const retryFailure = { ...failure };
    const otherEnvironmentFailure = { ...failure };

    dismissServerUpdateFailure(failure);

    expect(isServerUpdateFailureDismissed(failure)).toBe(true);
    expect(failure.status).toBe("failed");
    expect(failure.message).toBe("Download failed.");
    expect(isServerUpdateFailureDismissed(retryFailure)).toBe(false);
    expect(isServerUpdateFailureDismissed(otherEnvironmentFailure)).toBe(false);
  });

  it("returns a mismatch when the server is behind the client", () => {
    expect(resolveVersionMismatch("0.0.33")).toEqual({
      clientVersion: "0.0.34",
      serverVersion: "0.0.33",
      hint: MISMATCH_HINT,
    });
  });

  it("does not warn when the server is ahead of the client", () => {
    expect(resolveVersionMismatch("0.0.35")).toBeNull();
    expect(resolveVersionMismatch("9.9.9")).toBeNull();
  });

  it("does not warn when a development and a stable build share a core version", () => {
    expect(resolveVersionMismatch("0.0.34-dev.1")).toBeNull();

    branding.APP_VERSION = "0.0.34-dev.1";
    expect(resolveVersionMismatch("0.0.34")).toBeNull();
  });

  // regression: #7579 versions were compared as strings, not semver
  it("treats a development server built past the client as ahead, not skew", () => {
    expect(resolveVersionMismatch("0.0.35-dev.1")).toBeNull();
  });

  it("still warns when a development client outruns the server by a release", () => {
    branding.APP_VERSION = "0.0.35-dev.1";

    expect(resolveVersionMismatch("0.0.34")).toEqual({
      clientVersion: "0.0.35-dev.1",
      serverVersion: "0.0.34",
      hint: MISMATCH_HINT,
    });
  });

  it("falls back to string inequality when a version is not semver", () => {
    expect(resolveVersionMismatch("dev")).toEqual({
      clientVersion: "0.0.34",
      serverVersion: "dev",
      hint: MISMATCH_HINT,
    });

    branding.APP_VERSION = "dev";
    expect(resolveVersionMismatch("dev")).toBeNull();
    expect(resolveVersionMismatch("0.0.34")).toMatchObject({ serverVersion: "0.0.34" });
  });

  it("keys dismissals by environment, client version, and server version", () => {
    const environmentId = EnvironmentId.make("environment-dismissal");
    const key = buildVersionMismatchDismissalKey(environmentId, {
      clientVersion: APP_VERSION,
      serverVersion: "9.9.9",
    });

    expect(isVersionMismatchDismissed(key)).toBe(false);

    dismissVersionMismatch(key);

    expect(isVersionMismatchDismissed(key)).toBe(true);
    expect(
      isVersionMismatchDismissed(
        buildVersionMismatchDismissalKey(environmentId, {
          clientVersion: APP_VERSION,
          serverVersion: "9.9.10",
        }),
      ),
    ).toBe(false);
  });
});
