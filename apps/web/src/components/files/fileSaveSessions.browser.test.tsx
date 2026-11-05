import { render, fakeTimers } from "../../../test/render";
import { AuthFilesystemWriteScope, EnvironmentId, type AuthSessionState } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { AsyncResult, Atom } from "effect/reactivity";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

const { runAtomCommand, getUnsavedFile } = vi.hoisted(() => ({
  runAtomCommand: vi.fn(),
  getUnsavedFile: vi.fn(),
}));
vi.mock(import("@t3tools/client-runtime/state/runtime"), async (original) => ({
  ...(await original()),
  runAtomCommand: runAtomCommand as never,
}));
// The real session atom boots the connection runtime, whose endless discovery poll
// would keep vi.runAllTimersAsync from ever draining once its timers are faked.
vi.mock(import("~/state/session"), async (original) => {
  const actual = await original();
  const reactivity = await import("effect/reactivity");
  const signedOut = reactivity.Atom.make(reactivity.AsyncResult.initial<AuthSessionState>());
  return {
    ...actual,
    environmentSession: { ...actual.environmentSession, sessionStateAtom: () => signedOut },
    readEnvironmentScope: () => true,
  };
});
vi.mock(import("./projectFilesQueryState"), async (original) => ({
  ...(await original()),
  confirmProjectFileQueryData: () => true,
  getUnsavedProjectFileQueryData: getUnsavedFile,
}));

import { changeFileSaveSession, useFileSaveSession } from "./fileSaveSessions";
import { appAtomRegistry } from "~/rpc/atomRegistry";
import { environmentSession } from "~/state/session";

const target = {
  environmentId: EnvironmentId.make("file-save-sessions-browser"),
  cwd: "/workspace",
  relativePath: "README.md",
};
const onPendingChange = vi.fn();

// The editor and rendered-markdown surfaces are different component types, so
// switching between them unmounts one session holder and mounts another.
function EditorSurface() {
  useFileSaveSession({ ...target }, onPendingChange);
  return <div>editor</div>;
}
function MarkdownSurface() {
  useFileSaveSession({ ...target }, onPendingChange);
  return <div>markdown</div>;
}

describe("file save sessions in React", () => {
  it("writes a pending draft once when the file switches surfaces under StrictMode", async () => {
    let finishWrite = () => {};
    runAtomCommand.mockReset().mockImplementation(
      () =>
        new Promise((resolve) => {
          finishWrite = () => resolve(AsyncResult.success(undefined));
        }),
    );
    getUnsavedFile.mockReset().mockReturnValue(null);
    await using screen = await render(
      <StrictMode>
        <EditorSurface />
      </StrictMode>,
      { router: false }, // no routes involved; the surfaces are bare effect hosts
    );
    using _timers = fakeTimers();
    // An edit lands in the query cache, unconfirmed until its write settles.
    getUnsavedFile.mockReturnValue({ contents: "draft" });
    changeFileSaveSession(target, "draft");

    await screen.rerender(
      <StrictMode>
        <MarkdownSurface />
      </StrictMode>,
    );
    finishWrite();
    getUnsavedFile.mockReturnValue(null);
    await vi.runAllTimersAsync();

    expect(runAtomCommand.mock.calls.map(([, , request]) => request)).toEqual([
      {
        environmentId: target.environmentId,
        input: { cwd: "/workspace", relativePath: "README.md", contents: "draft" },
      },
    ]);
    expect(onPendingChange).toHaveBeenLastCalledWith("README.md", false);
  });

  it.each([false, true])(
    "recovers a failed save after same-scope revalidation (waiting observed=%s)",
    async (waitingObserved) => {
      const session = {
        authenticated: true,
        auth: {
          policy: "loopback-browser",
          bootstrapMethods: [],
          sessionMethods: [],
          sessionCookieName: "test",
        },
        scopes: [AuthFilesystemWriteScope],
      } satisfies AuthSessionState;
      const sessionAtom = Atom.make<
        Atom.Type<ReturnType<typeof environmentSession.sessionStateAtom>>
      >(AsyncResult.success(session));
      using _session = vi
        .spyOn(environmentSession, "sessionStateAtom")
        .mockReturnValue(sessionAtom);
      runAtomCommand
        .mockReset()
        .mockResolvedValueOnce(AsyncResult.failure(Cause.fail("offline")))
        .mockImplementation(async () => {
          getUnsavedFile.mockReturnValue(null);
          return AsyncResult.success(undefined);
        });
      getUnsavedFile.mockReset().mockReturnValue(null);
      onPendingChange.mockReset();
      await using _screen = await render(<EditorSurface />, { router: false }); // bare save-session host
      using _timers = fakeTimers();
      getUnsavedFile.mockReturnValue({ contents: "pending draft" });
      changeFileSaveSession(target, "pending draft");
      await vi.advanceTimersByTimeAsync(500);
      expect(runAtomCommand).toHaveBeenCalledTimes(1);
      expect(onPendingChange).toHaveBeenLastCalledWith("README.md", true);

      if (waitingObserved) {
        appAtomRegistry.set(sessionAtom, AsyncResult.success(session, { waiting: true }));
        await vi.advanceTimersByTimeAsync(500);
        expect(runAtomCommand).toHaveBeenCalledTimes(1);
      }
      appAtomRegistry.set(sessionAtom, AsyncResult.success({ ...session }));
      await vi.advanceTimersByTimeAsync(500);
      expect(runAtomCommand).toHaveBeenCalledTimes(2);
      expect(onPendingChange).toHaveBeenLastCalledWith("README.md", false);

      appAtomRegistry.set(sessionAtom, AsyncResult.success({ ...session }));
      await vi.advanceTimersByTimeAsync(500);
      expect(runAtomCommand).toHaveBeenCalledTimes(2);

      getUnsavedFile.mockReturnValue({ contents: "pending draft" });
      appAtomRegistry.set(sessionAtom, AsyncResult.success({ ...session, scopes: [] }));
      await vi.advanceTimersByTimeAsync(500);
      appAtomRegistry.set(sessionAtom, AsyncResult.failure(Cause.die("permission check failed")));
      await vi.advanceTimersByTimeAsync(500);
      expect(runAtomCommand).toHaveBeenCalledTimes(2);
      getUnsavedFile.mockReturnValue(null);
    },
  );
});
