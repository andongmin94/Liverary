import {
  formatDuration as sharedFormatDuration,
  formatResetsIn as sharedFormatResetsIn,
} from "@t3tools/shared/usageLimits";
import { timeKo } from "~/locales/ko/time";
import { workspaceMessages, workspaceText } from "~/locales/ko/workspace";

function localizeDuration(duration: string): string {
  return duration.replace(/(\d+)([dhm])/g, (_, count: string, unit: string) =>
    unit === "d"
      ? timeKo.days(Number(count))
      : unit === "h"
        ? timeKo.hours(Number(count))
        : timeKo.minutes(Number(count)),
  );
}

export function formatDuration(ms: number): string {
  return localizeDuration(sharedFormatDuration(ms));
}

export function formatResetsIn(...args: Parameters<typeof sharedFormatResetsIn>): string | null {
  const text = sharedFormatResetsIn(...args);
  if (text === null) return null;
  if (text === "resets now") return workspaceText["resets now"];
  if (text === "Resets momentarily") return workspaceText["Resets momentarily"];
  return workspaceMessages["Resets in {0}"](localizeDuration(text.slice("resets in ".length)));
}
