import * as HostProcess from "@t3tools/shared/HostProcess";
import { SpawnExecutableResolution } from "@t3tools/shared/shell";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

export const findCodexDesktopExecutable = Effect.fn("CodexDesktop.findExecutable")(function* () {
  const platform = yield* HostProcess.Platform;
  const env = yield* HostProcess.Environment;
  const home = yield* HostProcess.HomeDirectory;
  const path = yield* Path.Path;
  const resolveExecutable = yield* SpawnExecutableResolution;
  const executable = (candidate: string) => resolveExecutable(candidate, platform, env);
  if (platform === "darwin") {
    for (const applications of [path.join(home, "Applications"), "/Applications"]) {
      for (const bundle of ["ChatGPT.app", "Codex.app"]) {
        const resources = path.join(applications, bundle, "Contents", "Resources");
        for (const cli of ["codex-cli/CodexCLI.app/Contents/MacOS/codex", "codex"]) {
          const found = executable(path.join(resources, cli));
          if (found) return found;
        }
      }
    }
  }
  if (platform !== "win32") return undefined;

  const fs = yield* FileSystem.FileSystem;
  const local = env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
  const bin = path.join(local, "OpenAI", "Codex", "bin");
  const builds = yield* fs.readDirectory(bin).pipe(Effect.orElseSucceed(() => []));
  let current: { path: string; modified: number } | undefined;
  // Desktop relocates its CLI and sibling executables together into a content-hashed directory.
  for (const build of builds) {
    if (!/^[0-9a-f]{16}$/.test(build)) continue;
    const directory = path.join(bin, build);
    const cli = executable(path.join(directory, "codex.exe"));
    if (!cli) continue;
    const modified = yield* fs.stat(directory).pipe(
      Effect.map((stat) => Option.getOrUndefined(stat.mtime)?.getTime() ?? 0),
      Effect.orElseSucceed(() => 0),
    );
    if (!current || current.modified < modified) current = { path: cli, modified };
  }
  if (current) return current.path;

  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const powershell = path.join(
    env.SystemRoot ?? env.SYSTEMROOT ?? "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  const install = yield* spawner
    .string(
      ChildProcess.make(
        powershell,
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); (Get-AppxPackage -Name OpenAI.Codex).InstallLocation",
        ],
        { stdin: "ignore", stderr: "ignore" },
      ),
    )
    .pipe(Effect.orElseSucceed(() => ""));
  if (install.trim()) {
    const cli = executable(path.join(install.trim(), "app", "resources", "codex.exe"));
    if (cli) return cli;
  }
  return executable(path.join(bin, "codex.exe"));
});
