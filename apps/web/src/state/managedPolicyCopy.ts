import { msg } from "gt-react";
import { m } from "../i18n/messages";
import {
  managedCapabilityDenial as capabilityDenial,
  managedRuntimeModeDenial as runtimeModeDenial,
  managedUpdatesDenial as updatesDenial,
  type ManagedPolicySummary,
  type RuntimeMode,
} from "@t3tools/contracts";

const runtimeModes: Record<RuntimeMode, string> = {
  "approval-required": m(msg("Approval needed")),
  "auto-accept-edits": m(msg("Auto-accept edits")),
  auto: m(msg("Auto")),
  "full-access": m(msg("Full access", { $context: "managedPolicyCopy.ts" })),
};
const capabilities = {
  remoteClients: m(msg("Remote Clients")),
  webhookTasks: m(msg("Webhook Tasks")),
  browserCookieImport: m(msg("Browser Cookie Import")),
};
const managedUpdatesMessage = (organization: string) =>
  m(msg("{organization} manages Liverary updates.", { organization: String(organization) }));
export const managedRuntimeModeCeilingMessage = (organization: string, ceiling: RuntimeMode) =>
  m(
    msg("{organization} limits conversation permissions to ''{value1}'' or below.", {
      organization: String(organization),
      value1: String(runtimeModes[ceiling]),
    }),
  );
export function managedRuntimeModeDenial(
  summary: ManagedPolicySummary | undefined,
  mode: RuntimeMode,
) {
  const denial = runtimeModeDenial(summary, mode);
  return denial === undefined || summary?.limits?.maxRuntimeMode === undefined
    ? denial
    : managedRuntimeModeCeilingMessage(summary.organization, summary.limits.maxRuntimeMode);
}
export function managedCapabilityDenial(
  summary: ManagedPolicySummary | undefined,
  capability: keyof typeof capabilities,
) {
  const denial = capabilityDenial(summary, capability);
  return denial === undefined || summary === undefined
    ? denial
    : m(
        msg("{value0} policy does not allow ''{value1}''.", {
          value0: String(summary.organization),
          value1: String(capabilities[capability]),
        }),
      );
}
export function managedUpdatesDenial(summary: ManagedPolicySummary | undefined) {
  const denial = updatesDenial(summary);
  return denial === undefined || summary === undefined
    ? denial
    : managedUpdatesMessage(summary.organization);
}

export const managedBy = (organization: string) =>
  m(msg("Managed by {organization}.", { organization: String(organization) }));

export const browserCookieImportPolicyUnreadable = (path: string) =>
  m(
    msg("Cannot import browser cookies because the managed policy at {path} could not be read.", {
      path: String(path),
    }),
  );
export const browserCookieImportDenied = (organization: string) =>
  m(
    msg("{organization} policy does not allow browser cookie imports.", {
      organization: String(organization),
    }),
  );
