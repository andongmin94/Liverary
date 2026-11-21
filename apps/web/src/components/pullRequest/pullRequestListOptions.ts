import { msg } from "gt-react";
import { m } from "../../i18n/messages";

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
  { value: "all", label: m(msg("All")), Icon: LayersIcon },
  { value: "reviewing", label: m(msg("Reviewing")), Icon: EyeIcon },
  { value: "authored", label: m(msg("Authored")), Icon: PenLineIcon },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestInvolvement>>;

export const STATE_TABS = [
  { value: "all", label: m(msg("All")), Icon: LayersIcon },
  { value: "open", label: m(msg("Open")), Icon: PullRequestGlyph.pullRequest },
  { value: "closed", label: m(msg("Closed")), Icon: PullRequestGlyph.closed },
  { value: "merged", label: m(msg("Merged")), Icon: PullRequestGlyph.merged },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestListState>>;

export const SORT_OPTIONS = [
  { value: "ready", label: m(msg("Merge readiness")), Icon: ListChecksIcon },
  { value: "blocked", label: m(msg("Blocked on me")), Icon: UserLockIcon },
  { value: "updated", label: m(msg("Recently updated")), Icon: ClockIcon },
  { value: "newest", label: m(msg("Newest shown")), Icon: CalendarArrowDownIcon },
  { value: "oldest", label: m(msg("Oldest shown")), Icon: CalendarArrowUpIcon },
  { value: "largest", label: m(msg("Largest shown")), Icon: Maximize2Icon },
  { value: "smallest", label: m(msg("Smallest shown")), Icon: Minimize2Icon },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestListSort>>;
