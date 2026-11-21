import { describe, expect, it } from "vite-plus/test";

import { resolveDesktopPairingUrl } from "./pairingUrls";

describe("settings pairing URL helpers", () => {
  it.each(["http://192.168.1.44:3773", "https://host.tailnet.example.ts.net:3773"])(
    "pairs directly with %s",
    (endpoint) => {
      expect(resolveDesktopPairingUrl(endpoint, "PAIRCODE")).toBe(
        `${endpoint}/pair#token=PAIRCODE`,
      );
    },
  );
});
