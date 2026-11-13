import { describe, expect, it } from "vite-plus/test";

import { buildConnectAuthorizeRequestUrl, connectLoopbackRedirectUri } from "./connectAuth.ts";

describe("connectAuth", () => {
  it("puts state, challenge, and loopback port in the authorize URL fragment", () => {
    const url = buildConnectAuthorizeRequestUrl({
      hostedAppUrl: "https://app.t3.codes",
      state: "q7mK9xV2pL4nR8sT6wYzAQ",
      challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      loopbackPort: 34338,
    });
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://app.t3.codes");
    expect(parsed.pathname).toBe("/connect");
    expect(parsed.search).toBe("");
    expect(Object.fromEntries(new URLSearchParams(parsed.hash.slice(1)))).toEqual({
      state: "q7mK9xV2pL4nR8sT6wYzAQ",
      challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      port: "34338",
    });
    expect(connectLoopbackRedirectUri(34338)).toBe("http://127.0.0.1:34338/callback");
  });
});
