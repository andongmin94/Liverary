import { assert, it } from "@effect/vitest";
import { ProviderDriverKind, type ProviderInstanceConfig } from "@t3tools/contracts";

import { withNewProviderEnvironmentHome } from "./providerEnvironmentHome.ts";

it("applies the local provider's account home without replacing explicit settings", () => {
  for (const [driverName, homeVariable] of [
    ["fx", "FX_HOME"],
    ["grok", "GROK_HOME"],
    ["kiro", "KIRO_HOME"],
    ["pi", "PI_CODING_AGENT_DIR"],
    ["opencode", "XDG_DATA_HOME"],
  ] as const) {
    const driver = ProviderDriverKind.make(driverName);
    const unrelated = { name: "LANG", value: "ko_KR.UTF-8", sensitive: false };
    const instance = { driver, environment: [unrelated] };
    const directory = `/liverary/userdata/providers/${driver}/work`;
    assert.deepEqual(withNewProviderEnvironmentHome(instance, directory, "linux").environment, [
      unrelated,
      { name: homeVariable, value: directory, sensitive: false },
    ]);
    const explicit = { driver, environment: [{ name: homeVariable, value: "", sensitive: true }] };
    assert.strictEqual(withNewProviderEnvironmentHome(explicit, directory, "linux"), explicit);
    const mixedCase = {
      driver,
      environment: [{ name: homeVariable.toLowerCase(), value: "D:/work", sensitive: false }],
    };
    assert.strictEqual(withNewProviderEnvironmentHome(mixedCase, directory, "win32"), mixedCase);
  }
  const opencode = ProviderDriverKind.make("opencode");
  const instances: ReadonlyArray<ProviderInstanceConfig> = [
    { driver: opencode, config: { serverUrl: "https://opencode.example" } },
    {
      driver: opencode,
      environment: [{ name: "OPENCODE_DB", value: "work.db", sensitive: false }],
    },
    { driver: ProviderDriverKind.make("acpRegistry") },
  ];
  for (const instance of instances) {
    assert.strictEqual(
      withNewProviderEnvironmentHome(instance, "/liverary/providers/work", "linux"),
      instance,
    );
  }
});
