import {
  isProviderAvailable,
  managedCapabilityDenial,
  type ManagedPolicySummary,
  type ProviderInstanceConfig,
  ProviderDriverKind,
  resolveProjectProviderInstanceEnabled,
  type ServerProvider,
  type ServerSettings,
} from "@t3tools/contracts";

import { getOnboardingProviderState } from "./providerReadiness.logic";

type ComputerSettings = Pick<ServerSettings, "providerInstances" | "projectSettingsOverrides">;

// Ready agents first, then ones that need a sign-in or a look. Never ranked by vendor.
const FOUND_ORDER = { ready: 0, signIn: 1, attention: 2 } as const;
type FoundState = keyof typeof FOUND_ORDER;

const isFoundState = (state: string): state is FoundState => state in FOUND_ORDER;

const ACP_REGISTRY_DRIVER = ProviderDriverKind.make("acpRegistry");

/**
 * An agent's state for new threads on this computer. The server also lists agents that only some
 * projects turn on, lists an agent it could not load as off, which Turn on cannot fix, and can pass
 * a CLI whose version it knows is broken.
 */
export function welcomeAgentState(
  provider: ServerProvider,
  settings: ComputerSettings | null | undefined,
) {
  if (!isProviderAvailable(provider)) return "attention";
  if (settings && !resolveProjectProviderInstanceEnabled(settings, null, provider.instanceId)) {
    return "disabled";
  }
  const state = getOnboardingProviderState(provider);
  if (state === "ready" && provider.compatibilityAdvisory?.status === "broken") return "attention";
  // An ACP agent that is not prepared reports the same fields as one still being checked.
  return state === "checking" && provider.driver === ACP_REGISTRY_DRIVER ? "attention" : state;
}

/**
 * Splits a computer's allowed providers into agents already on it and agents the user can add.
 * Order inside each group is by state, then by the name the user sees. Agents still being
 * checked are listed with the ones to add, so a slow check never drops an agent.
 */
export function groupWelcomeAgents(
  providers: ReadonlyArray<ServerProvider> | null | undefined,
  settings: ComputerSettings | null | undefined,
  nameOf: (provider: ServerProvider) => string,
  isAllowed: (provider: ServerProvider) => boolean,
) {
  const found: Array<{ readonly provider: ServerProvider; readonly state: FoundState }> = [];
  const available: ServerProvider[] = [];
  let checking = providers == null;
  let readyCount = 0;
  for (const provider of providers ?? []) {
    if (!isAllowed(provider)) continue;
    const state = welcomeAgentState(provider, settings);
    if (state === "ready") readyCount += 1;
    if (state === "checking") checking = true;
    if (isFoundState(state)) found.push({ provider, state });
    else available.push(provider);
  }
  const byName = (a: ServerProvider, b: ServerProvider) => nameOf(a).localeCompare(nameOf(b));
  found.sort(
    (a, b) => FOUND_ORDER[a.state] - FOUND_ORDER[b.state] || byName(a.provider, b.provider),
  );
  available.sort(byName);
  return { checking, readyCount, found: found.map((entry) => entry.provider), available };
}

/** Older settings can also keep `enabled: false` inside `config`, which still turns the agent off. */
export function turnedOnInstance(instance: ProviderInstanceConfig): ProviderInstanceConfig {
  const { config } = instance;
  const configOff =
    typeof config === "object" &&
    config !== null &&
    "enabled" in config &&
    config.enabled === false;
  return {
    ...instance,
    enabled: true,
    ...(configOff ? { config: { ...config, enabled: true } } : {}),
  };
}

/** A CLI the server knows is too old or otherwise broken for T3 Code; Settings updates it. */
export function isBrokenVersion(provider: ServerProvider) {
  return provider.installed && provider.compatibilityAdvisory?.status === "broken";
}

/**
 * The phone joins by signing in to T3 Connect, which shares the primary computer. Another
 * computer, a build without T3 Connect, or a policy that turns it off gets no Phone section.
 */
export function welcomeOffersPhone(input: {
  readonly isPrimary: boolean;
  readonly cloud: boolean;
  // Relay read and write access, which sharing this computer through T3 Connect needs.
  readonly canShare: boolean;
  readonly policy: ManagedPolicySummary | undefined;
}) {
  return (
    input.isPrimary &&
    input.cloud &&
    input.canShare &&
    managedCapabilityDenial(input.policy, "remoteClients") === undefined &&
    managedCapabilityDenial(input.policy, "connect") === undefined
  );
}
