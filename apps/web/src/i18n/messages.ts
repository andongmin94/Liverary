import { decodeOptions, gtFallback } from "gt-i18n";
import { hashMessage } from "gt-i18n/internal";

import korean from "./translations/ko.json" with { type: "json" };

const catalog: Readonly<Record<string, unknown>> = korean;

/** Resolve GT messages synchronously, including module constants before the first render. */
export function m(message: string, variables: Readonly<Record<string, string>> = {}): string {
  const decoded = decodeOptions(message);
  const source = typeof decoded?.$_source === "string" ? decoded.$_source : message;
  const options = typeof decoded?.$_source === "string" ? decoded : variables;
  const target = catalog[hashMessage(source, { ...options, $format: "ICU" })];
  return typeof target === "string"
    ? gtFallback(target, { ...options, $locale: "ko", $_fallback: source })
    : gtFallback(source, { ...options, $locale: "en" });
}
