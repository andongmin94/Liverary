import * as HostProcess from "@t3tools/shared/HostProcess";
import { normalizeProjectPathForComparison } from "@t3tools/shared/path";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Stream from "effect/Stream";

import * as ServerConfig from "../config.ts";
import { AgentSessionImporter } from "./AgentSessionImporter.ts";
import { claudeDesktopProfilePaths } from "../provider/ClaudeDesktopExecutable.ts";

export const run = Effect.gen(function* () {
  const config = yield* ServerConfig.ServerConfig;
  if (config.mode !== "desktop" || config.desktopBootstrapToken === undefined) return;
  const path = yield* Path.Path;
  const home = yield* HostProcess.HomeDirectory;
  if (
    normalizeProjectPathForComparison(config.stateDir) !==
    normalizeProjectPathForComparison(path.join(home, ".liverary", "userdata"))
  )
    return;

  const fs = yield* FileSystem.FileSystem;
  const importer = yield* AgentSessionImporter;
  const watch = (
    dir: string,
    recursive: boolean,
    accepts: (event: FileSystem.WatchEvent) => boolean,
  ) =>
    fs.watch(dir, { recursive }).pipe(
      Stream.filter(accepts),
      Stream.map(() => undefined),
      Stream.catch(() => Stream.empty),
    );
  const codex = path.join(home, ".codex");
  const changes = Stream.mergeAll(
    [
      watch(
        codex,
        false,
        (event) =>
          event.path === ".codex-global-state.json" ||
          /^(?:state_5|thread_history_1)\.sqlite$/.test(event.path) ||
          (event._tag === "Update" &&
            /^(?:state_5|thread_history_1)\.sqlite-wal$/.test(event.path)),
      ),
      watch(path.join(codex, "sessions"), true, (event) =>
        /^rollout-.*\.jsonl$/.test(path.basename(event.path)),
      ),
      watch(path.join(home, ".claude", "projects"), true, (event) =>
        /^[^/\\]+[/\\][\da-f-]{36}\.jsonl$/i.test(event.path),
      ),
      ...(yield* claudeDesktopProfilePaths).flatMap((profile) => [
        watch(profile, false, (event) => event.path === "config.json"),
        watch(path.join(profile, "claude-code-sessions"), true, (event) =>
          /^(?:local_.*\.json|deleted_.*|archived-sessions\.idx)$/.test(path.basename(event.path)),
        ),
      ]),
    ],
    { concurrency: "unbounded" },
  );
  yield* Stream.merge(
    Stream.succeed(undefined),
    changes.pipe(Stream.groupedWithin(1024, "3 seconds")),
  ).pipe(
    Stream.buffer({ capacity: 1, strategy: "sliding" }),
    Stream.runForEach(() => importer.syncDesktopSessions.pipe(Effect.ignoreCause({ log: true }))),
  );
});
