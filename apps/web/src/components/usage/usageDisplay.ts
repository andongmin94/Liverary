import { localizeResetCreditText } from "./usageCopy";
import { msg } from "gt-react";
import { m } from "../../i18n/messages";
import {
  formatDuration as sharedFormatDuration,
  formatResetsIn as sharedFormatResetsIn,
  resetCreditChoices as sharedResetCreditChoices,
} from "@t3tools/shared/usageLimits";

function localizeDuration(duration: string): string {
  return duration.replace(/(\d+)([dhm])/g, (_, count: string, unit: string) =>
    unit === "d"
      ? m(msg("{count}d", { count: String(Number(count)) }))
      : unit === "h"
        ? m(msg("{count}h", { count: String(Number(count)) }))
        : m(msg("{count}m", { count: String(Number(count)) })),
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
    const expiry = expiresIn ? m(msg(" · expires in {value0}", { value0: String(expiresIn) })) : "";
    if (option) {
      const label = localizeResetCreditText(option.label);
      return {
        ...choice,
        summary: m(
          msg("{label} · {count} remaining{expiry}", {
            label: String(label),
            count: String(choice.availableCount),
            expiry: String(expiry),
          }),
        ),
        actionLabel: m(msg("Use")),
        confirmDescription: m(
          msg("{label}: {description} This cannot be undone.", {
            label: String(label),
            description: String(localizeResetCreditText(option.description)),
          }),
        ),
      };
    }
    return {
      ...choice,
      summary:
        choice.availableCount === 0
          ? m(msg("No reset credits banked"))
          : compact
            ? m(
                msg("{value0} banked{value1}", {
                  value0: String(choice.availableCount),
                  value1: String(expiry),
                }),
              )
            : m(
                msg("{count} reset credits banked{value1}", {
                  count: String(choice.availableCount),
                  value1: String(
                    expiresIn
                      ? m(msg(" · next expiry in {value0}", { value0: String(expiresIn) }))
                      : "",
                  ),
                }),
              ),
      actionLabel: m(msg("Use reset")),
      confirmDescription: m(
        msg(
          "This redeems one credit on your account and clears the current rate-limit windows. It cannot be undone.",
        ),
      ),
    };
  });
}

export function formatResetsIn(...args: Parameters<typeof sharedFormatResetsIn>): string | null {
  const text = sharedFormatResetsIn(...args);
  if (text === null) return null;
  if (text === "resets now") return m(msg("resets now"));
  if (text === "Resets momentarily") return m(msg("Resets momentarily"));
  return m(
    msg("Resets in {value0}", {
      value0: String(localizeDuration(text.slice("resets in ".length))),
    }),
  );
}
