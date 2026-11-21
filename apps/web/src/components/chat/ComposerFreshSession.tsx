import { msg } from "gt-react";
import { m } from "../../i18n/messages";

import { EraserIcon } from "lucide-react";

import type { ComposerBannerStackItem } from "./ComposerBannerStack";

/** Shown while `/clear` is armed; dismissing it keeps the current conversation. */
export function freshSessionBannerItem(onUndo: () => void): ComposerBannerStackItem {
  return {
    id: "fresh-session",
    variant: "info",
    icon: <EraserIcon />,
    title: m(msg("Your next message starts a fresh session")),
    description: m(msg("The agent won't see earlier messages in this thread.")),
    dismissLabel: m(msg("Keep the current session")),
    onDismiss: onUndo,
  };
}
