import { describe, expect, it } from "vite-plus/test";
import type { DesktopUpdateState } from "@t3tools/contracts";

import {
  canCheckForUpdate,
  getDesktopUpdateButtonTooltip,
  getDesktopUpdateReleaseHistoryUrl,
  getDesktopUpdateActionError,
  getDesktopUpdateReleaseUrl,
  installDesktopUpdate,
  resolveDesktopUpdateButtonAction,
} from "./desktopUpdate.logic";

const baseState: DesktopUpdateState = {
  enabled: true,
  status: "idle",
  currentVersion: "1.0.0",
  hostArch: "x64",
  appArch: "x64",
  runningUnderArm64Translation: false,
  availableVersion: null,
  downloadedVersion: null,
  releaseNotes: [],
  omittedReleaseCount: 0,
  downloadPercent: null,
  checkedAt: null,
  message: null,
  errorContext: null,
  canRetry: false,
};

describe("desktop update button state", () => {
  it("keeps retry action available after a download error", () => {
    const state: DesktopUpdateState = {
      ...baseState,
      status: "error",
      availableVersion: "1.1.0",
      message: "network timeout",
      errorContext: "download",
      canRetry: true,
    };
    expect(resolveDesktopUpdateButtonAction(state)).toBe("download");
    expect(getDesktopUpdateButtonTooltip(state)).toContain("클릭하여 다시 시도하세요");
  });

  it("shows the download failure after returning to available", () => {
    const state: DesktopUpdateState = {
      ...baseState,
      status: "available",
      availableVersion: "1.1.0",
      message: "network timeout",
      errorContext: "download",
      canRetry: true,
    };
    expect(resolveDesktopUpdateButtonAction(state)).toBe("download");
    expect(getDesktopUpdateButtonTooltip(state)).toBe(
      "1.1.0 다운로드에 실패했습니다. 클릭하여 다시 시도하세요.",
    );
    expect(getDesktopUpdateButtonTooltip({ ...state, notAppliedVersion: "1.1.0" })).toBe(
      "업데이트 1.1.0이(가) 적용되지 않았습니다. 클릭하여 다시 시도하세요.",
    );
  });

  it("shows the install failure after the desktop returns to downloaded", () => {
    // reduceDesktopUpdateStateOnInstallFailure: a refused macOS install prompt lands here.
    const state: DesktopUpdateState = {
      ...baseState,
      status: "downloaded",
      availableVersion: "1.1.0",
      downloadedVersion: "1.1.0",
      message: "Desktop updater install operation reported an error.",
      errorContext: "install",
      canRetry: true,
    };
    expect(resolveDesktopUpdateButtonAction(state)).toBe("install");
    expect(getDesktopUpdateButtonTooltip(state)).toBe(
      "1.1.0 설치에 실패했습니다. 클릭하여 다시 시도하세요.",
    );
  });

  it("reports an install the desktop refuses after accepting it", async () => {
    const downloaded: DesktopUpdateState = {
      ...baseState,
      status: "downloaded",
      availableVersion: "1.1.0",
      downloadedVersion: "1.1.0",
    };
    const failed: DesktopUpdateState = {
      ...downloaded,
      message: "OSStatus error -60006.",
      errorContext: "install",
      canRetry: true,
    };
    const listeners = new Set<(state: DesktopUpdateState) => void>();
    const emit = (state: DesktopUpdateState) => listeners.forEach((listener) => listener(state));
    const install = installDesktopUpdate({
      onUpdateState: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      installUpdate: async () => {
        // A retry's pre-install check can restore the previous failure before the restart starts.
        emit(failed);
        return { accepted: true, completed: false, state: downloaded };
      },
    });
    let settled = false;
    void install.then(() => {
      settled = true;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    emit(failed);
    const result = await install;
    expect(getDesktopUpdateActionError(result)).toBe("OSStatus error -60006.");
    expect(listeners.size).toBe(0);
  });

  it("prefers a newly available release over a stale downloaded version", () => {
    const state: DesktopUpdateState = {
      ...baseState,
      status: "available",
      availableVersion: "1.2.0",
      downloadedVersion: "1.1.0",
    };
    expect(resolveDesktopUpdateButtonAction(state)).toBe("download");
  });

  it("hides the install action while checking for a newer release", () => {
    const state: DesktopUpdateState = {
      ...baseState,
      status: "checking",
      availableVersion: "1.1.0",
      downloadedVersion: "1.1.0",
      downloadPercent: 100,
    };
    expect(resolveDesktopUpdateButtonAction(state)).toBe("none");
  });
});

describe("desktop update UI helpers", () => {
  it.each(["owner/repo/extra", "owner#notes/repo", "owner/repo?tab=notes"])(
    "falls back to Liverary for an invalid configured repository: %s",
    (repository) => {
      expect(getDesktopUpdateReleaseHistoryUrl(repository)).toBe(
        "https://github.com/andongmin94/Liverary/releases",
      );
      expect(getDesktopUpdateReleaseUrl("1.2.3", repository)).toBe(
        "https://github.com/andongmin94/Liverary/releases/tag/v1.2.3",
      );
    },
  );
});

describe("canCheckForUpdate", () => {
  it("returns true once an update has been downloaded so newer releases can be found", () => {
    expect(
      canCheckForUpdate({
        ...baseState,
        status: "downloaded",
        availableVersion: "1.1.0",
        downloadedVersion: "1.1.0",
      }),
    ).toBe(true);
  });
});
