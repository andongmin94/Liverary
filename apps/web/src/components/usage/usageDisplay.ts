import {
  formatDuration as sharedFormatDuration,
  formatResetsIn as sharedFormatResetsIn,
  resetCreditChoices as sharedResetCreditChoices,
} from "@t3tools/shared/usageLimits";
import { timeKo } from "~/locales/ko/time";
import { resetCreditKo, workspaceMessages, workspaceText } from "~/locales/ko/workspace";

function localizeDuration(duration: string): string {
  return duration.replace(/(\d+)([dhm])/g, (_, count: string, unit: string) =>
    unit === "d"
      ? timeKo.days(Number(count))
      : unit === "h"
        ? timeKo.hours(Number(count))
        : timeKo.minutes(Number(count)),
  );
}

export function resetCreditChoices(...args: Parameters<typeof sharedResetCreditChoices>) {
  const [credits, , now, compact] = args;
  return sharedResetCreditChoices(...args).map((choice) => {
    const option =
      "creditId" in choice.input
        ? credits.options?.find((option) => option.creditId === choice.key)
        : undefined;
    const expiresAt = option ? option.expiresAt : credits.nextExpiresAt;
    const expiresIn = expiresAt
      ? localizeDuration(sharedFormatDuration(Date.parse(expiresAt) - now))
      : null;
    const expiry = expiresIn ? workspaceMessages[" · expires in {0}"](expiresIn) : "";
    if (option) {
      const label = resetCreditKo.providerText(option.label);
      return {
        ...choice,
        summary: resetCreditKo.remaining(label, choice.availableCount, expiry),
        actionLabel: resetCreditKo.use,
        confirmDescription: resetCreditKo.confirm(
          label,
          resetCreditKo.providerText(option.description),
        ),
      };
    }
    return {
      ...choice,
      summary:
        choice.availableCount === 0
          ? workspaceText["No reset credits banked"]
          : compact
            ? workspaceMessages["{0} banked{1}"](choice.availableCount, expiry)
            : resetCreditKo.banked(choice.availableCount, expiresIn),
      actionLabel: workspaceText["Use reset"],
      confirmDescription:
        workspaceText[
          "This redeems one credit on your account and clears the current rate-limit windows. It cannot be undone."
        ],
    };
  });
}

export function formatResetsIn(...args: Parameters<typeof sharedFormatResetsIn>): string | null {
  const text = sharedFormatResetsIn(...args);
  if (text === null) return null;
  if (text === "resets now") return workspaceText["resets now"];
  if (text === "Resets momentarily") return workspaceText["Resets momentarily"];
  return workspaceMessages["Resets in {0}"](localizeDuration(text.slice("resets in ".length)));
}
