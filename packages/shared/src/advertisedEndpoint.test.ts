import { describe, expect, it } from "vite-plus/test";

import { createAdvertisedEndpoint, normalizeHttpBaseUrl } from "./advertisedEndpoint.ts";

describe("normalizeHttpBaseUrl", () => {
  it("rejects non-http(s) schemes", () => {
    expect(() => normalizeHttpBaseUrl("ftp://example.com")).toThrow(/HTTP or HTTPS/);
  });
});

describe("createAdvertisedEndpoint", () => {
  it("derives the websocket base url from the http base url", () => {
    const endpoint = createAdvertisedEndpoint({
      id: "e1",
      label: "Local",
      provider: { id: "desktop-core", label: "Desktop", kind: "core", isAddon: false },
      reachability: "loopback",
      source: "desktop-core",
      httpBaseUrl: "http://192.168.1.10:8317",
    });
    expect(endpoint.wsBaseUrl).toBe("ws://192.168.1.10:8317/");
  });
});
