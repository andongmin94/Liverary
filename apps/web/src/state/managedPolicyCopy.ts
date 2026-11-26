import { msg } from "gt-react";
import { m } from "../i18n/messages";

export const browserCookieImportPolicyUnreadable = (path: string) =>
  m(
    msg("Cannot import browser cookies because the managed policy at {path} could not be read.", {
      path: String(path),
    }),
  );
export const browserCookieImportDenied = (organization: string) =>
  m(msg("{organization}'s policy does not allow importing browser cookies.", { organization }));
