import type { ServerProvider } from "@t3tools/contracts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { normalizePathForComparison } from "@t3tools/shared/path";
import { resolveCommandPath } from "@t3tools/shared/shell";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

export const detectProviderExecutables = Effect.fn("provider.detectExecutables")(function* (
  command: "claude" | "codex",
  desktopPath: string | undefined,
  env: NodeJS.ProcessEnv,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  const directories = (env.PATH ?? env.Path ?? env.path ?? "").split(
    platform === "win32" ? ";" : ":",
  );
  const pathMatches = yield* Effect.forEach(
    new Set(directories.filter(Boolean)),
    (directory) => resolveCommandPath(command, { env: { PATH: directory, PATHEXT: env.PATHEXT } }),
    { concurrency: 8 },
  );
  type Candidate = NonNullable<ServerProvider["detectedExecutables"]>[number];
  const candidates: Candidate[] = desktopPath ? [{ source: "desktop", path: desktopPath }] : [];
  for (const match of pathMatches) {
    if (match) candidates.push({ source: "path", path: path.resolve(match) });
  }
  const seen = new Set<string>();
  const distinct: Candidate[] = [];
  for (const candidate of candidates) {
    const real = yield* fs
      .realPath(candidate.path)
      .pipe(Effect.orElseSucceed(() => candidate.path));
    const key = normalizePathForComparison(real);
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push(candidate);
  }
  return distinct;
});
