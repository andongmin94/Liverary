import { settingsMessages, settingsText } from "~/locales/ko/settings";

import { APP_VERSION } from "../../branding";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { InlineButton } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function AboutVersion() {
  const { copyToClipboard } = useCopyToClipboard<void>({
    target: "version",
    onError: (error) => {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: settingsText["Could not copy version"],
          description: error.message,
        }),
      );
    },
  });

  return (
    <code className="text-sm">
      <Tooltip>
        <TooltipTrigger
          render={
            <InlineButton
              aria-label={settingsMessages.copyVersion(APP_VERSION)}
              onClick={() => copyToClipboard(APP_VERSION, undefined)}
            >
              {APP_VERSION}
            </InlineButton>
          }
        />
        <TooltipPopup>{settingsText["Copy version"]}</TooltipPopup>
      </Tooltip>
    </code>
  );
}
