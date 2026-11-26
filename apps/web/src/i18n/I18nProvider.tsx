import { GTProvider } from "gt-react";
import type { ComponentProps, ReactNode } from "react";

import korean from "./translations/ko.json";

type Translations = NonNullable<ComponentProps<typeof GTProvider>["translations"]>;

// JSON imports widen literal JSX branch tags ("b" | "p") to string.
const translations: Translations = { ko: korean as Translations[string] };

export function I18nProvider({ children }: { readonly children: ReactNode }) {
  return (
    <GTProvider locale="ko" translations={translations}>
      {children}
    </GTProvider>
  );
}
