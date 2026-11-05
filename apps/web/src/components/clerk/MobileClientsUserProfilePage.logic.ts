import type { RelayClientDeviceRecord } from "@t3tools/contracts/relay";
import { settingsMessages, settingsText } from "~/locales/ko/settings";

const mobileClientUpdatedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const NOTIFICATION_PREFERENCES = [
  ["notifyOnApproval", settingsText["Approval requests"]],
  ["notifyOnInput", settingsText["Input requests"]],
  ["notifyOnCompletion", settingsText.Completions],
  ["notifyOnFailure", settingsText.Failures],
] as const satisfies ReadonlyArray<
  readonly [keyof RelayClientDeviceRecord["notifications"], string]
>;

export function mobileClientPlatformLabel(device: RelayClientDeviceRecord): string {
  const platform =
    device.platform === "android"
      ? "Android"
      : device.iosMajorVersion === null
        ? "iOS"
        : `iOS ${device.iosMajorVersion}`;
  return `${platform}${device.appVersion ? ` · v${device.appVersion}` : ""}`;
}

export function mobileClientNotificationDetail(device: RelayClientDeviceRecord): string {
  if (!device.notifications.enabled) {
    return settingsText["Push notifications are disabled on this device."];
  }

  const enabledPreferences = NOTIFICATION_PREFERENCES.flatMap(([preference, label]) =>
    device.notifications[preference] ? [label] : [],
  );
  return enabledPreferences.length > 0
    ? settingsMessages.mobileAlertsEnabled(enabledPreferences)
    : settingsText["Push notifications are enabled, but no alert types are selected."];
}

export function mobileClientUpdatedAtLabel(updatedAt: string): string {
  const date = new Date(updatedAt);
  return Number.isNaN(date.getTime())
    ? settingsText["Update time unavailable"]
    : settingsMessages.mobileClientUpdatedAt(mobileClientUpdatedAtFormatter.format(date));
}
