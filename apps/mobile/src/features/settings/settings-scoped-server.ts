import {
  isManagedSettingPath,
  isNullableProjectSettingsOverride,
  PROJECT_SCOPED_SERVER_SETTING_KEYS,
  type EnvironmentId,
  type ProjectId,
  type ProjectSettingsOverrides,
  type ProjectScopedServerSettingKey,
  type ServerSettings,
  type ServerSettingsPatch,
} from "@t3tools/contracts";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";

import type { SettingsTarget } from "./settings-environment-filter";

export interface ScopedMobileSettingsTarget {
  readonly environment: SettingsTarget;
  readonly projectId: ProjectId | null;
  readonly settings: ServerSettings;
  readonly sources: ReturnType<typeof resolveProjectSettings>["sources"];
}

/**
 * "Managed by <organization>." when any target's policy locks `path`: the server refuses the
 * whole write then, so the control is managed for the selection.
 */
export function managedSettingReason(
  targets: readonly ScopedMobileSettingsTarget[],
  ...paths: readonly string[]
): string | undefined {
  const policy = targets
    .map((target) => target.environment.serverConfig.managedPolicy)
    .find((candidate) => paths.some((path) => isManagedSettingPath(candidate, path)));
  return policy === undefined ? undefined : `Managed by ${policy.organization}.`;
}

export function resolveMobileSettingsTargets(
  environments: readonly SettingsTarget[],
  members: readonly { readonly environmentId: EnvironmentId; readonly id: ProjectId }[] | null,
): readonly ScopedMobileSettingsTarget[] {
  if (members === null) {
    return environments.map((environment) => ({
      environment,
      projectId: null,
      ...resolveProjectSettings(environment.serverConfig.settings, null),
    }));
  }
  const byId = new Map(environments.map((environment) => [environment.environmentId, environment]));
  return members.flatMap((member) => {
    const environment = byId.get(member.environmentId);
    if (!environment) return [];
    return [
      {
        environment,
        projectId: member.id,
        ...resolveProjectSettings(environment.serverConfig.settings, member.id),
      },
    ];
  });
}

export function planMobileScopedSettingsPatch(
  targets: readonly ScopedMobileSettingsTarget[],
  projectSelected: boolean,
  patch: ServerSettingsPatch,
) {
  if (!projectSelected) {
    return targets.map((target) => ({ environmentId: target.environment.environmentId, patch }));
  }
  const keys = Object.keys(patch);
  if (
    keys.some(
      (key) => !PROJECT_SCOPED_SERVER_SETTING_KEYS.includes(key as ProjectScopedServerSettingKey),
    )
  )
    return [];
  const next: Record<string, unknown> = {};
  const clearedKeys: ProjectScopedServerSettingKey[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (
      value === null &&
      !isNullableProjectSettingsOverride(key as ProjectScopedServerSettingKey)
    ) {
      clearedKeys.push(key as ProjectScopedServerSettingKey);
    } else {
      next[key] = value;
    }
  }
  const writes = new Map<EnvironmentId, ServerSettingsPatch>();
  for (const target of targets) {
    if (target.projectId === null) continue;
    const current = writes.get(target.environment.environmentId);
    writes.set(target.environment.environmentId, {
      ...(Object.keys(next).length > 0
        ? {
            projectSettingsOverrides: {
              ...current?.projectSettingsOverrides,
              [target.projectId]: next as ProjectSettingsOverrides,
            },
          }
        : {}),
      ...(clearedKeys.length > 0
        ? {
            projectSettingsOverrideKeysToClear: {
              ...current?.projectSettingsOverrideKeysToClear,
              [target.projectId]: clearedKeys,
            },
          }
        : {}),
    });
  }
  return [...writes].map(([environmentId, patch]) => ({
    environmentId,
    patch,
  }));
}

export function uniformMobileSetting<K extends keyof ServerSettings>(
  targets: readonly Pick<ScopedMobileSettingsTarget, "settings">[],
  key: K,
): ServerSettings[K] | null {
  const reference = targets[0];
  if (!reference) return null;
  const value = reference.settings[key];
  return targets.every((target) => target.settings[key] === value) ? value : null;
}

export function planMobileScopedSettingsClear(
  targets: readonly ScopedMobileSettingsTarget[],
  keys: readonly ProjectScopedServerSettingKey[],
) {
  const writes = new Map<EnvironmentId, Record<string, readonly ProjectScopedServerSettingKey[]>>();
  for (const target of targets) {
    if (target.projectId === null) continue;
    const overrides = writes.get(target.environment.environmentId) ?? {};
    overrides[target.projectId] = keys;
    writes.set(target.environment.environmentId, overrides);
  }
  return [...writes].map(([environmentId, projectSettingsOverrideKeysToClear]) => ({
    environmentId,
    patch: { projectSettingsOverrideKeysToClear },
  }));
}
