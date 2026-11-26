import {
  LIVERARY_PROJECT_FILE_NAME,
  LEGACY_PROJECT_FILE_NAME,
  type EnvironmentId,
  type ProjectReadFileResult,
  type T3ProjectFile,
} from "@t3tools/contracts";
import { parseT3ProjectFile } from "@t3tools/shared/liveraryProjectFile";
import { executeAtomQuery } from "@t3tools/client-runtime/state/runtime";
import { AsyncResult } from "effect/reactivity";

import {
  getProjectFileQueryAtom,
  resolveProjectFileQueryData,
} from "~/components/files/projectFilesQueryState";
import { appAtomRegistry } from "~/rpc/atomRegistry";

const PROJECT_FILE_NAMES = [LIVERARY_PROJECT_FILE_NAME, LEGACY_PROJECT_FILE_NAME];

/** `"missing"` moves on to the legacy name; any other unreadable canonical file stops there. */
function toT3ProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
  fileName: string,
  result: ProjectReadFileResult | null,
  loaded: boolean,
): T3ProjectFile | null | "missing" {
  const data = resolveProjectFileQueryData(environmentId, workspaceRoot, fileName, result);
  if (loaded && data?.exists === false) return "missing";
  if (data === null || data.exists === false || data.truncated) return null;
  return parseT3ProjectFile(data.contents);
}

export async function readT3ProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): Promise<T3ProjectFile | null> {
  for (const fileName of PROJECT_FILE_NAMES) {
    const result = await executeAtomQuery(
      appAtomRegistry,
      getProjectFileQueryAtom(environmentId, workspaceRoot, fileName),
      { reportDefect: false, reportFailure: false },
    );
    const projectFile = toT3ProjectFile(
      environmentId,
      workspaceRoot,
      fileName,
      result._tag === "Success" ? result.value : null,
      result._tag === "Success",
    );
    if (projectFile !== "missing") return projectFile;
  }
  return null;
}

/** The project file from an earlier read, or `undefined` when none has loaded yet. */
export function peekT3ProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): T3ProjectFile | null | undefined {
  for (const fileName of PROJECT_FILE_NAMES) {
    const result = appAtomRegistry.get(
      getProjectFileQueryAtom(environmentId, workspaceRoot, fileName),
    );
    if (!AsyncResult.isSuccess(result)) return undefined;
    const projectFile = toT3ProjectFile(environmentId, workspaceRoot, fileName, result.value, true);
    if (projectFile !== "missing") return projectFile;
  }
  return null;
}
