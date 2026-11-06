import {
  AuthFilesystemReadScope,
  EnvironmentId,
  LEGACY_PROJECT_FILE_NAME,
  LIVERARY_PROJECT_FILE_NAME,
  type AuthSessionState,
  ProjectReadFileError,
  type ProjectReadFileResult,
} from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const authorizationMocks = vi.hoisted(() => ({
  sessionAtom: null as Atom.Atom<
    AsyncResult.AsyncResult<Pick<AuthSessionState, "authenticated" | "scopes">, Error>
  > | null,
  phase: "connected" as "connected" | "offline",
}));

vi.mock("~/state/session", () => ({
  environmentSession: { sessionStateAtom: () => authorizationMocks.sessionAtom },
}));

vi.mock("~/state/presentation", () => ({
  useEnvironmentPresentation: () => ({
    isReady: true,
    presentation: { connection: { phase: authorizationMocks.phase, error: null } },
  }),
}));

const projectMocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  optimisticFile: vi.fn(),
  readFile: vi.fn(),
}));

const atomHooks = vi.hoisted(() => ({
  registry: null as {
    get(atom: object): unknown;
    refresh(atom: object): void;
  } | null,
}));

const reactHooks = vi.hoisted(() => {
  let cursor = 0;
  let refs: Array<{ current: unknown }> = [];
  const nextIndex = () => cursor++;

  return {
    beginRender() {
      cursor = 0;
    },
    reset() {
      cursor = 0;
      refs = [];
    },
    useCallback<A>(callback: A): A {
      nextIndex();
      return callback;
    },
    useEffect(effect: () => void): void {
      nextIndex();
      effect();
    },
    useRef<A>(initialValue: A): { current: A } {
      const index = nextIndex();
      refs[index] ??= { current: initialValue };
      return refs[index] as { current: A };
    },
  };
});

vi.mock("@effect/atom-react", () => ({
  useAtomRefresh: (atom: object) => () => {
    atomHooks.registry?.refresh(atom);
  },
  useAtomValue: (atom: object) => atomHooks.registry?.get(atom),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useCallback: reactHooks.useCallback,
    useEffect: reactHooks.useEffect,
    useMemo: <A,>(factory: () => A) => factory(),
    useRef: reactHooks.useRef,
  };
});

vi.mock("~/state/projects", () => ({
  projectEnvironment: projectMocks,
}));

vi.mock("~/state/queries", () => ({
  useProjectPathSearch: vi.fn(),
}));

import { useWorkspaceMutationRefresh } from "~/hooks/useWorkspaceMutationRefresh";
import { useT3ProjectFileState } from "~/hooks/useLiveraryProjectFileScripts";
import { useProjectEntriesQuery, useProjectFileQuery } from "./projectFilesQueryState";

const environmentId = EnvironmentId.make("environment-1");

function deferred<A>() {
  let resolve!: (value: A) => void;
  const promise = new Promise<A>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function file(contents: string): ProjectReadFileResult {
  return {
    relativePath: "src/preview.ts",
    contents,
    byteLength: contents.length,
    truncated: false,
  };
}

async function flushEffects(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("project query refresh", () => {
  beforeEach(() => {
    authorizationMocks.sessionAtom = Atom.make(
      AsyncResult.success({ authenticated: true, scopes: [AuthFilesystemReadScope] }),
    );
    authorizationMocks.phase = "connected";
    projectMocks.listEntries.mockReset();
    projectMocks.optimisticFile.mockReset();
    projectMocks.readFile.mockReset();
    reactHooks.reset();
  });

  it("does not query or expose optimistic file contents without read permission", () => {
    authorizationMocks.sessionAtom = Atom.make(
      AsyncResult.success({ authenticated: true, scopes: [] }),
    );
    const registry = AtomRegistry.make();
    atomHooks.registry = registry;
    projectMocks.optimisticFile.mockReturnValue(Atom.make({ data: file("cached contents") }));
    try {
      const query = useProjectFileQuery(environmentId, "/repo", "src/preview.ts");
      expect(projectMocks.readFile).not.toHaveBeenCalled();
      expect(query.data).toBeNull();
      expect(query.error).toBe("이 연결에서는 호스트 파일을 읽을 수 없습니다.");
      expect(query.isPending).toBe(false);
      const entries = useProjectEntriesQuery(environmentId, "/repo");
      expect(projectMocks.listEntries).not.toHaveBeenCalled();
      expect(entries.data).toBeNull();
      expect(entries.error).toBe("이 연결에서는 호스트 파일을 읽을 수 없습니다.");
      expect(entries.isPending).toBe(false);
    } finally {
      registry.dispose();
      atomHooks.registry = null;
    }
  });

  it("refetches a listing when the workspace mutation changes, not when it is first read", async () => {
    let fetches = 0;
    const listing = Atom.make(() => {
      fetches += 1;
      return AsyncResult.success({ entries: [], truncated: false });
    }).pipe(Atom.keepAlive);
    projectMocks.listEntries.mockReturnValue(listing);
    const registry = AtomRegistry.make();
    atomHooks.registry = registry;
    const read = (mutationId: string | null) =>
      useProjectEntriesQuery(environmentId, "/repo", "src", mutationId);

    try {
      read("mutation-1");
      read("mutation-1");
      expect(fetches).toBe(1);

      read("mutation-2");
      // The refetch runs after the render that read the new revision; a reader that is not
      // subscribed sees it on its next read.
      await Promise.resolve();
      read("mutation-2");
      expect(fetches).toBe(2);
    } finally {
      registry.dispose();
      atomHooks.registry = null;
    }
  });

  it("replaces an in-flight initial read when a workspace mutation arrives", async () => {
    const requests: Array<ReturnType<typeof deferred<ProjectReadFileResult>>> = [];
    const readAtom = Atom.make(
      Effect.promise(() => {
        const request = deferred<ProjectReadFileResult>();
        requests.push(request);
        return request.promise;
      }),
    ).pipe(Atom.swr({ staleTime: 30_000, revalidateOnMount: true }));
    const registry = AtomRegistry.make();
    const unmount = registry.mount(readAtom);
    projectMocks.readFile.mockReturnValue(readAtom);
    projectMocks.optimisticFile.mockReturnValue(Atom.make(null));
    atomHooks.registry = registry;
    let renderedContents: string | null = null;

    const render = (mutationId: string | null) => {
      reactHooks.beginRender();
      const query = useProjectFileQuery(environmentId, "/repo", "src/preview.ts");
      expect(query.readError).toBeNull();
      renderedContents = query.data?.contents ?? null;
      useWorkspaceMutationRefresh({
        mutationId,
        refresh: query.refresh,
        resourceKey: "file:environment-1:/repo:src/preview.ts",
      });
    };

    try {
      render(null);
      await flushEffects();
      expect(requests).toHaveLength(1);

      render("mutation-1");
      await flushEffects();
      expect(requests).toHaveLength(2);

      requests[1]!.resolve(file("fresh"));
      await flushEffects();
      render("mutation-1");
      expect(renderedContents).toBe("fresh");

      requests[0]!.resolve(file("stale"));
      await flushEffects();
      render("mutation-1");
      expect(renderedContents).toBe("fresh");
    } finally {
      unmount();
      registry.dispose();
      atomHooks.registry = null;
    }
  });

  it("confirms files from reads and preserves that identity until a definitive folder result", () => {
    const contents = file("# readme");
    const success = AsyncResult.success(contents);
    const missing = AsyncResult.success({ ...file(""), exists: false });
    const failure = (
      kind: ProjectReadFileError["failure"],
      previousSuccess: typeof success | null = null,
    ) =>
      AsyncResult.failure(
        Cause.fail(
          new ProjectReadFileError({ cwd: "/repo", relativePath: "src/preview.ts", failure: kind }),
        ),
        { previousSuccess: Option.fromNullishOr(previousSuccess) },
      );
    const states = [
      ["initial read", AsyncResult.initial(true), false, false, false, null],
      ["unknown path", failure("operation_failed"), false, false, false, null],
      ["binary file", failure("binary_file"), true, false, false, null],
      ["read success", success, true, false, false, contents],
      ["pending refresh", AsyncResult.waiting(success), true, false, false, contents],
      [
        "transient refresh failure",
        failure("operation_failed", success),
        true,
        false,
        false,
        contents,
      ],
      ["became a folder", failure("path_not_file", success), false, true, false, contents],
      ["confirmed missing", missing, false, false, true, null],
      ["pending missing refresh", AsyncResult.waiting(missing), false, false, false, null],
      ["failed missing refresh", failure("operation_failed", missing), false, false, false, null],
    ] as const;
    const readAtom = Atom.make<
      AsyncResult.AsyncResult<ProjectReadFileResult, ProjectReadFileError>
    >(AsyncResult.initial(true));
    const registry = AtomRegistry.make();
    const unmount = registry.mount(readAtom);
    projectMocks.readFile.mockReturnValue(readAtom);
    projectMocks.optimisticFile.mockReturnValue(Atom.make(null));
    atomHooks.registry = registry;

    try {
      for (const [label, result, isFile, isNotFile, isMissing, data] of states) {
        registry.set(readAtom, result);
        reactHooks.beginRender();
        const query = useProjectFileQuery(environmentId, "/repo", "src/preview.ts");
        expect(query.isFile, label).toBe(isFile);
        expect(query.isNotFile, label).toBe(isNotFile);
        expect(query.isMissing, label).toBe(isMissing);
        expect(query.data, label).toBe(data);
        expect(query.isPending, label).toBe(result.waiting);
      }
    } finally {
      unmount();
      registry.dispose();
      atomHooks.registry = null;
    }
  });

  it("prefers canonical project configuration and only reads legacy when it is missing", () => {
    const canonicalFile = file('{"scripts":[{"name":"Canonical","command":"echo canonical"}]}');
    const legacyFile = file('{"scripts":[{"name":"Legacy","command":"echo legacy"}]}');
    const missing = AsyncResult.success({ ...file(""), exists: false });
    const failure = AsyncResult.failure(
      Cause.fail(
        new ProjectReadFileError({
          cwd: "/repo",
          relativePath: LIVERARY_PROJECT_FILE_NAME,
          failure: "operation_failed",
        }),
      ),
    );
    const cases = [
      [
        "canonical preferred",
        AsyncResult.success(canonicalFile),
        AsyncResult.success(legacyFile),
        "valid",
        LIVERARY_PROJECT_FILE_NAME,
        "Canonical",
      ],
      [
        "legacy fallback",
        missing,
        AsyncResult.success(legacyFile),
        "valid",
        LEGACY_PROJECT_FILE_NAME,
        "Legacy",
      ],
      [
        "invalid canonical",
        AsyncResult.success(file("{")),
        AsyncResult.success(legacyFile),
        "invalid",
        LIVERARY_PROJECT_FILE_NAME,
        null,
      ],
      [
        "unreadable canonical",
        failure,
        AsyncResult.success(legacyFile),
        "error",
        LIVERARY_PROJECT_FILE_NAME,
        null,
      ],
      [
        "truncated canonical",
        AsyncResult.success({ ...canonicalFile, truncated: true }),
        AsyncResult.success(legacyFile),
        "invalid",
        LIVERARY_PROJECT_FILE_NAME,
        null,
      ],
      ["both missing", missing, missing, "missing", LEGACY_PROJECT_FILE_NAME, null],
    ] as const;
    for (const [label, canonical, legacy, status, fileName, scriptName] of cases) {
      const registry = AtomRegistry.make();
      atomHooks.registry = registry;
      projectMocks.readFile.mockReset();
      projectMocks.readFile.mockImplementation(({ input }: { input: { relativePath: string } }) =>
        Atom.make(input.relativePath === LIVERARY_PROJECT_FILE_NAME ? canonical : legacy),
      );
      projectMocks.optimisticFile.mockReturnValue(Atom.make(null));
      try {
        const state = useT3ProjectFileState(environmentId, "/repo");
        expect(state.status, label).toBe(status);
        expect(state.fileName, label).toBe(fileName);
        expect(state.scripts[0]?.name ?? null, label).toBe(scriptName);
        expect(
          projectMocks.readFile.mock.calls.map(([request]) => request.input),
          label,
        ).toEqual(
          (fileName === LEGACY_PROJECT_FILE_NAME
            ? [LIVERARY_PROJECT_FILE_NAME, LEGACY_PROJECT_FILE_NAME]
            : [LIVERARY_PROJECT_FILE_NAME]
          ).map((relativePath) => ({ cwd: "/repo", relativePath, allowMissing: true })),
        );
      } finally {
        registry.dispose();
        atomHooks.registry = null;
      }
    }
  });
});
