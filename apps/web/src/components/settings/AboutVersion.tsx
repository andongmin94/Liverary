import { settingsMessages, settingsText } from "~/locales/ko/settings";
import { useRef } from "react";

import { APP_VERSION } from "../../branding";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { showAnchoredCopySuccessToast } from "../ui/anchoredCopyToast";
import { InlineButton } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function AboutVersion() {
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const { copyToClipboard } = useCopyToClipboard<void>({
    target: "version",
    onCopy: () => showAnchoredCopySuccessToast(copyButtonRef),
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
              ref={copyButtonRef}
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
