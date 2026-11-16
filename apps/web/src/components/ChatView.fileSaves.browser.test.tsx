import { createMemoryHistory } from "@tanstack/react-router";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { ProjectId } from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { AppRoot } from "~/AppRoot";
import "~/components/ChatView";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import { chatMessages } from "~/locales/ko/chatMessages";
import { useRightPanelStore } from "~/rightPanelStore";
import { getRouter } from "~/router";
import { projectEnvironment } from "~/state/projects";
import { getUnsavedProjectFileQueryData } from "./files/projectFilesQueryState";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { act, render } from "../../test/render";

vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});

vi.mock(import("~/rpc/requestLatencyState"), async (original) => ({
  ...(await original()),
  trackRpcRequestSent: () => {},
}));

// The app's shell subscription outlives a test, so these projects need their own file.
it("settles the original project's file save without clearing another project's pending edit", async () => {
  const first = {
    ...threadWithHistory("file-save-first", 1),
    project: {
      id: ProjectId.make("file-save-first"),
      title: "First project",
      workspaceRoot: "/workspace/first",
    },
  };
  const second = {
    ...threadWithHistory("file-save-second", 1),
    project: {
      id: ProjectId.make("file-save-second"),
      title: "Second project",
      workspaceRoot: "/workspace/second",
    },
  };
  using _environment = installFakeEnvironment([first, second]);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const storageKeys = ["t3code.fileExplorerOpen", "t3code.renderMarkdown"];
  const previousStorage = storageKeys.map((key) => localStorage.getItem(key));
  using _storage = {
    [Symbol.dispose]() {
      for (const [index, key] of storageKeys.entries()) {
        const value = previousStorage[index];
        if (value == null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      }
    },
  };
  localStorage.setItem(storageKeys[0]!, "false");
  localStorage.setItem(storageKeys[1]!, "true");

  const relativePath = "tasks.md";
  const savedContents = new Map([
    [first.project.workspaceRoot, "- [ ] First project task\n"],
    [second.project.workspaceRoot, "- [ ] Second project task\n"],
  ]);
  const reads = Atom.family((key: string) => {
    const [cwd, path] = JSON.parse(key) as [string, string];
    return Atom.make(
      Effect.sync(() => {
        const contents = path === relativePath ? savedContents.get(cwd) : undefined;
        return {
          relativePath: path,
          contents: contents ?? "",
          byteLength: contents?.length ?? 0,
          truncated: false,
          exists: contents !== undefined,
        };
      }),
    );
  });
  using _readFile = vi
    .spyOn(projectEnvironment, "readFile")
    .mockImplementation(({ input }) => reads(JSON.stringify([input.cwd, input.relativePath])));
  let finishFirst!: () => void;
  const firstWrite = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });
  let finishSecond!: () => void;
  const secondWrite = new Promise<void>((resolve) => {
    finishSecond = resolve;
  });
  using writeFile = vi
    .spyOn(projectEnvironment.writeFile, "run")
    .mockImplementation(async (_registry, { input }) => {
      await (input.cwd === first.project.workspaceRoot ? firstWrite : secondWrite);
      savedContents.set(input.cwd, input.contents);
      return AsyncResult.success({ relativePath: input.relativePath });
    });

  for (const thread of [first, second]) {
    useRightPanelStore.getState().openFile(scopeThreadRef(ENVIRONMENT_ID, thread.id), relativePath);
  }
  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/${ENVIRONMENT_ID}/${first.id}`] }),
  );
  await router.load();
  await using app = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });
  const closeFile = page.getByRole("button", {
    name: chatMessages.closeNamedItem(relativePath),
    exact: true,
  });
  const pendingMarker = () => closeFile.element().querySelector("span[aria-hidden]");

  try {
    await expect.element(page.getByText("file-save-first: question 0")).toBeVisible();
    await page.getByRole("checkbox").click();
    await vi.waitFor(() => expect(pendingMarker()).not.toBeNull());

    await act(() =>
      router.navigate({
        to: "/$environmentId/$threadId",
        params: { environmentId: ENVIRONMENT_ID, threadId: second.id },
      }),
    );
    await expect.element(page.getByText("file-save-second: question 0")).toBeVisible();
    await page.getByRole("checkbox").click();
    await vi.waitFor(() => expect(pendingMarker()).not.toBeNull());

    await act(() => finishFirst());
    await vi.waitFor(() =>
      expect(
        getUnsavedProjectFileQueryData(ENVIRONMENT_ID, first.project.workspaceRoot, relativePath),
      ).toBeNull(),
    );
    expect.soft(pendingMarker()).not.toBeNull();
    expect(
      getUnsavedProjectFileQueryData(ENVIRONMENT_ID, second.project.workspaceRoot, relativePath)
        ?.contents,
    ).toBe("- [x] Second project task\n");

    await act(() =>
      router.navigate({
        to: "/$environmentId/$threadId",
        params: { environmentId: ENVIRONMENT_ID, threadId: first.id },
      }),
    );
    await expect.element(page.getByText("file-save-first: question 0")).toBeVisible();
    await expect.element(page.getByRole("checkbox")).toBeChecked();
    expect(pendingMarker()).toBeNull();
  } finally {
    await app.unmount();
    await act(async () => {
      finishFirst();
      finishSecond();
      await Promise.all(writeFile.mock.results.map((result) => result.value));
    });
  }
});
