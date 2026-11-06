import { workspaceMessages, workspaceText } from "~/locales/ko/workspace";
import type { LinkedPrompt } from "@t3tools/shared/promptLinks";

import { type ComposerThreadTarget, useComposerDraftStore } from "~/composerDraftStore";

import { toastManager } from "../ui/toast";

export function warnAboutHiddenCharacters(prompt: LinkedPrompt): void {
  if (prompt.hiddenCharacters === 0) return;
  toastManager.add({
    type: "warning",
    title: workspaceText["This prompt had hidden characters, it may be malicious"],
    description: workspaceMessages[
      "Liverary removed {0} hidden character{1}. Read the prompt before you send it."
    ](prompt.hiddenCharacters, prompt.hiddenCharacters === 1 ? "" : "s"),
    timeout: 0,
  });
}

export function placeLinkedPrompt(
  target: ComposerThreadTarget,
  prompt: LinkedPrompt,
  notes: ReadonlyArray<string> = [],
): void {
  warnAboutHiddenCharacters(prompt);
  const place = () => {
    useComposerDraftStore.getState().setPrompt(target, prompt.text);
    toastManager.add({
      type: "info",
      title: workspaceText["Prompt added from a link"],
      description: [workspaceText["Read it before you send."], ...notes].join(" "),
    });
  };
  const existing = useComposerDraftStore.getState().getComposerDraft(target)?.prompt ?? "";
  if (existing.trim().length === 0 || existing === prompt.text) {
    place();
    return;
  }
  const id = toastManager.add({
    type: "info",
    title: workspaceText["Linked prompt ready"],
    description:
      workspaceText["This thread already has a draft. Replace it with the linked prompt?"],
    timeout: 0,
    actionProps: {
      children: workspaceText["Replace draft"],
      onClick: () => {
        toastManager.close(id);
        place();
      },
    },
  });
}
