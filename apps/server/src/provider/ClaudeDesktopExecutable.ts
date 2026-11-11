import * as HostProcess from "@t3tools/shared/HostProcess";
import { compareSemverVersions } from "@t3tools/shared/semver";
import { SpawnExecutableResolution } from "@t3tools/shared/shell";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

export const claudeDesktopProfilePaths = Effect.gen(function* () {
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  const env = yield* HostProcess.Environment;
  const home = yield* HostProcess.HomeDirectory;

  const profiles: string[] = [];
  if (platform === "win32") {
    const local = env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
    const roaming = env.APPDATA ?? path.join(home, "AppData", "Roaming");
    const family = "claude_pzs8sxrjxfjjc";
    profiles.push(
      path.join(local, "Claude-Data", family),
      path.join(local, "Packages", family, "LocalCache", "Roaming", "Claude"),
      path.join(roaming, "Claude"),
    );
  } else if (platform === "darwin") {
    profiles.push(path.join(home, "Library", "Application Support", "Claude"));
  }
  return profiles;
});

export const findClaudeDesktopExecutable = Effect.fn("ClaudeDesktop.findExecutable")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const platform = yield* HostProcess.Platform;
  const env = yield* HostProcess.Environment;
  const resolveExecutable = yield* SpawnExecutableResolution;
  const names =
    platform === "darwin" ? ["claude.app/Contents/MacOS/claude", "claude"] : ["claude.exe"];

  for (const profile of yield* claudeDesktopProfilePaths) {
    const cache = path.join(profile, "claude-code");
    const entries = yield* fs.readDirectory(cache).pipe(Effect.orElseSucceed(() => []));
    const versions = entries
      .filter((name) => /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(name))
      .sort((a, b) => compareSemverVersions(b, a));
    for (const version of versions) {
      const directory = path.join(cache, version);
      const builds = yield* fs.readDirectory(directory).pipe(Effect.orElseSucceed(() => []));
      // Desktop publishes each completed build with .verified and prefers the newest marker within a version.
      let selected: { executable: string; modified: number } | undefined;
      for (const build of builds) {
        if (!/^[0-9a-f]{12}$/.test(build)) continue;
        const root = path.join(directory, build);
        const marker = yield* fs.stat(path.join(root, ".verified")).pipe(Effect.option);
        if (Option.isNone(marker) || marker.value.type !== "File") continue;
        const modified = Option.getOrUndefined(marker.value.mtime)?.getTime() ?? 0;
        if (selected && modified <= selected.modified) continue;
        for (const name of names) {
          const executable = resolveExecutable(path.join(root, name), platform, env);
          if (executable) {
            selected = { executable, modified };
            break;
          }
        }
      }
      if (selected) return selected.executable;
    }
  }
  return undefined;
});
