import { describe, expect, it } from "vite-plus/test";
import { providerAuthReturnUrl } from "./providerAuthReturnUrl.ts";

describe("provider auth return destinations", () => {
  it("returns to desktop Welcome and the selected settings instance", () => {
    expect(providerAuthReturnUrl("liverary://app/welcome?code=secret#agents:machine-id")).toBe(
      "liverary://app/welcome#agents:machine-id",
    );
    expect(
      providerAuthReturnUrl("liverary://app/settings/providers?instanceId=work&code=secret"),
    ).toBe("liverary://app/settings/providers?instanceId=work");
  });
  it.each([
    "liverary://attacker/welcome",
    "liverary://app/welcome/../evil",
    "liverary-dev://app/welcome",
    "t3custom://app/welcome",
    "t3custom-dev://app/settings/providers?instanceId=work",
    "https://attacker.example/welcome",
  ])("rejects %s", (url) => expect(providerAuthReturnUrl(url)).toBeUndefined());
});
