import { chatKo } from "../../locales/ko/chat";
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
              chatKo["Codex feedback thread ID"],
            ).catch((error: unknown) => {
              toastManager.add({
                type: "error",
                title: chatKo["Could not copy thread ID"],
                description: error instanceof Error ? error.message : chatKo["An error occurred."],
              });
            });
          }}
        >
          {chatKo["Copy ID"]}
        </Button>
      ) : undefined,
    ...(submission.status !== "uploading"
      ? { dismissLabel: chatKo["Dismiss feedback notice"], onDismiss }
      : {}),
  };
}
