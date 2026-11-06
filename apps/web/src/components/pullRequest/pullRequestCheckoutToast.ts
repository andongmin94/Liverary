import { workspaceMessages, workspaceText } from "~/locales/ko/workspace";
import type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";

export function offHeadPullRequestCheckoutToast(terminology: ChangeRequestTerminology) {
  return {
    type: "warning",
    title: workspaceText["Checked out, but not confirmed on the latest commit"],
    description: workspaceMessages[
      "This checkout could not be confirmed at the {0}'s latest commit, so its code may differ. Local commits or uncommitted work keep a checkout where it is."
    ](terminology.singular),
  } as const;
}
