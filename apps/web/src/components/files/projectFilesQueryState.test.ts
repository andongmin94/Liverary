import type { ProjectReadFileResult } from "@t3tools/contracts";
import { EnvironmentId, ProjectReadFileError } from "@t3tools/contracts";
import { executeAtomQuery } from "@t3tools/client-runtime/state/runtime";
import * as Effect from "effect/Effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const registryTasks = vi.hoisted(() => new Set<() => void>());

vi.mock("~/rpc/atomRegistry", async () => {
  const { AtomRegistry } = await import("effect/reactivity");
  return {
    appAtomRegistry: AtomRegistry.make({
      scheduleTask: (task) => {
        registryTasks.add(task);
        return () => {
          registryTasks.delete(task);
        };
      },
    }),
  };
});

import { appAtomRegistry } from "~/rpc/atomRegistry";
import { projectEnvironment } from "~/state/projects";
import { FileSaveCoordinator } from "./fileSaveCoordinator";
import {
  clearProjectFileQueryData,
  confirmProjectFileQueryData,
  getOptimisticProjectFileQueryData,
  getProjectFileContents,
  getUnsavedProjectFileQueryData,
  optimisticFileAtom,
  resolveProjectFileQueryData,
  setProjectFileQueryData,
} from "./projectFilesQueryState";

const environmentId = EnvironmentId.make("environment-project-files-query-test");
const optimisticFile = projectEnvironment.optimisticFile({
  environmentId,
  cwd: "/repo",
  relativePath: "convex.json",
});

function drainRegistryTasks(): void {
  while (registryTasks.size > 0) {
    const tasks = [...registryTasks];
    registryTasks.clear();
    for (const task of tasks) task();
  }
}

describe("project files queries", () => {
  afterEach(() => {
    clearProjectFileQueryData(environmentId, "/repo", "convex.json");
    drainRegistryTasks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("resumes an unsaved draft after closing the preview and restoring write access", async () => {
    vi.stubGlobal("window", {});
    vi.useFakeTimers();
    const closePreview = appAtomRegistry.mount(optimisticFile);
    let canWrite = true;
    const persist = vi.fn().mockResolvedValue(AsyncResult.success(undefined));
    const onPendingChange = vi.fn();
    const makeCoordinator = () =>
      new FileSaveCoordinator({
        debounceMs: 500,
        canPersist: () => canWrite,
        persist,
        onPendingChange,
        onConfirmed: (contents) =>
          confirmProjectFileQueryData(environmentId, "/repo", "convex.json", contents),
      });
    const initial = makeCoordinator();
    setProjectFileQueryData(environmentId, "/repo", "convex.json", "unsaved draft");
    initial.change("unsaved draft");
    canWrite = false;
    initial.dispose();
    closePreview();
    await vi.runAllTimersAsync();
    drainRegistryTasks();

    expect(persist).not.toHaveBeenCalled();
    expect(onPendingChange).toHaveBeenLastCalledWith(true);
    const unsaved = getUnsavedProjectFileQueryData(environmentId, "/repo", "convex.json");
    expect(unsaved?.contents).toBe("unsaved draft");

    canWrite = true;
    const reopened = makeCoordinator();
    reopened.change(unsaved!.contents);
    await vi.advanceTimersByTimeAsync(500);

    expect(persist).toHaveBeenCalledOnce();
    expect(persist).toHaveBeenCalledWith("unsaved draft");
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    expect(getUnsavedProjectFileQueryData(environmentId, "/repo", "convex.json")).toBeNull();
    reopened.dispose();
    drainRegistryTasks();
    expect(appAtomRegistry.getNodes().has(optimisticFile)).toBe(false);
  });

  it("keeps a reopened editor's newer draft pending when the old editor's write finishes", async () => {
    vi.stubGlobal("window", {});
    vi.useFakeTimers();
    let canWrite = true;
    const saved = AsyncResult.success(undefined);
    let finishFirstWrite!: (result: typeof saved) => void;
    const firstWrite = new Promise<typeof saved>((resolve) => {
      finishFirstWrite = resolve;
    });
    const persist = vi.fn().mockReturnValueOnce(firstWrite).mockResolvedValue(saved);
    const onPendingChange = vi.fn();
    const makeCoordinator = () =>
      new FileSaveCoordinator({
        debounceMs: 500,
        canPersist: () => canWrite,
        persist,
        onPendingChange,
        onConfirmed: (contents) =>
          confirmProjectFileQueryData(environmentId, "/repo", "convex.json", contents),
      });

    const initial = makeCoordinator();
    setProjectFileQueryData(environmentId, "/repo", "convex.json", "first draft");
    initial.change("first draft");
    await vi.advanceTimersByTimeAsync(500);
    initial.dispose();

    const reopened = makeCoordinator();
    setProjectFileQueryData(environmentId, "/repo", "convex.json", "newer draft");
    reopened.change("newer draft");
    canWrite = false;
    finishFirstWrite(saved);
    await vi.runAllTimersAsync();

    expect(persist).toHaveBeenCalledOnce();
    expect(onPendingChange).toHaveBeenLastCalledWith(true);
    expect(getUnsavedProjectFileQueryData(environmentId, "/repo", "convex.json")?.contents).toBe(
      "newer draft",
    );

    canWrite = true;
    reopened.change("newer draft");
    await vi.advanceTimersByTimeAsync(500);
    expect(persist).toHaveBeenLastCalledWith("newer draft");
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    expect(getUnsavedProjectFileQueryData(environmentId, "/repo", "convex.json")).toBeNull();
    reopened.dispose();
  });

  it("keeps the latest optimistic draft when an older write finishes", () => {
    vi.stubGlobal("window", {});
    const initial = {
      relativePath: "convex.json",
      contents: '{"nodeVersion":"20"}',
      byteLength: 20,
      truncated: false,
    } satisfies ProjectReadFileResult;
    setProjectFileQueryData(environmentId, "/repo", "convex.json", '{"nodeVersion":"220"}');
    setProjectFileQueryData(environmentId, "/repo", "convex.json", '{"nodeVersion":"22"}');

    expect(getOptimisticProjectFileQueryData(environmentId, "/repo", "convex.json")?.contents).toBe(
      '{"nodeVersion":"22"}',
    );

    expect(
      confirmProjectFileQueryData(environmentId, "/repo", "convex.json", '{"nodeVersion":"220"}'),
    ).toBe(false);

    expect(resolveProjectFileQueryData(environmentId, "/repo", "convex.json", initial)).toEqual({
      relativePath: "convex.json",
      contents: '{"nodeVersion":"22"}',
      byteLength: 20,
      truncated: false,
    });

    expect(
      confirmProjectFileQueryData(environmentId, "/repo", "convex.json", '{"nodeVersion":"22"}'),
    ).toBe(true);
  });

  it.each([false, true])(
    "uses a later successful read after save verification fails without losing a new draft (edited=%s)",
    async (edited) => {
      const file = (contents: string): ProjectReadFileResult => ({
        relativePath: "convex.json",
        contents,
        byteLength: contents.length,
        truncated: false,
      });
      const readError = new ProjectReadFileError({
        cwd: "/repo",
        relativePath: "convex.json",
        failure: "operation_failed",
        operation: "read",
      });
      let read: Effect.Effect<ProjectReadFileResult, ProjectReadFileError> = Effect.succeed(
        file("initial"),
      );
      const queryAtom = Atom.make(Effect.suspend(() => read)).pipe(
        Atom.swr({ staleTime: 30_000, revalidateOnMount: true }),
      );
      const readFile = vi.spyOn(projectEnvironment, "readFile").mockReturnValue(queryAtom);
      const closePreview = appAtomRegistry.mount(
        optimisticFileAtom(environmentId, "/repo", "convex.json"),
      );
      const closeRead = appAtomRegistry.mount(queryAtom);
      let releaseRead = () => {};
      const query = (refresh = false) =>
        executeAtomQuery(appAtomRegistry, queryAtom, {
          refresh,
          reportDefect: false,
          reportFailure: false,
        });

      try {
        expect((await query())._tag).toBe("Success");
        setProjectFileQueryData(environmentId, "/repo", "convex.json", "saved edit");
        read = Effect.fail(readError);
        expect(
          confirmProjectFileQueryData(environmentId, "/repo", "convex.json", "saved edit"),
        ).toBe(true);
        expect((await query())._tag).toBe("Failure");
        expect(getUnsavedProjectFileQueryData(environmentId, "/repo", "convex.json")).toBeNull();
        expect(getProjectFileContents(environmentId, "/repo", "convex.json")).toBe("saved edit");

        if (edited) {
          setProjectFileQueryData(environmentId, "/repo", "convex.json", "new unsaved edit");
        }
        read = Effect.succeed(file("external edit"));
        expect(await query(true)).toMatchObject({
          _tag: "Success",
          value: { contents: "external edit" },
        });
        expect(getProjectFileContents(environmentId, "/repo", "convex.json")).toBe(
          edited ? "new unsaved edit" : "external edit",
        );

        read = Effect.promise(
          () =>
            new Promise<void>((resolve) => {
              releaseRead = resolve;
            }),
        ).pipe(Effect.andThen(Effect.fail(readError)));
        const refreshing = query(true);
        expect(appAtomRegistry.get(queryAtom).waiting).toBe(true);
        expect(getProjectFileContents(environmentId, "/repo", "convex.json")).toBe(
          edited ? "new unsaved edit" : "external edit",
        );
        releaseRead();
        expect((await refreshing)._tag).toBe("Failure");
        expect(getProjectFileContents(environmentId, "/repo", "convex.json")).toBe(
          edited ? "new unsaved edit" : "external edit",
        );
      } finally {
        releaseRead();
        closeRead();
        closePreview();
        readFile.mockRestore();
      }
    },
  );
});
