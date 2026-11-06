// @effect-diagnostics nodeBuiltinImport:off -- Electron must migrate its profile before privileged scheme registration can yield.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

function existingPath(path: string): NodeFS.Stats | undefined {
  try {
    return NodeFS.lstatSync(path);
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") return undefined;
    throw cause;
  }
}

export function migrateDirectoryWithLegacyAlias(
  legacyDirectory: string,
  canonicalDirectory: string,
  platform: NodeJS.Platform,
): void {
  const legacy = NodePath.resolve(legacyDirectory);
  const canonical = NodePath.resolve(canonicalDirectory);
  if (legacy === canonical) return;
  const source = existingPath(legacy);
  const destination = existingPath(canonical);

  if (destination && (destination.isSymbolicLink() || !destination.isDirectory())) {
    throw new Error(`Liverary destination must be a real directory: ${canonical}`);
  }
  if (source?.isSymbolicLink()) {
    if (destination && NodeFS.realpathSync(legacy) === NodeFS.realpathSync(canonical)) return;
    throw new Error(`Liverary will not move an unrelated directory link: ${legacy}`);
  }
  if (!source) return;
  if (!source.isDirectory()) {
    throw new Error(`Legacy Liverary data must be a directory: ${legacy}`);
  }
  if (destination) {
    throw new Error(
      `Both Liverary data directories exist: ${legacy} and ${canonical}. Keep them separate and choose one with --base-dir; no files were moved or overwritten.`,
    );
  }

  NodeFS.renameSync(legacy, canonical);
  try {
    NodeFS.symlinkSync(canonical, legacy, platform === "win32" ? "junction" : "dir");
  } catch (cause) {
    try {
      NodeFS.renameSync(canonical, legacy);
    } catch (rollbackCause) {
      throw new AggregateError(
        [cause, rollbackCause],
        `Liverary moved ${legacy} to ${canonical}, but could not create the compatibility link or restore the original directory. Keep both paths unchanged and repair the directory link before starting the app.`,
        { cause: rollbackCause },
      );
    }
    throw new Error(
      `Liverary could not link ${legacy} to ${canonical}; the original directory was restored.`,
      { cause },
    );
  }
}
