import { localizeSettingsText } from "./settingsCopy";
import { msg } from "gt-react";
import { m } from "../../i18n/messages";

import type {
  ServerProvider,
  ServerProviderVersionAdvisory,
  ServerProviderCompatibilityAdvisory,
} from "@t3tools/contracts";

export const PROVIDER_STATUS_STYLES = {
  disabled: {
    dot: "bg-muted-foreground/50",
  },
  error: {
    dot: "bg-destructive",
  },
  neutral: {
    dot: "bg-muted-foreground",
  },
  ready: {
    dot: "bg-success",
  },
  warning: {
    dot: "bg-warning",
  },
} as const;

export type ProviderStatusKey = keyof typeof PROVIDER_STATUS_STYLES;

// Antigravity's local health check verifies installation, not Google sign-in.
// API-key and Agent Platform warnings still need attention.
function isAntigravitySignInUnchecked(provider: ServerProvider): boolean {
  return (
    provider.driver === "antigravity" &&
    provider.installed &&
    provider.status === "warning" &&
    provider.auth.status === "unknown" &&
    (provider.auth.type === undefined ||
      provider.auth.type === "oauth-personal" ||
      provider.auth.type === "oauth-business")
  );
}

export function getProviderStatusKey(provider: ServerProvider | undefined): ProviderStatusKey {
  if (provider && !provider.enabled) return "disabled";
  if (provider && isAntigravitySignInUnchecked(provider)) return "neutral";
  return provider?.status ?? "warning";
}

export function getProviderMessageDetail(provider: ServerProvider) {
  return provider.messageSource === "app" && provider.message
    ? localizeSettingsText(provider.message)
    : provider.message;
}

export function getProviderSummary(provider: ServerProvider | undefined) {
  if (!provider) {
    return {
      headline: m(msg("Checking provider status")),
      detail: m(msg("Waiting for the server to report installation and authentication details.")),
    };
  }
  const message = getProviderMessageDetail(provider);
  if (!provider.enabled || provider.status === "disabled") {
    return {
      headline: m(msg("Disabled", { $context: "settingsText: Disabled" })),
      detail:
        message ?? m(msg("This provider is installed but disabled for new sessions in T3 Code.")),
    };
  }
  if (!provider.installed) {
    return {
      headline: m(msg("Not found")),
      detail: message ?? m(msg("CLI not detected on PATH.")),
    };
  }
  if (provider.auth.status === "unauthenticated") {
    const authLabel = provider.auth.label ?? provider.auth.type;
    return {
      headline: authLabel
        ? m(msg("Not authenticated · {label}", { label: String(authLabel) }))
        : m(msg("Not authenticated")),
      detail: message ?? null,
    };
  }
  if (isAntigravitySignInUnchecked(provider)) {
    return {
      headline: m(msg("Installed · Sign-in not checked")),
      detail: message ?? null,
    };
  }
  if (provider.status === "warning") {
    return {
      headline: m(msg("Needs attention")),
      detail:
        message ?? m(msg("The provider is installed, but the server could not fully verify it.")),
    };
  }
  if (provider.status === "error") {
    return {
      headline: m(msg("Unavailable")),
      detail: message ?? m(msg("The provider failed its startup checks.")),
    };
  }
  if (provider.auth.status === "authenticated") {
    const authLabel = provider.auth.label ?? provider.auth.type;
    return {
      headline: authLabel
        ? m(msg("Authenticated · {label}", { label: String(authLabel) }))
        : m(msg("Authenticated")),
      detail: message ?? null,
    };
  }
  return {
    headline: m(msg("Available")),
    detail: message ?? null,
  };
}

export function getProviderVersionLabel(version: string | null | undefined) {
  if (!version) return null;
  const antigravity = /^agy_acp_server_(\d{4})(\d{2})(\d{2})_\d+(?:_(\w+))?$/.exec(version);
  if (antigravity) {
    const [, year, month, day, candidate] = antigravity;
    return `${year}-${month}-${day}${candidate ? ` ${candidate}` : ""}`;
  }
  return /^\d/.test(version) ? `v${version}` : version;
}

const COMPATIBILITY_TITLES = {
  graceful: m(msg("Limited support")),
  unsupported: m(msg("Unsupported version")),
  broken: m(msg("Known broken version")),
} as const;

export function getProviderVersionAdvisoryPresentation(
  advisory: ServerProviderVersionAdvisory | undefined,
  compatibility?: ServerProviderCompatibilityAdvisory | undefined,
  showCompatibility = true,
): {
  readonly title: string;
  readonly detail: string;
  readonly updateCommand: string | null;
  readonly emphasis: "normal" | "strong";
  readonly targetVersion: string | null;
} | null {
  const latestIsIncompatible =
    compatibility?.latestVersionStatus === "broken" ||
    compatibility?.latestVersionStatus === "unsupported";
  if (
    showCompatibility &&
    compatibility &&
    (compatibility.status === "graceful" ||
      compatibility.status === "unsupported" ||
      compatibility.status === "broken")
  ) {
    const targetVersion = compatibility.recommendedVersion;
    const recommendation = getProviderVersionLabel(targetVersion) ?? compatibility.recommendedRange;
    // Latest package versions cannot be updated into recommendations requiring another package.
    const isAlreadyLatest = advisory?.status === "current";
    return {
      title: COMPATIBILITY_TITLES[compatibility.status],
      detail:
        compatibility.message ??
        (recommendation
          ? m(msg("Use {version} for full support.", { version: String(recommendation) }))
          : m(msg("Update for full support."))),
      updateCommand:
        targetVersion || latestIsIncompatible || isAlreadyLatest
          ? null
          : (advisory?.updateCommand ?? null),
      emphasis: compatibility.status === "graceful" ? "normal" : "strong",
      targetVersion,
    };
  }
  if (
    !advisory ||
    advisory.status === "current" ||
    advisory.status === "unknown" ||
    latestIsIncompatible
  ) {
    return null;
  }

  const label = m(msg("Update available"));
  const version = advisory.latestVersion;
  const versionLabel = getProviderVersionLabel(version);

  return {
    title: label,
    detail:
      advisory.message ??
      (versionLabel
        ? m(msg("Update available: install {version}.", { version: versionLabel }))
        : m(msg("Update available: install the latest provider version."))),
    updateCommand: advisory.updateCommand,
    emphasis: "normal" as const,
    targetVersion: null,
  };
}
