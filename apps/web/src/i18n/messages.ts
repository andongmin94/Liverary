import { decodeOptions, gtFallback } from "gt-i18n";
import { hashMessage } from "gt-i18n/internal";
import type { useMessages } from "gt-react";

import korean from "./translations/ko.json" with { type: "json" };

export type MessageResolver = ReturnType<typeof useMessages>;

const catalog: Readonly<Record<string, unknown>> = korean;

function resolve(message: string, variables: Parameters<MessageResolver>[1] = {}): string {
  const decoded = decodeOptions(message);
  const source = typeof decoded?.$_source === "string" ? decoded.$_source : message;
  const options = typeof decoded?.$_source === "string" ? decoded : variables;
  const target = catalog[hashMessage(source, { ...options, $format: "ICU" })];
  return typeof target === "string"
    ? gtFallback(target, { ...options, $locale: "ko", $_fallback: source })
    : gtFallback(source, { ...options, $locale: "en" });
}

/** Resolve GT messages synchronously, including module constants before the first render. */
export const m = ((message, variables) =>
  typeof message === "string" ? resolve(message, variables) : message) as MessageResolver;
