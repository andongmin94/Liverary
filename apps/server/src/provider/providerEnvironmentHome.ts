import type { ProviderInstanceConfig } from "@t3tools/contracts";

const accountHomeVariables = new Map([
  ["fx", "FX_HOME"],
  ["grok", "GROK_HOME"],
  ["kiro", "KIRO_HOME"],
  ["pi", "PI_CODING_AGENT_DIR"],
  ["opencode", "XDG_DATA_HOME"],
]);

export function withNewProviderEnvironmentHome(
  instance: ProviderInstanceConfig,
  directory: string,
  platform: NodeJS.Platform,
) {
  const homeVariable = accountHomeVariables.get(instance.driver);
  if (!homeVariable) return instance;
  const environment = instance.environment ?? [];
  const variableNames = new Set(
    environment.map(({ name }) => (platform === "win32" ? name.toUpperCase() : name)),
  );
  if (variableNames.has(homeVariable)) return instance;
  if (instance.driver === "opencode") {
    const config = instance.config;
    if (
      (typeof config === "object" &&
        config !== null &&
        "serverUrl" in config &&
        typeof config.serverUrl === "string" &&
        config.serverUrl.trim() !== "") ||
      variableNames.has("OPENCODE_DB")
    )
      return instance;
  }
  return {
    ...instance,
    environment: [...environment, { name: homeVariable, value: directory, sensitive: false }],
  };
}
