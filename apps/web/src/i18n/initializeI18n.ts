import { initializeGTSPA } from "gt-react";

import korean from "./translations/ko.json";

/** All translations ship with the app; no account, remote catalog, or language setting. */
export function initializeI18n(): Promise<void> {
  return initializeGTSPA({
    defaultLocale: "en",
    locales: ["ko"],
    locale: "ko",
    loadTranslations: async () => korean,
    cacheExpiryTime: null,
  });
}
