import { msg } from "gt-react";
import { m } from "../i18n/messages";
import {
  managedCapabilityDenial as capabilityDenial,
  managedRuntimeModeDenial as runtimeModeDenial,
  managedUpdatesDenial as updatesDenial,
  type ManagedPolicySummary,
  type RuntimeMode,
} from "@t3tools/contracts";

const capabilityMessages = {
  remoteClients: msg("{organization}'s policy does not allow connecting from other devices."),
  webhookTasks: msg("{organization}'s policy does not allow webhook tasks."),
  browserCookieImport: msg("{organization}'s policy does not allow importing browser cookies."),
} as const;
const managedUpdatesMessage = (organization: string) =>
  m(msg("{organization} manages Liverary updates.", { organization: String(organization) }));
export function managedRuntimeModeCeilingMessage(organization: string, ceiling: RuntimeMode) {
  switch (ceiling) {
    case "approval-required":
      return m(msg("{organization} limits threads to Supervised.", { organization }));
    case "auto-accept-edits":
      return m(msg("{organization} limits threads to Auto-accept edits.", { organization }));
    case "auto":
      return m(msg("{organization} limits threads to Auto.", { organization }));
    case "full-access":
      return m(msg("{organization} limits threads to Full access.", { organization }));
  }
}
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
  capability: keyof typeof capabilityMessages,
) {
  const denial = capabilityDenial(summary, capability);
  return denial === undefined || summary === undefined
    ? denial
    : m(capabilityMessages[capability], { organization: summary.organization });
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
  m(msg("{organization}'s policy does not allow importing browser cookies.", { organization }));
