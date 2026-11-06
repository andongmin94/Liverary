import { workspaceText } from "~/locales/ko/workspace";
import type { PullRequestInvolvement, PullRequestListState } from "@t3tools/contracts";
import {
  CalendarArrowDownIcon,
  CalendarArrowUpIcon,
  ClockIcon,
  EyeIcon,
  LayersIcon,
  ListChecksIcon,
  Maximize2Icon,
  Minimize2Icon,
  PenLineIcon,
  UserLockIcon,
} from "lucide-react";

import type { PullRequestFilterOption } from "./PullRequestListFilters";
import type { PullRequestListSort } from "./pullRequestListPreferences";
import { PullRequestGlyph } from "./pullRequestIcons";

export const INVOLVEMENT_TABS = [
  { value: "all", label: workspaceText["All"], Icon: LayersIcon },
  { value: "reviewing", label: workspaceText["Reviewing"], Icon: EyeIcon },
  { value: "authored", label: workspaceText["Authored"], Icon: PenLineIcon },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestInvolvement>>;

export const STATE_TABS = [
  { value: "all", label: workspaceText["All"], Icon: LayersIcon },
  { value: "open", label: workspaceText["Open"], Icon: PullRequestGlyph.pullRequest },
  { value: "closed", label: workspaceText["Closed"], Icon: PullRequestGlyph.closed },
  { value: "merged", label: workspaceText["Merged"], Icon: PullRequestGlyph.merged },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestListState>>;

export const SORT_OPTIONS = [
  { value: "ready", label: workspaceText["Merge readiness"], Icon: ListChecksIcon },
  { value: "blocked", label: workspaceText["Blocked on me"], Icon: UserLockIcon },
  { value: "updated", label: workspaceText["Recently updated"], Icon: ClockIcon },
  { value: "newest", label: workspaceText["Newest shown"], Icon: CalendarArrowDownIcon },
  { value: "oldest", label: workspaceText["Oldest shown"], Icon: CalendarArrowUpIcon },
  { value: "largest", label: workspaceText["Largest shown"], Icon: Maximize2Icon },
  { value: "smallest", label: workspaceText["Smallest shown"], Icon: Minimize2Icon },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestListSort>>;
