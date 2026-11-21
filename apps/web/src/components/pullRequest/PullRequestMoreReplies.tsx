import { useGT } from "gt-react";

import type { PullRequestReplyAvailability } from "./pullRequestDetail.logic";

export function PullRequestMoreReplies({
  moreReplies,
  hasMoreReplies,
  url,
}: PullRequestReplyAvailability) {
  const gt = useGT();
  if (!hasMoreReplies) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-2 py-1 text-xs text-muted-foreground">
      <span>
        {moreReplies > 0
          ? gt("{value0} more {value1}", {
              value0: String(moreReplies.toLocaleString()),
              value1: String(moreReplies === 1 ? "reply" : "replies"),
            })
          : gt("More replies")}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          {gt("View on host")}
        </a>
      ) : null}
    </div>
  );
}
