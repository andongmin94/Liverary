import type { DesktopBridge } from "@t3tools/contracts";

import { sidebarKo } from "~/locales/ko/sidebar";
import { getDesktopUpdateActionError } from "./desktopUpdate.logic";
import { showDesktopUpdateDownloadedToast } from "./desktopUpdate.toast";
import { stackedThreadToast, toastManager } from "./ui/toast";

export type ReportLocalUpdateError = (title: string, description: string) => void;

const toastUpdateError: ReportLocalUpdateError = (title, description) => {
  toastManager.add(stackedThreadToast({ type: "error", title, description }));
};

export async function downloadLocalUpdate(
  bridge: Pick<DesktopBridge, "downloadUpdate" | "openExternal">,
  {
    notifyDownloaded,
    reportError = toastUpdateError,
  }: { readonly notifyDownloaded: boolean; readonly reportError?: ReportLocalUpdateError },
): Promise<boolean> {
  try {
    const result = await bridge.downloadUpdate();
    if (result.completed && notifyDownloaded) {
      showDesktopUpdateDownloadedToast(bridge, result.state);
    }
    const actionError = getDesktopUpdateActionError(result);
    if (actionError) reportError(sidebarKo.downloadUpdateFailed, actionError);
    return result.completed;
  } catch (error) {
    reportError(
      sidebarKo.startDownloadFailed,
      error instanceof Error ? error.message : sidebarKo.unexpectedError,
    );
    return false;
  }
}

export async function installLocalUpdate(
  bridge: Pick<DesktopBridge, "installUpdate">,
  expectedVersion: string,
  reportError: ReportLocalUpdateError = toastUpdateError,
): Promise<boolean> {
  try {
    const result = await bridge.installUpdate(expectedVersion);
    if (!result.accepted) {
      reportError(
        sidebarKo.installUpdateFailed,
        result.state.message?.trim() || sidebarKo.updateInstallUnavailable,
      );
      return false;
    }
    const actionError = getDesktopUpdateActionError(result);
    if (!actionError) return true;
    reportError(sidebarKo.installUpdateFailed, actionError);
    return false;
  } catch (error) {
    reportError(
      sidebarKo.installUpdateFailed,
      error instanceof Error ? error.message : sidebarKo.unexpectedError,
    );
    return false;
  }
}
