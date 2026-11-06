import {
  LIVERARY_PROJECT_FILE_NAME,
  LEGACY_PROJECT_FILE_NAME,
  type EnvironmentId,
  type T3ProjectFile,
  type T3ProjectFileScript,
} from "@t3tools/contracts";
import { parseT3ProjectFile } from "@t3tools/shared/liveraryProjectFile";

import { useProjectFileQuery } from "~/components/files/projectFilesQueryState";

const NO_SCRIPTS: ReadonlyArray<T3ProjectFileScript> = [];

export interface T3ProjectFileState {
  status: "loading" | "missing" | "invalid" | "valid" | "error";
  fileName: string;
  error: string | null;
  file: T3ProjectFile | null;
  scripts: ReadonlyArray<T3ProjectFileScript>;
}

export function useT3ProjectFileState(
  environmentId: EnvironmentId,
  cwd: string | null,
): T3ProjectFileState {
  const canonical = useProjectFileQuery(
    environmentId,
    cwd ?? "",
    LIVERARY_PROJECT_FILE_NAME,
    cwd !== null,
  );
  const legacy = useProjectFileQuery(
    environmentId,
    cwd ?? "",
    LEGACY_PROJECT_FILE_NAME,
    cwd !== null && canonical.isMissing,
  );
  const query = canonical.isMissing ? legacy : canonical;
  const fileName = canonical.isMissing ? LEGACY_PROJECT_FILE_NAME : LIVERARY_PROJECT_FILE_NAME;
  const empty = { fileName, file: null, scripts: NO_SCRIPTS, error: null };
  if (query.isPending) return { ...empty, status: "loading" };
  if (query.isMissing) return { ...empty, status: "missing" };
  if (query.error !== null) return { ...empty, status: "error", error: query.error };
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  if (contents === null) {
    return { ...empty, status: query.data?.truncated ? "invalid" : "missing" };
  }
  const file = parseT3ProjectFile(contents);
  if (file === null) {
    return { ...empty, status: "invalid" };
  }
  return { status: "valid", fileName, error: null, file, scripts: file.scripts ?? NO_SCRIPTS };
}

export function useT3ProjectFileScripts(
  environmentId: EnvironmentId,
  cwd: string | null,
): ReadonlyArray<T3ProjectFileScript> {
  return useT3ProjectFileState(environmentId, cwd).scripts;
}
