import { msg } from "gt-react";
import { m } from "../i18n/messages";
import type { DesktopBridge } from "@t3tools/contracts";

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
    if (actionError) reportError(m(msg("Could not download update")), actionError);
    return result.completed;
  } catch (error) {
    reportError(
      m(msg("Could not start update download")),
      error instanceof Error ? error.message : m(msg("An unexpected error occurred.")),
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
        m(msg("Could not install update")),
        result.state.message?.trim() ||
          m(
            msg(
              "The update to install has changed or another update is in progress. Check the update status and try again.",
            ),
          ),
      );
      return false;
    }
    const actionError = getDesktopUpdateActionError(result);
    if (!actionError) return true;
    reportError(m(msg("Could not install update")), actionError);
    return false;
  } catch (error) {
    reportError(
      m(msg("Could not install update")),
      error instanceof Error ? error.message : m(msg("An unexpected error occurred.")),
    );
    return false;
  }
}
