import { msg } from "gt-react";
import { m } from "../../i18n/messages";
const resetCreditProviderText: Readonly<Record<string, string>> = {
  "5-hour reset": m(msg("5-hour reset")),
  "Weekly reset": m(msg("Weekly reset")),
  "Fable reset": m(msg("Fable reset")),
  "Full reset": m(msg("Full reset")),
  "Refills your 5-hour limit.": m(msg("Refills your 5-hour limit.")),
  "Refills your weekly limit.": m(msg("Refills your weekly limit.")),
  "Refills your 5-hour and weekly limits.": m(msg("Refills your 5-hour and weekly limits.")),
  "Refills your Fable allowance and gives back what Fable used on your weekly limit. It doesn't reset your whole week.":
    m(
      msg(
        "Refills your Fable allowance and gives back what Fable used on your weekly limit. It doesn't reset your whole week.",
      ),
    ),
};
export const localizeResetCreditText = (text: string) => resetCreditProviderText[text] ?? text;
