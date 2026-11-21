import { msg } from "gt-i18n";
import { m } from "../i18n/messages.ts";

export const MAC_PERMISSION_SETTINGS_URLS = {
  "screen-recording":
    "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  "full-disk-access":
    "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_AllFiles",
};

export type MacPermission = keyof typeof MAC_PERMISSION_SETTINGS_URLS;

export const MAC_PERMISSION_TITLES: Record<MacPermission, string> = {
  "screen-recording": m(msg("Screen Recording")),
  accessibility: m(msg("Accessibility")),
  "full-disk-access": m(msg("Full Disk Access")),
};
