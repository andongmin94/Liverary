import { msg } from "gt-react";
import { m } from "../../i18n/messages";
import type { SnoozePreset } from "@t3tools/client-runtime/state/thread-settled";
import type { TerminalAgentStatus } from "@t3tools/contracts";
export const terminalAgentStates: Record<TerminalAgentStatus["state"], string> = {
  working: m(msg("Working")),
  blocked: m(msg("Blocked")),
  idle: m(msg("Idle", { $context: "sidebarCopy.ts" })),
  unknown: m(msg("Unknown", { $context: "sidebarCopy.ts" })),
};

const snoozeDays: Record<string, string> = {
  Sunday: m(msg("Sunday")),
  Monday: m(msg("Monday")),
  Tuesday: m(msg("Tuesday")),
  Wednesday: m(msg("Wednesday")),
  Thursday: m(msg("Thursday")),
  Friday: m(msg("Friday")),
  Saturday: m(msg("Saturday")),
  Sun: m(msg("Sun")),
  Mon: m(msg("Mon")),
  Tue: m(msg("Tue")),
  Wed: m(msg("Wed")),
  Thu: m(msg("Thu")),
  Fri: m(msg("Fri")),
  Sat: m(msg("Sat")),
};

const snoozeLabels: Record<string, string> = {
  "This morning": m(msg("This morning")),
  "This afternoon": m(msg("This afternoon")),
  "This evening": m(msg("This evening")),
  Tomorrow: m(msg("Tomorrow")),
  "Next week": m(msg("Next week")),
  "Next Sunday": m(msg("Next Sunday")),
  "Next Monday": m(msg("Next Monday")),
  "Next Tuesday": m(msg("Next Tuesday")),
  "Next Wednesday": m(msg("Next Wednesday")),
  "Next Thursday": m(msg("Next Thursday")),
  "Next Friday": m(msg("Next Friday")),
  "Next Saturday": m(msg("Next Saturday")),
};

const snoozeUnits: Record<string, string> = {
  minute: m(msg("minute")),
  hour: m(msg("hour")),
  day: m(msg("day")),
};

export function localizeSnoozePreset(preset: SnoozePreset): SnoozePreset {
  const duration = /^In (\d+) (minute|hour|day)s?$/.exec(preset.label);
  const label = duration
    ? m(
        msg("In {value0} {value1}", {
          value0: String(duration[1]),
          value1: String(snoozeUnits[duration[2]!]),
        }),
      )
    : (snoozeLabels[preset.label] ?? snoozeDays[preset.label] ?? preset.label);
  return {
    ...preset,
    label,
    whenLabel: preset.whenLabel.replace(
      /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/,
      (day) => snoozeDays[day]!,
    ),
  };
}
export const threadStatuses = {
  Working: m(msg("Working")),
  Connecting: m(msg("Connecting")),
  Completed: m(msg("Completed", { $context: "sidebarCopy.ts" })),
  Failed: m(msg("Failed")),
  "Pending Approval": m(msg("Pending Approval", { $context: "sidebarCopy.ts" })),
  "Awaiting Input": m(msg("Awaiting Input", { $context: "sidebarCopy.ts" })),

  Waiting: m(msg("Waiting")),
  "Plan Ready": m(msg("Plan Ready", { $context: "sidebarCopy.ts" })),
};
