import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { makeClaudeNativeSessions } from "./ClaudeNativeSessions.ts";

const encodeJson = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));
const nativeId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const desktopId = (n: number) => `local_40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const userId = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const assistantId = (n: number) => `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const startedAt = "2026-11-12T00:00:00.000Z";
const completedAt = "2026-11-12T00:01:00.000Z";

const fixture = Effect.fn("ClaudeNativeSessions.test.fixture")(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const home = yield* fs.makeTempDirectoryScoped({ prefix: "liverary-claude-native-" });
  const configDir = path.join(home, ".claude");
  const cwd = path.join(home, "workspace");
  const projectDir = path.join(configDir, "projects", cwd.replace(/[^a-zA-Z0-9]/g, "-"));
  const profile = path.join(home, "Library", "Application Support", "Claude");
  const account = "10000000-0000-4000-8000-000000000001";
  const org = "20000000-0000-4000-8000-000000000001";
  const catalogDir = path.join(profile, "claude-code-sessions", account, org);
  yield* fs.makeDirectory(cwd, { recursive: true });
  yield* fs.makeDirectory(projectDir, { recursive: true });
  yield* fs.makeDirectory(catalogDir, { recursive: true });
  yield* fs.writeFileString(
    path.join(profile, "config.json"),
    encodeJson({ lastKnownAccountUuid: account }),
  );
  const writeSession = (n: number, extra: object = {}) =>
    fs.writeFileString(
      path.join(projectDir, `${nativeId(n)}.jsonl`),
      [
        {
          type: "user",
          uuid: userId(n),
          parentUuid: null,
          sessionId: nativeId(n),
          cwd,
          timestamp: startedAt,
          isSidechain: false,
          message: { role: "user", content: `Question ${n}` },
          ...extra,
        },
        {
          type: "assistant",
          uuid: assistantId(n),
          parentUuid: userId(n),
          sessionId: nativeId(n),
          cwd,
          timestamp: completedAt,
          isSidechain: false,
          message: {
            id: `msg_${n}`,
            role: "assistant",
            model: "claude-haiku-4-5",
            content: [{ type: "text", text: `Answer ${n}` }],
          },
        },
      ]
        .map((message) => encodeJson(message))
        .join("\n") + "\n",
    );
  const writeDesktop = (n: number, extra: object = {}) =>
    fs.writeFileString(
      path.join(catalogDir, `${desktopId(n)}.json`),
      encodeJson({
        sessionId: desktopId(n),
        cliSessionId: nativeId(n),
        cwd,
        title: `Desktop ${n}`,
        lastActivityAt: Date.parse(completedAt),
        ...extra,
      }),
    );
  const make = (homePath = configDir) =>
    makeClaudeNativeSessions({ homePath }, process.env).pipe(
      Effect.provideService(HostProcess.HomeDirectory, home),
      Effect.provideService(HostProcess.Platform, "darwin"),
      // Force the worker path; SDK filesystem calls must never read the test runner's real home.
      Effect.provideService(HostProcess.Environment, {
        CLAUDE_CONFIG_DIR: path.join(home, "host-config"),
      }),
    );
  return {
    fs,
    path,
    home,
    configDir,
    cwd,
    projectDir,
    profile,
    catalogDir,
    writeSession,
    writeDesktop,
    make,
  };
});

describe("ClaudeNativeSessions", () => {
  it.live(
    "shares native history with stable IDs and distinguishes desktop lifecycle and rewind aliases",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture();
        for (const n of [1, 2, 3, 4, 5, 6, 7])
          yield* f.writeSession(n, n === 1 ? { entrypoint: "sdk-ts" } : {});
        for (const n of [1, 2, 3]) yield* f.writeDesktop(n);
        yield* f.writeDesktop(4, {
          priorCliSessionIds: [nativeId(5)],
          rewindEdges: [
            { parent: nativeId(5), child: nativeId(6) },
            { parent: nativeId(6), child: nativeId(4) },
          ],
        });
        yield* f.fs.writeFileString(
          f.path.join(f.catalogDir, "archived-sessions.idx"),
          encodeJson({ archived: [desktopId(2)] }),
        );
        for (const n of [3, 8])
          yield* f.fs.writeFileString(
            f.path.join(f.catalogDir, `deleted_${desktopId(n).slice("local_".length)}`),
            "",
          );
        const sessions = yield* f.make();
        const listed = yield* sessions.list({});
        expect(listed.complete).toBe(false);
        expect(listed.sessions.map((session) => [session.nativeId, session.state]).sort()).toEqual(
          [
            ["", "deleted"],
            [nativeId(1), "active"],
            [nativeId(2), "archived"],
            [nativeId(3), "deleted"],
            [nativeId(4), "active"],
          ].sort(),
        );
        expect(listed.excludedNativeIds).toEqual([nativeId(7)]);
        expect(listed.sessions.find((session) => session.nativeId === nativeId(4))).toMatchObject({
          catalogId: desktopId(4),
          aliases: [nativeId(5), nativeId(6)],
          title: "Desktop 4",
        });
        expect(listed.sessions.find((session) => session.catalogId === desktopId(8))).toMatchObject(
          { nativeId: "", cwd: "", state: "deleted" },
        );
        expect(sessions.watchPaths).toContain(f.configDir);
        expect(sessions.watchPaths).toContain(f.profile);
        expect(yield* sessions.read!({ nativeId: nativeId(1), cwd: f.cwd })).toEqual([
          { id: userId(1), role: "user", text: "Question 1", createdAt: startedAt },
          { id: assistantId(1), role: "assistant", text: "Answer 1", createdAt: completedAt },
        ]);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.live.each(["without Desktop", "separate account"] as const)(
    "lists interactive CLI sessions %s",
    (mode) =>
      Effect.gen(function* () {
        const f = yield* fixture();
        yield* f.writeSession(1);
        yield* f.writeSession(2, { entrypoint: "sdk-ts" });
        yield* f.writeSession(3, { sessionKind: "daemon-worker" });
        yield* f.writeDesktop(2);
        let homePath = f.configDir;
        if (mode === "without Desktop") {
          yield* f.fs.remove(f.profile, { recursive: true });
        } else {
          homePath = f.path.join(f.home, "separate-account");
          yield* f.fs.rename(f.configDir, homePath);
        }
        const sessions = yield* f.make(homePath);
        const listed = yield* sessions.list({});
        expect(listed.sessions.map((session) => session.nativeId)).toEqual([nativeId(1)]);
        expect(listed.excludedNativeIds?.toSorted()).toEqual([nativeId(2), nativeId(3)]);
        expect(yield* sessions.read!({ nativeId: nativeId(2), cwd: f.cwd })).toHaveLength(2);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.live("does not reinterpret an unreadable desktop catalog as active or deleted history", () =>
    Effect.gen(function* () {
      const f = yield* fixture();
      yield* f.writeSession(1);
      yield* f.writeDesktop(1, { isArchived: true });
      const sessions = yield* f.make();
      yield* f.fs.writeFileString(f.path.join(f.catalogDir, "archived-sessions.idx"), "{");
      expect(yield* sessions.list({})).toEqual({ sessions: [], complete: false });
      yield* f.fs.remove(f.path.join(f.profile, "config.json"));
      expect(yield* sessions.list({})).toEqual({ sessions: [], complete: false });
      expect(yield* f.fs.exists(f.path.join(f.projectDir, `${nativeId(1)}.jsonl`))).toBe(true);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.live(
    "deletes only the selected native transcript and its subagents, preserving desktop metadata",
    () =>
      Effect.gen(function* () {
        const f = yield* fixture();
        yield* f.writeSession(1);
        yield* f.writeSession(2);
        yield* f.writeDesktop(1);
        const subagents = f.path.join(f.projectDir, nativeId(1), "subagents");
        yield* f.fs.makeDirectory(subagents, { recursive: true });
        yield* f.fs.writeFileString(f.path.join(subagents, "agent-test.jsonl"), "{}\n");
        const sessions = yield* f.make();
        expect(sessions.deletionScope).toBe("transcript");
        expect("setArchived" in sessions).toBe(false);
        yield* sessions.delete!({ nativeId: nativeId(1), cwd: f.cwd });
        expect(yield* f.fs.exists(f.path.join(f.projectDir, `${nativeId(1)}.jsonl`))).toBe(false);
        expect(yield* f.fs.exists(subagents)).toBe(false);
        expect(yield* f.fs.exists(f.path.join(f.projectDir, `${nativeId(2)}.jsonl`))).toBe(true);
        expect(yield* f.fs.exists(f.path.join(f.catalogDir, `${desktopId(1)}.json`))).toBe(true);
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});
