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
    const count = choice.availableCount;
    if (option) {
      const label = localizeResetCreditText(option.label);
      return {
        ...choice,
        summary: expiresIn
          ? m(
              msg("{label} · {count} left · expires in {expires}", {
                label,
                count,
                expires: expiresIn,
              }),
            )
          : m(msg("{label} · {count} left", { label, count })),
        actionLabel: m(msg("Use", { $context: "button that redeems a reset credit" })),
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
        count === 0
          ? m(msg("No reset credits banked"))
          : compact
            ? expiresIn
              ? m(msg("{count} banked · expires in {expires}", { count, expires: expiresIn }))
              : m(msg("{count} banked", { count }))
            : expiresIn
              ? m(
                  msg(
                    "{count, plural, one {{count} reset credit banked · next expires in {expires}} other {{count} reset credits banked · next expires in {expires}}}",
                    { count, expires: expiresIn },
                  ),
                )
              : m(
                  msg(
                    "{count, plural, one {{count} reset credit banked} other {{count} reset credits banked}}",
                    { count },
                  ),
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

export function formatResetsIn(
  window: Parameters<typeof sharedFormatResetsIn>[0],
  now: number,
  style: "full" | "in" | "refill" = "full",
): string | null {
  const text = sharedFormatResetsIn(window, now);
  if (text === null) return null;
  if (text === "resets now") return m(msg("resets now"));
  if (text === "Resets momentarily") return m(msg("Resets momentarily"));
  const duration = localizeDuration(text.slice("resets in ".length));
  if (style === "in") {
    return m(msg("in {duration}", { duration, $context: "time until a usage window resets" }));
  }
  if (style === "refill") return m(msg("↻ {duration}", { duration }));
  return m(msg("resets in {duration}", { duration }));
}
