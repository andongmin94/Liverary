import { msg, useGT } from "gt-react";

import { APP_VERSION } from "../../branding";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import { InlineButton } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function AboutVersion() {
  const gt = useGT();
  const { copyToClipboard } = useCopyToClipboard<void>({
    target: {
      target: "version",
      unavailableMessage: msg("Clipboard API is unavailable while copying version."),
      failureMessage: msg("Failed to copy version to the clipboard."),
    },
    onError: (error) => {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: gt("Could not copy version"),
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
              aria-label={gt("Copy version {version}", { version: String(APP_VERSION) })}
              onClick={() => copyToClipboard(APP_VERSION, undefined)}
            >
              {APP_VERSION}
            </InlineButton>
          }
        />
        <TooltipPopup>{gt("Copy version")}</TooltipPopup>
      </Tooltip>
    </code>
  );
}
