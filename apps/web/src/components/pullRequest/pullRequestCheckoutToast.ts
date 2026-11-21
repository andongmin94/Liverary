import { msg } from "gt-react";
import { m } from "../../i18n/messages";

import type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";

export function offHeadPullRequestCheckoutToast(terminology: ChangeRequestTerminology) {
  return {
    type: "warning",
    title: m(msg("Checked out, but not confirmed on the latest commit")),
    description: m(
      msg(
        "This checkout could not be confirmed at the {value0}'s latest commit, so its code may differ. Local commits or uncommitted work keep a checkout where it is.",
        { value0: String(terminology.singular) },
      ),
    ),
  } as const;
}
