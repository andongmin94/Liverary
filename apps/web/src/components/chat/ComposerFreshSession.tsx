import { chatKo } from "~/locales/ko/chat";
import { EraserIcon } from "lucide-react";

import type { ComposerBannerStackItem } from "./ComposerBannerStack";

/** Shown while `/clear` is armed; dismissing it keeps the current conversation. */
export function freshSessionBannerItem(onUndo: () => void): ComposerBannerStackItem {
  return {
    id: "fresh-session",
    variant: "info",
    icon: <EraserIcon />,
    title: chatKo["Your next message starts a fresh session"],
    description: chatKo["The agent won't see earlier messages in this thread."],
    dismissLabel: chatKo["Keep the current session"],
    onDismiss: onUndo,
  };
}
