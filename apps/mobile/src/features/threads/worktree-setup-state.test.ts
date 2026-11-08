import { RegistryContext } from "@effect/atom-react";
import { EnvironmentId, ThreadId, type WorktreeSetupSnapshot } from "@t3tools/contracts";
import {
  resolveVisibleWorktreeSetup,
  resolveWorktreeSetupSnapshot,
} from "@t3tools/client-runtime/worktree-setup";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";
import { act, createElement, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({ worktreeSetup: vi.fn() }));
vi.mock("../../state/vcs", () => ({
  vcsEnvironment: { worktreeSetup: mocks.worktreeSetup },
}));

import { useWorktreeSetup } from "./use-worktree-setup";

const threadId = ThreadId.make("setup-thread");
const running: WorktreeSetupSnapshot = {
  threadId,
  sequence: 1,
  phase: "running",
  startedAt: "2026-09-17T00:00:00.000Z",
  endedAt: null,
  branch: "feature",
  baseRef: "main",
  worktreePath: null,
  setupScript: null,
  stages: [],
  error: null,
};

describe("mobile worktree setup handoff", () => {
  it("keeps the setup identity after its card retires so the working header can take over", () => {
    const done = { ...running, phase: "done" as const, sequence: 2 };
    const held = resolveWorktreeSetupSnapshot(threadId, done, running);
    expect(held).toBe(done);
    expect(
      resolveVisibleWorktreeSetup({
        live: held,
        recorded: null,
        turnStarted: false,
        followUpSent: false,
      }),
    ).toBe(done);
    expect(
      resolveVisibleWorktreeSetup({
        live: held,
        recorded: null,
        turnStarted: true,
        followUpSent: false,
      }),
    ).toBeNull();
    expect(resolveWorktreeSetupSnapshot(threadId, undefined, held)).toBe(done);
  });

  it.each(["failed", "cancelled"] as const)(
    "retains %s details after the stream closes",
    (phase) => {
      const settled = { ...running, phase, sequence: 3 };
      const held = resolveWorktreeSetupSnapshot(threadId, settled, running);
      expect(resolveWorktreeSetupSnapshot(threadId, null, held)).toBe(settled);
      expect(resolveWorktreeSetupSnapshot(threadId, running, held)).toBe(settled);
      expect(
        resolveVisibleWorktreeSetup({
          live: held,
          recorded: null,
          turnStarted: false,
          followUpSent: false,
        }),
      ).toBe(settled);
      expect(
        resolveVisibleWorktreeSetup({
          live: held,
          recorded: null,
          turnStarted: false,
          followUpSent: true,
        }),
      ).toBeNull();
    },
  );

  it("does not carry a previous thread's progress across navigation", () => {
    const otherId = ThreadId.make("other-thread");
    expect(resolveWorktreeSetupSnapshot(otherId, running, running)).toBeNull();
    const other = { ...running, threadId: otherId };
    expect(resolveWorktreeSetupSnapshot(otherId, other, running)).toBe(other);
  });

  it("resubscribes for a failed setup's retry and stops again after the retry settles", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const registry = AtomRegistry.make();
    const root = createRoot(document.createElement("div"));
    const subscriptions: string[] = [];
    let serverSnapshot: WorktreeSetupSnapshot | null = running;
    let emit: (snapshot: WorktreeSetupSnapshot | null) => void = () => {};
    const progress = Atom.make((get) => {
      subscriptions.push("start");
      get.addFinalizer(() => subscriptions.push("stop"));
      emit = (snapshot) => {
        serverSnapshot = snapshot;
        get.setSelf(AsyncResult.success(snapshot));
      };
      return AsyncResult.success(serverSnapshot);
    });
    mocks.worktreeSetup.mockReturnValue(progress);
    let current: ReturnType<typeof useWorktreeSetup> | undefined;
    function Probe({ runPreparing }: { runPreparing: boolean }) {
      const input = {
        environmentId: EnvironmentId.make("environment"),
        threadId,
        // A worktree still exists after preparation; discovery must not keep its stream alive.
        preparing: true,
        runPreparing,
        turnStarted: !runPreparing,
        followUpSent: false,
      };
      const setup = useWorktreeSetup(input);
      useLayoutEffect(() => {
        current = setup;
      }, [setup]);
      return null;
    }
    const render = (runPreparing: boolean) =>
      act(async () =>
        root.render(
          createElement(
            RegistryContext.Provider,
            { value: registry },
            createElement(Probe, { runPreparing }),
          ),
        ),
      );

    try {
      await render(true);
      expect(current?.snapshot).toBe(running);
      const failed = { ...running, phase: "failed" as const, sequence: 25 };
      await act(async () => emit(failed));
      await render(false);
      expect(current?.snapshot).toBe(failed);
      expect(subscriptions).toEqual(["start", "stop"]);

      serverSnapshot = null;
      await render(true);
      expect(subscriptions).toEqual(["start", "stop", "start"]);
      const retried = { ...running, startedAt: "2026-09-17T00:01:00.000Z", sequence: 0 };
      await act(async () => emit(retried));
      expect(current?.snapshot).toBe(retried);

      const done = { ...retried, phase: "done" as const, sequence: 1 };
      await act(async () => emit(done));
      await render(false);
      expect(current?.snapshot).toBe(done);
      expect(current?.visible).toBeNull();
      expect(subscriptions).toEqual(["start", "stop", "start", "stop"]);
    } finally {
      act(() => root.unmount());
      registry.dispose();
    }
  });
});
