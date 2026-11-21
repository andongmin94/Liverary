import { msg } from "gt-react";
import { m } from "../../i18n/messages";

import {
  codexFeedbackNotice,
  type CodexFeedbackSubmission,
} from "@t3tools/client-runtime/state/threads";
import { MessageSquareIcon } from "lucide-react";

import { writeTextToClipboard } from "../../hooks/useCopyToClipboard";
import { Button } from "../ui/button";
import { toastManager } from "../ui/toast";
import type { ComposerBannerStackItem } from "./ComposerBannerStack";

export function feedbackBannerItem(
  submission: CodexFeedbackSubmission,
  onDismiss: () => void,
): ComposerBannerStackItem | null {
  const notice = codexFeedbackNotice(submission);
  if (!notice) return null;
  return {
    id: `feedback:${submission.id}`,
    variant:
      submission.status === "failed" ? "error" : submission.status === "sent" ? "success" : "info",
    icon: <MessageSquareIcon />,
    ...notice,
    actions:
      submission.status === "sent" ? (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            void writeTextToClipboard(
              submission.feedbackId,
              m(msg("Codex feedback thread ID")),
            ).catch((error: unknown) => {
              toastManager.add({
                type: "error",
                title: m(msg("Could not copy thread ID")),
                description: error instanceof Error ? error.message : m(msg("An error occurred.")),
              });
            });
          }}
        >
          {m(msg("Copy ID"))}
        </Button>
      ) : undefined,
    ...(submission.status !== "uploading"
      ? { dismissLabel: m(msg("Dismiss feedback notice")), onDismiss }
      : {}),
  };
}
