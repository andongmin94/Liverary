import { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { PersistedAttachmentVerification } from "@t3tools/client-runtime/state/attachments";
import { useLayoutEffect } from "react";
import { expect, it, vi } from "vite-plus/test";

import { act, render } from "../../../test/render";

vi.mock("../../lib/attachmentUploadQueue", () => ({
  readAttachmentUpload: vi.fn(),
  releaseAttachmentUpload: vi.fn(),
  releasePersistedAttachmentUpload: vi.fn(),
  verifyStashedAttachmentUpload: vi.fn(),
}));
vi.mock("../ui/toast", () => ({ toastManager: { add: vi.fn() } }));

import { DraftId, useComposerDraftStore } from "../../composerDraftStore";
import { removeLocalStorageItem } from "../../hooks/useLocalStorage";
import { verifyStashedAttachmentUpload } from "../../lib/attachmentUploadQueue";
import { isMacPlatform } from "../../lib/utils";
import {
  PROMPT_STASH_STORAGE_KEY,
  type PromptStashEntry,
  usePromptStashStore,
  writePromptStashStorageForTest,
} from "../../promptStashStore";
import {
  addPreparingComposerImages,
  countPreparingComposerImages,
  removePreparingComposerImages,
} from "./preparingComposerImages";
import { useComposerStash } from "./useComposerStash";

type StashInput = Parameters<typeof useComposerStash>[0];
type StashActions = ReturnType<typeof useComposerStash>;

function Probe({ input, ready }: { input: StashInput; ready: (actions: StashActions) => void }) {
  const actions = useComposerStash(input);
  useLayoutEffect(() => ready(actions));
  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function stashInput(environmentId: EnvironmentId, draftId: DraftId): StashInput {
  return {
    environmentId,
    composerDraftTarget: draftId,
    promptRef: { current: "Keep this draft" },
    readAttachmentDraft: () =>
      useComposerDraftStore.getState().getComposerDraft(draftId) ?? { images: [], files: [] },
    readTerminalContexts: () => [],
    routeThreadRef: scopeThreadRef(environmentId, ThreadId.make(draftId)),
    projectSelectionRequired: false,
    pendingUserInputs: [],
    activePendingProgress: null,
    prompt: "Keep this draft",
    composerMenuOpen: false,
    isComposerCollapsedMobile: false,
    composerPreviewAnnotations: [],
    composerReviewComments: [],
    composerThreadContexts: [],
    attachmentTargetKey: draftId,
    isComposerDraftTargetOpen: (key) => key === draftId,
    composerEditorRef: { current: null },
    isRevertingCheckpoint: () => false,
    pendingThreadImportsRef: { current: new Map() },
    setComposerCursor: () => {},
    setComposerTrigger: () => {},
    importContextRecords: () => new Map(),
    expandMobileComposer: () => {},
  };
}

it("keeps a stash intact until its images finish saving, then restores the latest entry", async () => {
  const environmentId = EnvironmentId.make("stash-images-environment");
  const draftId = DraftId.make("stash-images-draft");
  const input = stashInput(environmentId, draftId);
  const store = useComposerDraftStore.getState();
  const stashStore = usePromptStashStore.getState();
  const entry: PromptStashEntry = {
    id: "stash-pending-images",
    createdAt: "2026-11-18T00:00:00.000Z",
    prompt: "Saved prompt",
    attachments: [],
    droppedImageNames: [],
    pendingImageCount: 1,
  };
  let actions!: StashActions;
  const ready = (value: StashActions) => {
    actions = value;
  };

  try {
    store.setProjectDraftThreadId(
      scopeProjectRef(environmentId, ProjectId.make("stash-images-project")),
      draftId,
    );
    store.setPrompt(draftId, input.promptRef.current);
    stashStore.stashEntry(entry);
    await using _screen = await render(<Probe input={input} ready={ready} />);

    await act(() => actions.restoreStashEntryStable(entry));
    expect(usePromptStashStore.getState().entries.find(({ id }) => id === entry.id)).toEqual(entry);
    expect(store.getComposerDraft(draftId)?.prompt).toBe("Keep this draft");

    await act(() => {
      stashStore.finalizeEntryImages(entry.id, {
        attachments: [
          {
            id: "saved-image",
            name: "screenshot.png",
            mimeType: "image/png",
            sizeBytes: 3,
            dataUrl: "data:image/png;base64,AQID",
          },
        ],
        droppedImageNames: [],
        unreadableImageNames: [],
      });
    });
    await act(() => actions.restoreStashEntryStable(entry));

    expect(usePromptStashStore.getState().entries.some(({ id }) => id === entry.id)).toBe(false);
    const draft = store.getComposerDraft(draftId)!;
    expect(draft.prompt).toBe("Keep this draft\n\nSaved prompt");
    expect(draft.images).toMatchObject([{ id: "saved-image", name: "screenshot.png" }]);
    expect(new Uint8Array(await draft.images[0]!.file.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  } finally {
    store.clearDraftThread(draftId);
    stashStore.takeEntry(entry.id);
  }
});

it.each([false, true])(
  "restores a verified stash only in the environment that requested it (switch: %s)",
  async (switchEnvironment) => {
    const firstEnvironment = EnvironmentId.make("stash-environment-a");
    const secondEnvironment = EnvironmentId.make("stash-environment-b");
    const draftId = DraftId.make(`stash-restore-${switchEnvironment}`);
    const threadId = ThreadId.make(draftId);
    const projectId = ProjectId.make("stash-project");
    const store = useComposerDraftStore.getState();
    const stashStore = usePromptStashStore.getState();
    const input = stashInput(firstEnvironment, draftId);
    const entry: PromptStashEntry = {
      id: `stash-entry-${switchEnvironment}`,
      createdAt: "2026-11-16T00:00:00.000Z",
      prompt: "Saved prompt",
      attachments: [],
      droppedImageNames: [],
      files: [
        {
          id: "stashed-file",
          name: "notes.txt",
          mimeType: "text/plain",
          sizeBytes: 5,
          attachmentId: "stashed-upload",
          environmentId: firstEnvironment,
        },
      ],
    };
    const verified = deferred<PersistedAttachmentVerification>();
    vi.mocked(verifyStashedAttachmentUpload).mockReset().mockReturnValue(verified.promise);
    let actions!: StashActions;
    const ready = (value: StashActions) => {
      actions = value;
    };
    try {
      store.setProjectDraftThreadId(scopeProjectRef(firstEnvironment, projectId), draftId);
      store.setPrompt(draftId, input.promptRef.current);
      stashStore.stashEntry(entry);
      await using screen = await render(<Probe input={input} ready={ready} />);
      let restoring!: Promise<void>;
      await act(async () => {
        restoring = actions.restoreStashEntryStable(entry);
      });

      const environmentId = switchEnvironment ? secondEnvironment : firstEnvironment;
      await act(async () => {
        store.setDraftThreadContext(draftId, {
          projectRef: scopeProjectRef(environmentId, projectId),
        });
      });
      await screen.rerender(
        <Probe
          input={{
            ...input,
            environmentId,
            routeThreadRef: scopeThreadRef(environmentId, threadId),
          }}
          ready={ready}
        />,
      );
      await act(async () => {
        verified.resolve({ status: "verified" });
        await restoring;
      });

      const retainedEntry = usePromptStashStore
        .getState()
        .entries.find(({ id }) => id === entry.id);
      const draft = store.getComposerDraft(draftId)!;
      if (switchEnvironment) {
        expect(retainedEntry).toEqual(entry);
        expect(draft.prompt).toBe("Keep this draft");
        expect(draft.files).toEqual([]);
      } else {
        expect(retainedEntry).toBeUndefined();
        expect(draft.prompt).toContain("Saved prompt");
        expect(draft.files).toMatchObject([
          {
            id: "stashed-file",
            uploadedAttachmentId: "stashed-upload",
            uploadEnvironmentId: firstEnvironment,
          },
        ]);
      }
    } finally {
      store.clearDraftThread(draftId);
      stashStore.takeEntry(entry.id);
    }
  },
);

function Harness({ input }: { input: StashInput }) {
  useComposerStash(input);
  return null;
}

it("keeps the draft when stashing while a pasted image is still compressing", async () => {
  const target = DraftId.make("stash-preparing-image");
  using _draft = {
    [Symbol.dispose]: () => useComposerDraftStore.getState().clearComposerContent(target),
  };
  using _stash = {
    [Symbol.dispose]: () => {
      writePromptStashStorageForTest("");
      removeLocalStorageItem(PROMPT_STASH_STORAGE_KEY);
    },
  };
  addPreparingComposerImages(target, [
    {
      id: "pasted",
      name: "shot.png",
      file: new File(["png"], "shot.png", { type: "image/png" }),
      hidden: false,
    },
  ]);
  using _preparing = {
    [Symbol.dispose]: () => removePreparingComposerImages(target, new Set(["pasted"])),
  };
  const environmentId = EnvironmentId.make("stash-env");
  const promptRef = { current: "Describe this screenshot" };
  const input = {
    environmentId,
    composerDraftTarget: target,
    promptRef,
    readAttachmentDraft: () => ({ images: [], files: [] }),
    readTerminalContexts: () => [],
    routeThreadRef: { environmentId, threadId: ThreadId.make("stash-thread") },
    projectSelectionRequired: false,
    pendingUserInputs: [],
    activePendingProgress: null,
    prompt: promptRef.current,
    composerMenuOpen: false,
    isComposerCollapsedMobile: false,
    composerPreviewAnnotations: [],
    composerReviewComments: [],
    composerThreadContexts: [],
    attachmentTargetKey: target,
    isComposerDraftTargetOpen: () => true,
    composerEditorRef: { current: null },
    isRevertingCheckpoint: () => false,
    pendingThreadImportsRef: { current: new Map() },
    setComposerCursor: vi.fn(),
    setComposerTrigger: vi.fn(),
    importContextRecords: () => new Map(),
    expandMobileComposer: vi.fn(),
  } satisfies StashInput;
  await using _screen = await render(<Harness input={input} />);

  const mod = isMacPlatform(navigator.platform) ? { metaKey: true } : { ctrlKey: true };
  await act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "s", ...mod, bubbles: true, cancelable: true }),
    );
  });

  expect(usePromptStashStore.getState().entries).toEqual([]);
  expect(promptRef.current).toBe("Describe this screenshot");
  expect(countPreparingComposerImages(target)).toBe(1);
});
