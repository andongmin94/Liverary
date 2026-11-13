const CONNECT_AUTH_STATE_PARAM = "state";
const CONNECT_AUTH_CHALLENGE_PARAM = "challenge";
const CONNECT_AUTH_PORT_PARAM = "port";
const CONNECT_LOOPBACK_CALLBACK_PATH = "/callback";

const CONNECT_AUTHORIZE_PATH = "/connect";

export const DEFAULT_HOSTED_APP_URL = "https://app.t3.codes";

export const CONNECT_OAUTH_SCOPES = ["openid", "profile", "email", "offline_access"] as const;

/** Route through /connect because Clerk's signed-out redirect can lose OAuth query parameters. */
export function buildConnectAuthorizeRequestUrl(input: {
  readonly hostedAppUrl: string;
  readonly state: string;
  readonly challenge: string;
  readonly loopbackPort: number;
}): string {
  const url = new URL(CONNECT_AUTHORIZE_PATH, input.hostedAppUrl);
  url.hash = new URLSearchParams([
    [CONNECT_AUTH_STATE_PARAM, input.state],
    [CONNECT_AUTH_CHALLENGE_PARAM, input.challenge],
    [CONNECT_AUTH_PORT_PARAM, String(input.loopbackPort)],
  ]).toString();
  return url.toString();
}

/** Must match the loopback redirect URI registered on the Clerk CLI OAuth app. */
export function connectLoopbackRedirectUri(port: number): string {
  return `http://127.0.0.1:${port}${CONNECT_LOOPBACK_CALLBACK_PATH}`;
}
