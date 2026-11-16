import type { EnvironmentProject } from "@t3tools/client-runtime/state/shell";
import { type EnvironmentId, ProjectId } from "@t3tools/contracts";
import { AsyncResult, AtomRegistry } from "effect/reactivity";
import { describe, expect, it, vi } from "vite-plus/test";

import { projectEnvironment } from "../state/projects";
import { createScratchProjectActions } from "./useScratchProject";

const local = "local" as EnvironmentId;
const remote = "remote" as EnvironmentId;
const other = "other" as EnvironmentId;

function scratchEnvironment(environmentId: EnvironmentId, scratchWorkspaceRoot: string | null) {
  return {
    environmentId,
    connection: { phase: "connected" },
    serverConfig: { scratchWorkspaceRoot },
  } as never;
}

function actions(
  primary: EnvironmentId | null,
  localRoot: string | null,
  remoteRoot: string | null = "/remote/scratch",
) {
  const environments = [
    scratchEnvironment(local, localRoot),
    scratchEnvironment(remote, remoteRoot),
    scratchEnvironment(other, "/other/scratch"),
  ];
  const input = {
    environments: () => environments,
    primaryEnvironmentId: () => primary,
    registry: AtomRegistry.make(),
    handleNewThread: async () => null,
    readRouteHref: () => "/",
  };
  return createScratchProjectActions(input);
}

describe("scratchEnvironmentId", () => {
  it("prefers the primary environment over the one on screen", () => {
    expect(actions(local, "/local/scratch").scratchEnvironmentId(remote)).toBe(local);
    expect(actions(local, "/local/scratch").scratchEnvironmentId(null)).toBe(local);
  });

  it("falls back when the primary environment offers no scratch root", () => {
    expect(actions(local, null).scratchEnvironmentId(remote)).toBe(remote);
    expect(actions(null, null).scratchEnvironmentId(remote)).toBe(remote);
    expect(actions(null, null, null).scratchEnvironmentId(remote)).toBe(other);
    expect(actions(local, null).scratchEnvironmentId(null)).toBeNull();
  });
});

it.each([false, true])(
  "opens a prepared scratch draft only while its requesting route is current (navigated: %s)",
  async (navigated) => {
    const route = { href: "/local/thread-original" };
    const project: EnvironmentProject = {
      id: ProjectId.make("scratch"),
      environmentId: remote,
      title: "No project",
      workspaceRoot: "/remote/scratch",
      defaultModelSelection: null,
      scripts: [],
      createdAt: "2026-11-16T00:00:00.000Z",
      updatedAt: "2026-11-16T00:00:00.000Z",
    };
    type ScratchOpenResult = Awaited<ReturnType<typeof projectEnvironment.openScratch.run>>;
    let resolvePrepared!: (value: ScratchOpenResult) => void;
    const prepared = new Promise<ScratchOpenResult>((resolve) => {
      resolvePrepared = resolve;
    });
    using _openScratch = vi.spyOn(projectEnvironment.openScratch, "run").mockReturnValue(prepared);
    const registry = AtomRegistry.make();
    using _registry = { [Symbol.dispose]: () => registry.dispose() };
    const input = {
      environments: () => [scratchEnvironment(remote, project.workspaceRoot)],
      primaryEnvironmentId: () => remote,
      registry,
      handleNewThread: async () => {
        route.href = "/draft/scratch";
        return null;
      },
      readRouteHref: () => route.href,
    };
    const scratch = createScratchProjectActions(input);

    const opening = scratch.startScratchThread(remote);
    if (navigated) route.href = "/other/thread-selected";
    resolvePrepared(AsyncResult.success(project));
    await opening;

    expect(route.href).toBe(navigated ? "/other/thread-selected" : "/draft/scratch");
  },
);
