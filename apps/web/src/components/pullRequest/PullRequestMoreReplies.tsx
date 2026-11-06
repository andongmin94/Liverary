import { workspaceMessages, workspaceText } from "~/locales/ko/workspace";
import type { PullRequestReplyAvailability } from "./pullRequestDetail.logic";

export function PullRequestMoreReplies({
  moreReplies,
  hasMoreReplies,
  url,
}: PullRequestReplyAvailability) {
  if (!hasMoreReplies) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-2 py-1 text-xs text-muted-foreground">
      <span>
        {moreReplies > 0
          ? workspaceMessages["{0} more {1}"](
              moreReplies.toLocaleString(),
              moreReplies === 1 ? "reply" : "replies",
            )
          : workspaceText["More replies"]}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground hover:underline"
        >
          {workspaceText["View on host"]}
        </a>
      ) : null}
    </div>
  );
}
