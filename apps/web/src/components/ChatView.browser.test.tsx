import { createMemoryHistory } from "@tanstack/react-router";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { ThreadId } from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { AppRoot } from "~/AppRoot";
// The route loads ChatView lazily, and its first transform (React Compiler over ~4k lines)
// takes 6-11s; importing it here keeps that out of the test's timeout.
import "~/components/ChatView";
import { DraftId, useComposerDraftStore } from "~/composerDraftStore";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import { chatKo } from "~/locales/ko/chat";
import { getRouter } from "~/router";
import { runMobileComposerTransition } from "./chat/draftHeroTransition";
import {
  ENVIRONMENT_ID,
  PROJECT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { act, render } from "../../test/render";

// The socket is the only fake layer; see test/appScenarios.renders.tsx.
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

vi.mock(import("./chat/draftHeroTransition"), async (original) => {
  const actual = await original();
  return { ...actual, runMobileComposerTransition: vi.fn(actual.runMobileComposerTransition) };
});

// Preload the app's split UI modules, as static imports would, before the draft scenarios.
{
  const router = getRouter(createMemoryHistory());
  await Promise.all([
    router.loadRouteChunk(router.routesById.__root__),
    router.loadRouteChunk(router.routesById["/_chat"]),
    router.loadRouteChunk(router.routesById["/_chat/draft/$draftId"]),
  ]);
}

it("a new draft does not load its reserved thread before the server lists it", async () => {
  using _environment = installFakeEnvironment([]);
  using fetchSpy = vi.spyOn(globalThis, "fetch");
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const draftId = DraftId.make("draft-27443");
  const threadId = ThreadId.make("thread-27443");
  useComposerDraftStore
    .getState()
    .setProjectDraftThreadId(scopeProjectRef(ENVIRONMENT_ID, PROJECT_ID), draftId, { threadId });

  const router = getRouter(createMemoryHistory({ initialEntries: [`/draft/${draftId}`] }));
  await router.load();
  await using _app = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });
  await expect.element(page.getByTestId("composer-editor")).toBeVisible();
  // The shell snapshot has arrived once the sidebar lists the project, so the connection is up.
  await expect.element(page.getByText("render", { exact: true }).first()).toBeVisible();

  const threadRequests = fetchSpy.mock.calls
    .map(([input]) => String(input instanceof Request ? input.url : input))
    .filter((url) => url.includes(`/api/orchestration/threads/${threadId}/`));
  // A 404 here marks the thread deleted, and the view never loads it once the send creates it.
  expect(threadRequests).toEqual([]);
});

it("sends the submitted snapshot while keeping edits made during an asynchronous send", async () => {
  using _environment = installFakeEnvironment([]);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const draftId = DraftId.make("draft-pending-send");
  const store = useComposerDraftStore.getState();
  store.setProjectDraftThreadId(scopeProjectRef(ENVIRONMENT_ID, PROJECT_ID), draftId, {
    threadId: ThreadId.make("thread-pending-send"),
    envMode: "local",
  });
  const router = getRouter(createMemoryHistory({ initialEntries: [`/draft/${draftId}`] }));
  await router.load();
  await using _app = await render(<AppRoot router={router} />, { router: false });
  const editor = page.getByTestId("composer-editor");
  await expect.element(editor).toBeVisible();
  await expect.element(page.getByText("render", { exact: true }).first()).toBeVisible();
  await editor.fill("Original submitted message");

  // Sending also awaits attachment uploads; hold the existing hero transition at the next
  // async boundary so the real send and editable composer can run without upload mocks.
  let releaseTransition = () => {};
  const transition = new Promise<void>((resolve) => {
    releaseTransition = resolve;
  });
  let finishDock: (() => void | Promise<void>) | undefined;
  vi.mocked(runMobileComposerTransition).mockImplementationOnce((update) => {
    finishDock = update;
    return transition;
  });
  try {
    await page.getByRole("button", { name: chatKo["Submit message"], exact: true }).click();
    await vi.waitFor(() => expect(finishDock).toBeDefined());
    await editor.fill("Newer draft typed while sending");
    await act(async () => {
      await finishDock!();
      releaseTransition();
    });

    await expect
      .element(page.getByText("Original submitted message", { exact: true }))
      .toBeVisible();
    await expect.element(editor).toHaveTextContent("Newer draft typed while sending");
    expect(store.getComposerDraft(draftId)?.prompt).toBe("Newer draft typed while sending");
  } finally {
    releaseTransition();
  }
});

it("opens the thread actions menu for an older settled thread the shell leaves out", async () => {
  const thread = { ...threadWithHistory("older-settled", 1), olderSettled: true as const };
  using _environment = installFakeEnvironment([thread]);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });

  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/${ENVIRONMENT_ID}/${thread.id}`] }),
  );
  await router.load();
  await using _app = await render(<AppRoot router={router} />, {
    // AppRoot brings its own router.
    router: false,
  });
  await expect.element(page.getByText("older-settled: question 0")).toBeVisible();

  await page.getByRole("button", { name: `${thread.title} 대화 작업` }).click();
  // Without a bound the poll runs to the test deadline and reports a bare timeout.
  await expect
    .element(page.getByRole("menuitem", { name: "대화 이름 변경" }), { timeout: 5_000 })
    .toBeVisible();
});
