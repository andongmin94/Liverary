import { useGT, msg } from "gt-react";
import { m } from "../../i18n/messages";

import {
  type EnvironmentId,
  type ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";
import { useAtomValue } from "@effect/atom-react";
import { memo, useRef, useState, useSyncExternalStore } from "react";
import { InfoIcon, XIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "../ui/alert";
import { Button, InlineButton } from "../ui/button";
import { formatProviderDriverKindLabel } from "../../providerModels";
import { getProviderMessageDetail } from "../settings/providerStatus";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { RefreshIcon } from "../ui/refresh-icon";

function getIncompatibleVersion(status: ServerProvider) {
  const compatibility = status.compatibilityAdvisory;
  if (status.status === "error" && status.auth.status === "unauthenticated") return null;
  return compatibility?.status === "broken" ||
    (status.status === "ready" && compatibility?.status === "unsupported")
    ? compatibility
    : null;
}

export function getProviderStatusBannerKey(status: ServerProvider | null): string | null {
  if (!status || status.status === "disabled") return null;
  const incompatible = getIncompatibleVersion(status);
  if (incompatible) {
    return [
      status.instanceId,
      incompatible.status,
      status.version ?? "",
      incompatible.message ?? "",
    ].join("\u0000");
  }
  if (status.status === "ready") return null;
  // Antigravity validates credentials at session start; unknown restart auth is not failure.
  if (
    status.driver === "antigravity" &&
    status.installed &&
    status.status === "warning" &&
    status.auth.status === "unknown"
  ) {
    return null;
  }
  return [status.instanceId, status.status, status.auth.status, status.message ?? ""].join(
    "\u0000",
  );
}

export function shouldShowProviderStatusBanner(
  status: ServerProvider | null,
  isDismissed: boolean,
): boolean {
  return getProviderStatusBannerKey(status) !== null && !isDismissed;
}

// Built-in instance ids such as `codex` repeat across environments.
export function getProviderStatusDismissalKey(
  environmentId: string | undefined,
  status: ServerProvider | null,
): string | null {
  const bannerKey = getProviderStatusBannerKey(status);
  return bannerKey === null ? null : `${environmentId ?? ""}\u0000${bannerKey}`;
}

// A dismissal lasts the session, not one view, so opening another thread cannot bring it back.
const sessionDismissedProviderStatusBannerKeys = new Set<string>();
const dismissalListeners = new Set<() => void>();

export function dismissProviderStatusBannerForSession(bannerKey: string | null): void {
  if (bannerKey === null || sessionDismissedProviderStatusBannerKeys.has(bannerKey)) return;
  sessionDismissedProviderStatusBannerKeys.add(bannerKey);
  for (const listener of dismissalListeners) listener();
}

export function isProviderStatusBannerDismissedForSession(bannerKey: string | null): boolean {
  return bannerKey !== null && sessionDismissedProviderStatusBannerKeys.has(bannerKey);
}

function subscribeToDismissals(listener: () => void) {
  dismissalListeners.add(listener);
  return () => dismissalListeners.delete(listener);
}

export function useProviderStatusBannerDismissed(bannerKey: string | null): boolean {
  return useSyncExternalStore(subscribeToDismissals, () =>
    isProviderStatusBannerDismissedForSession(bannerKey),
  );
}

export function hasProviderSetup(status: ServerProvider): boolean {
  return (
    status.driver === "antigravity" ||
    status.setup?.canAuthenticate === true ||
    status.setup?.canInstall === true
  );
}

export function getProviderStatusMessage(status: ServerProvider): string {
  if (
    status.auth.status !== "unauthenticated" &&
    status.compatibilityAdvisory?.status === "broken" &&
    status.compatibilityAdvisory.message
  ) {
    return status.compatibilityAdvisory.message;
  }
  const detail = getProviderMessageDetail(status);
  if (detail) return detail;
  const providerName = status.displayName?.trim() || formatProviderDriverKindLabel(status.driver);
  if (!status.installed && hasProviderSetup(status)) {
    return m(
      msg("Open provider setup to install {name} on this environment.", {
        name: String(formatProviderDriverKindLabel(status.driver)),
      }),
    );
  }
  if (status.auth.status === "unauthenticated") {
    if (hasProviderSetup(status)) {
      return status.driver === "antigravity"
        ? m(msg("Open provider setup to sign in with Google."))
        : m(msg("Open provider setup to sign in."));
    }
    return m(msg("Sign in via the CLI to authenticate again."));
  }
  return status.status === "ready"
    ? m(msg("No models are available for this provider."))
    : status.status === "error"
      ? m(msg("{name} provider is unavailable.", { name: String(providerName) }))
      : m(msg("{name} provider has limited availability.", { name: String(providerName) }));
}

export const ProviderStatusBanner = memo(function ProviderStatusBanner({
  environmentId,
  onDismiss,
  onOpenProviderSetup,
  status,
}: {
  environmentId: EnvironmentId;
  onDismiss: () => void;
  onOpenProviderSetup?: (instanceId: ProviderInstanceId) => void;
  status: ServerProvider | null;
}) {
  const gt = useGT();
  const canRefresh = useAtomValue(serverEnvironment.refreshProviders.permissionAtom(environmentId));
  const refreshProviders = useAtomCommand(serverEnvironment.refreshProviders, {
    label: gt("Refresh provider status"),
  });
  const refreshingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    if (!status || !canRefresh || refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    await refreshProviders({
      environmentId,
      input: { instanceId: status.instanceId, refreshModels: true },
    });
    refreshingRef.current = false;
    setIsRefreshing(false);
  };

  if (!status || getProviderStatusBannerKey(status) === null) {
    return null;
  }

  const providerName = status.displayName?.trim() || formatProviderDriverKindLabel(status.driver);
  const isUnauthenticated = status.status === "error" && status.auth.status === "unauthenticated";
  const incompatible = getIncompatibleVersion(status);
  const title = isUnauthenticated
    ? gt("{name} is unauthenticated", { name: String(providerName) })
    : incompatible
      ? `${providerName} ${status.version ?? ""}: ${incompatible.status === "broken" ? m(msg("Known broken version")) : m(msg("Unsupported version", { $context: "ProviderStatusBanner.tsx" }))}`
      : gt("{name} provider status", { name: String(providerName) });
  const message = incompatible?.message ?? getProviderStatusMessage(status);
  const isWarning =
    incompatible?.status !== "broken" && (status.status === "warning" || incompatible !== null);

  return (
    <div className="pointer-events-auto mx-auto w-fit max-w-[calc(100%-2rem)] pt-3">
      <Alert
        variant={isWarning ? "warning" : "error"}
        role={incompatible && incompatible.status !== "broken" ? "status" : "alert"}
        surface="glass"
        controlAlignment="first-line"
      >
        <InfoIcon />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-2">
            <Tooltip>
              <TooltipTrigger render={<div className="line-clamp-3" />}>{message}</TooltipTrigger>
              <TooltipPopup side="top" className="whitespace-pre-wrap">
                {message}
              </TooltipPopup>
            </Tooltip>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {onOpenProviderSetup && hasProviderSetup(status) ? (
                <InlineButton onClick={() => onOpenProviderSetup(status.instanceId)}>
                  {gt("Open provider setup")}
                </InlineButton>
              ) : null}
              <Button
                aria-label={gt("Refresh {provider} provider status", {
                  provider: String(providerName),
                })}
                disabled={!canRefresh || isRefreshing}
                onClick={() => void refresh()}
                size="xs"
                variant="outline"
              >
                <RefreshIcon />
                {isRefreshing ? gt("Refreshing...") : gt("Refresh")}
              </Button>
            </div>
          </div>
        </AlertDescription>
        <AlertAction>
          <Button
            aria-label={
              status.status === "error"
                ? gt("Dismiss {provider} provider error", { provider: providerName })
                : status.status === "warning"
                  ? gt("Dismiss {provider} provider warning", { provider: providerName })
                  : status.status === "ready"
                    ? gt("Dismiss {provider} provider ready", { provider: providerName })
                    : gt("Dismiss {provider} provider disabled", { provider: providerName })
            }
            onClick={onDismiss}
            size="icon-xs"
            variant="ghost-muted"
          >
            <XIcon />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
});
