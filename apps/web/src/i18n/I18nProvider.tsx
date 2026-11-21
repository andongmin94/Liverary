import { GTProvider } from "gt-react";
import type { ReactNode } from "react";

import korean from "./translations/ko.json";

const translations = { ko: korean };

export function I18nProvider({ children }: { readonly children: ReactNode }) {
  return (
    <GTProvider locale="ko" translations={translations}>
      {children}
    </GTProvider>
  );
}
