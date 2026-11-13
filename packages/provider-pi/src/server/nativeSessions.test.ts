import * as NodeServices from "@effect/platform-node/NodeServices";
import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as HostProcess from "@t3tools/shared/HostProcess";
import { describe, expect } from "vite-plus/test";
import { makePiNativeSessions } from "./nativeSessions.ts";
import { parsePiNativeSession } from "./sessionTranscript.ts";

const createdAt = "2026-01-01T00:00:00.000Z";
const transcript =
  [
    { type: "session", id: "native-uuid", cwd: "/project", timestamp: createdAt },
    {
      type: "message",
      id: "question",
      parentId: null,
      message: { role: "user", content: "Question" },
    },
    {
      type: "message",
      id: "abandoned",
      parentId: "question",
      message: { role: "assistant", content: "Old answer" },
    },
    {
      type: "message",
      id: "tool",
      parentId: "question",
      message: { role: "toolResult", content: null },
    },
    {
      type: "message",
      id: "answer",
      parentId: "tool",
      message: {
        role: "assistant",
        model: "model-a",
        content: [
          { type: "thinking", text: "private" },
          { type: "text", text: "New answer" },
        ],
      },
    },
    { type: "session_info", id: "name", parentId: "answer", name: "Native title" },
  ]
    .map((entry) => JSON.stringify(entry))
    .join("\n") + "\n";

describe("Pi native sessions", () => {
  it("preserves native entry IDs and the selected branch through non-message records", () => {
    const result = parsePiNativeSession(transcript, "/sessions/native.jsonl", 1000);
    expect(result?.summary).toMatchObject({
      nativeId: "/sessions/native.jsonl",
      aliases: ["native-uuid"],
      title: "Native title",
      model: "model-a",
    });
    expect(result?.messages.map((message) => [message.id, message.text])).toEqual([
      ["question", "Question"],
      ["answer", "New answer"],
    ]);
  });

  it.effect("shares the file catalog and deletes only a validated session in its own store", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped();
      const instanceHome = path.join(root, "instance-home");
      const sessionsDir = path.join(instanceHome, ".pi", "agent", "sessions");
      yield* fs.makeDirectory(path.join(sessionsDir, "--project--"), { recursive: true });
      const sessionFile = path.join(sessionsDir, "--project--", "native.jsonl");
      const outsideFile = path.join(root, "outside.jsonl");
      yield* fs.writeFileString(outsideFile, transcript);
      for (const [platform, environment] of [
        ["linux", { PI_CODING_AGENT_SESSION_DIR: sessionsDir }],
        ["linux", { HOME: instanceHome }],
        ["linux", { HOME: instanceHome, PI_CODING_AGENT_DIR: "~/.pi/agent" }],
        ["linux", { HOME: instanceHome, PI_CODING_AGENT_SESSION_DIR: "~/.pi/agent/sessions" }],
        ["win32", { USERPROFILE: instanceHome }],
        ["win32", { USERPROFILE: instanceHome, PI_CODING_AGENT_DIR: "~/.pi/agent" }],
        [
          "win32",
          { USERPROFILE: instanceHome, PI_CODING_AGENT_SESSION_DIR: "~/.pi/agent/sessions" },
        ],
      ] as const) {
        yield* fs.writeFileString(sessionFile, transcript);
        const native = yield* makePiNativeSessions(environment, "").pipe(
          Effect.provideService(HostProcess.Platform, platform),
          Effect.provideService(HostProcess.HomeDirectory, path.join(root, "host-home")),
        );
        const catalog = yield* native.list({});
        expect(catalog.complete).toBe(true);
        expect(catalog.sessions).toHaveLength(1);
        expect(catalog.sessions[0]?.nativeId).toBe(sessionFile);
        expect(
          (yield* native.read!({ nativeId: sessionFile, cwd: "/project" })).map(
            (message) => message.id,
          ),
        ).toEqual(["question", "answer"]);
        expect(
          (yield* native.delete!({ nativeId: outsideFile, cwd: "/project" }).pipe(Effect.exit))
            ._tag,
        ).toBe("Failure");
        expect(yield* fs.exists(outsideFile)).toBe(true);
        yield* native.delete!({ nativeId: sessionFile, cwd: "/project" });
        expect((yield* native.list({})).sessions).toEqual([]);
        expect(
          yield* native.read!({ nativeId: sessionFile, cwd: "/project" }).pipe(Effect.flip),
        ).toMatchObject({ notFound: true });
        expect(native).not.toHaveProperty("setArchived");
      }
    }).pipe(Effect.provide(NodeServices.layer)),
  );
});
