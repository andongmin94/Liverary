import { msg } from "gt-react";
import { m } from "../../i18n/messages";

export const PREVIEW_RECENT_URL_LIMIT = 10;

export const PREVIEW_ERROR_CODE_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  ERR_NAME_NOT_RESOLVED: m(msg("DNS address could not be found")),
  ERR_NAME_RESOLUTION_FAILED: m(msg("DNS address could not be found")),
  ERR_CONNECTION_REFUSED: m(msg("Connection refused")),
  ERR_CONNECTION_RESET: m(msg("Connection was reset")),
  ERR_CONNECTION_CLOSED: m(msg("Connection was closed")),
  ERR_CONNECTION_TIMED_OUT: m(msg("Connection timed out")),
  ERR_INTERNET_DISCONNECTED: m(msg("No internet connection")),
  ERR_TIMED_OUT: m(msg("Connection timed out")),
  ERR_CERT_AUTHORITY_INVALID: m(msg("Certificate authority is not trusted")),
  ERR_CERT_COMMON_NAME_INVALID: m(msg("Certificate hostname mismatch")),
  ERR_CERT_DATE_INVALID: m(msg("Certificate is expired or not yet valid")),
  ERR_TOO_MANY_REDIRECTS: m(msg("Too many redirects")),
});
