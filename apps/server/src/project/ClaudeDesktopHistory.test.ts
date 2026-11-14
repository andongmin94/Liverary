import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { isClaudeDesktopSessionRunning } from "./ClaudeDesktopHistory.ts";

const id = "45f90719-d4c4-4dba-8809-f0ffeae3c951";

describe("isClaudeDesktopSessionRunning", () => {
  it.live("matches only a live Claude Desktop process registered for the session", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const configDir = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-claude-live-" });
      const sessions = path.join(configDir, "sessions");
      yield* fs.makeDirectory(sessions);
      const register = (pid: number, entry: object) =>
        fs.writeFileString(
          path.join(sessions, `${pid}.json`),
          JSON.stringify({ pid, sessionId: id, ...entry }),
        );
      const alive = new Set<number>();
      const running = isClaudeDesktopSessionRunning(id, configDir, (pid) => alive.has(pid));

      // Liverary's own CLI and a Desktop process that already exited leave registrations behind.
      yield* register(10, { entrypoint: "t3-code" });
      yield* register(11, { entrypoint: "claude-desktop" });
      yield* fs.writeFileString(path.join(sessions, "12.json"), "{");
      alive.add(10);
      expect(yield* running).toBe(false);

      alive.add(11);
      expect(yield* running).toBe(true);
      expect(yield* isClaudeDesktopSessionRunning("not-a-session", configDir, () => true)).toBe(
        false,
      );
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});
