import { workspaceText } from "~/locales/ko/workspace";
export const PREVIEW_RECENT_URL_LIMIT = 10;

export const PREVIEW_ERROR_CODE_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  ERR_NAME_NOT_RESOLVED: workspaceText["DNS address could not be found"],
  ERR_NAME_RESOLUTION_FAILED: workspaceText["DNS address could not be found"],
  ERR_CONNECTION_REFUSED: workspaceText["Connection refused"],
  ERR_CONNECTION_RESET: workspaceText["Connection was reset"],
  ERR_CONNECTION_CLOSED: workspaceText["Connection was closed"],
  ERR_CONNECTION_TIMED_OUT: workspaceText["Connection timed out"],
  ERR_INTERNET_DISCONNECTED: workspaceText["No internet connection"],
  ERR_TIMED_OUT: workspaceText["Connection timed out"],
  ERR_CERT_AUTHORITY_INVALID: workspaceText["Certificate authority is not trusted"],
  ERR_CERT_COMMON_NAME_INVALID: workspaceText["Certificate hostname mismatch"],
  ERR_CERT_DATE_INVALID: workspaceText["Certificate is expired or not yet valid"],
  ERR_TOO_MANY_REDIRECTS: workspaceText["Too many redirects"],
});
