import { msg } from "gt-react";
import { m } from "../../i18n/messages";
const connectionMessages: Record<string, string> = {
  "Wait a moment. Liverary retries on its own.": m(
    msg("Wait a moment. Liverary retries on its own."),
  ),
  "If it keeps waiting, reload or restart Liverary on this device.": m(
    msg("If it keeps waiting, reload or restart Liverary on this device."),
  ),
};

export const localizeConnectionMessage = (message: string) =>
  connectionMessages[message] ?? message;
