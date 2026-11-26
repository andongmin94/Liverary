import React from "react";
import ReactDOM from "react-dom/client";

import "@fontsource-variable/inter";
import "./index.css";

import { trackKeyboardLayout } from "./keyboardLayout";
import { startAppServices } from "./appInit";
import { AppRoot } from "./AppRoot";
import { I18nProvider } from "./i18n/I18nProvider";
import { initializeI18n } from "./i18n/initializeI18n";
import { chunkLoadState } from "./lib/chunkReloadGuard";

const stopTrackingKeyboardLayout = trackKeyboardLayout();
import.meta.hot?.dispose(stopTrackingKeyboardLayout);

const router = startAppServices();

const app = (
  <I18nProvider>
    <AppRoot router={router} />
  </I18nProvider>
);

export const startup = initializeI18n()
  .then(() => router.load())
  .then(() => {
    // Route chunk failures resolve router.load() and surface later through the error boundary.
    if (chunkLoadState.reloadScheduled) return;
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>{app}</React.StrictMode>,
    );
  })
  .catch((error: unknown) => {
    if (chunkLoadState.reloadScheduled) return;
    throw error;
  });
