import * as NodeUtil from "node:util";

import {
  PROJECT_SCOPED_SERVER_SETTING_KEYS,
  type ProjectId,
  type ProjectSettingsOverrides,
  type ServerSettingsPatch,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import * as ProjectStore from "../orchestration-v2/ProjectStore.ts";
import * as Settings from "../serverSettings.ts";

const deletedProjectClearedKeys = [
  ...PROJECT_SCOPED_SERVER_SETTING_KEYS.filter((key) => key !== "worktreeCleanup"),
  "providerInstances",
] as const;

const keepsWorktreeCleanup = (entry: ProjectSettingsOverrides | undefined) =>
  entry?.worktreeCleanup !== undefined;

// Override patches merge per key, so drop every key except the cleanup policy deleted threads still need.
export function deletedProjectOverridePatch(
  entries: ReadonlyArray<readonly [ProjectId, ProjectSettingsOverrides | undefined]>,
): ServerSettingsPatch | undefined {
  if (entries.length === 0) return undefined;
  const removed = entries.filter(([, entry]) => !keepsWorktreeCleanup(entry));
  const trimmed = entries.filter(([, entry]) => keepsWorktreeCleanup(entry));
  return {
    ...(removed.length === 0
      ? {}
      : {
          projectSettingsOverrides: Object.fromEntries(
            removed.map(([projectId]) => [projectId, null]),
          ),
        }),
    ...(trimmed.length === 0
      ? {}
      : {
          projectSettingsOverrideKeysToClear: Object.fromEntries(
            trimmed.map(([projectId]) => [projectId, deletedProjectClearedKeys]),
          ),
        }),
  };
}

export const sweep = Effect.gen(function* () {
  const serverSettings = yield* Settings.ServerSettingsService;
  const projectStore = yield* ProjectStore.ProjectStoreV2;

  const projects = yield* projectStore.list({ includeDeleted: true });
  const projectsById = new Map<string, ProjectStore.ProjectRow>(
    projects.map((project) => [project.projectId, project]),
  );

  yield* serverSettings.updateSettings((settings) =>
    deletedProjectOverridePatch(
      Object.entries(settings.projectSettingsOverrides).flatMap(([projectId, entry]) => {
        const project = projectsById.get(projectId);
        if (project?.deletedAt === null) return [];
        const kept =
          project && keepsWorktreeCleanup(entry)
            ? { worktreeCleanup: entry.worktreeCleanup }
            : undefined;
        if (NodeUtil.isDeepStrictEqual(entry, kept)) return [];
        return [[projectId as ProjectId, project ? entry : undefined] as const];
      }),
    ),
  );
}).pipe(
  Effect.asVoid,
  Effect.catchCause((cause) =>
    Effect.logWarning("Failed to sweep orphaned project settings overrides.", cause),
  ),
);
