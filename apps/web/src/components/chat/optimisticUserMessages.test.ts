import { EnvironmentId, MessageId, ThreadId } from "@t3tools/contracts";
import { AtomRegistry } from "effect/reactivity";
import { describe, expect, it, vi } from "vite-plus/test";

import type { ChatMessage } from "../../types";
import {
  applyOptimisticUserMessagesAction,
  createOptimisticBlobPreviews,
  dropOptimisticHandoff,
  emptyOptimisticUserMessages,
  loadedHandoffMessageIdsAtom,
  reconcileOptimisticUserMessages,
} from "./optimisticUserMessages";

const threadA = ThreadId.make("thread-a");
const threadB = ThreadId.make("thread-b");
const environmentA = EnvironmentId.make("environment-a");
const environmentB = EnvironmentId.make("environment-b");

function message(id: string, previewUrl?: string): ChatMessage {
  return {
    id: MessageId.make(id),
    role: "user",
    text: id,
    runId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    streaming: false,
    ...(previewUrl
      ? {
          attachments: [
            {
              type: "image",
              id: `${id}-image`,
              name: "image.png",
              mimeType: "image/png",
              sizeBytes: 1,
              previewUrl,
            },
          ],
        }
      : {}),
  } as ChatMessage;
}

const ids = (...values: string[]) => new Set(values.map((value) => MessageId.make(value)));

describe("optimistic user messages", () => {
  it("an acknowledged message stays gone after the server drops its row", () => {
    let state = applyOptimisticUserMessagesAction(
      emptyOptimisticUserMessages(threadA, environmentA),
      threadA,
      [message("m1"), message("m2", "blob:two")],
      environmentA,
    );
    state = reconcileOptimisticUserMessages(state, threadA, ids("m1", "m2"), environmentA);
    expect(state.messages).toEqual([]);
    expect(state.handoff).toEqual({ m2: ["blob:two"] });

    // A cancelled queued run or a rewind removes the server's copy again.
    state = reconcileOptimisticUserMessages(state, threadA, ids(), environmentA);
    expect(state.messages).toEqual([]);

    expect(dropOptimisticHandoff(state, threadA, MessageId.make("m2"), environmentB)).toBe(state);
    state = dropOptimisticHandoff(state, threadA, MessageId.make("m2"), environmentA);
    expect(state.handoff).toEqual({});
  });

  it("releases the previous thread's messages when the thread or environment changes", () => {
    for (const [threadId, environmentId] of [
      [threadB, environmentA],
      [threadA, environmentB],
    ] as const) {
      let state = applyOptimisticUserMessagesAction(
        emptyOptimisticUserMessages(threadA, environmentA),
        threadA,
        [message("a1")],
        environmentA,
      );
      state = reconcileOptimisticUserMessages(state, threadId, ids(), environmentId);
      state = reconcileOptimisticUserMessages(state, threadA, ids(), environmentA);
      expect(state).toEqual(emptyOptimisticUserMessages(threadA, environmentA));
    }
  });

  it("drops a late update for a thread the view has left", () => {
    for (const [threadId, environmentId] of [
      [threadB, environmentA],
      [threadA, environmentB],
    ] as const) {
      const state = reconcileOptimisticUserMessages(
        applyOptimisticUserMessagesAction(
          emptyOptimisticUserMessages(threadA, environmentA),
          threadA,
          [message("a1")],
          environmentA,
        ),
        threadId,
        ids(),
        environmentId,
      );
      expect(applyOptimisticUserMessagesAction(state, threadA, [message("a2")], environmentA)).toBe(
        state,
      );
    }
  });

  it("revokes a thread's blob previews once, when their use ends or the thread is left", () => {
    using revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const previews = createOptimisticBlobPreviews();
    previews.track(threadA, message("a1", "blob:a1"), environmentA);
    previews.track(threadA, message("a2", "blob:a2"), environmentA);
    previews.track(threadB, message("b1", "blob:b1"), environmentA);
    previews.track(threadA, message("other-a1", "blob:other-a1"), environmentB);

    previews.revoke(threadA, ["blob:a1"], environmentA);
    previews.revokeThread(threadA, environmentA);
    expect(revoke.mock.calls.map(([url]) => url)).toEqual(["blob:a1", "blob:a2"]);
    previews.revokeThread(threadA, environmentB);
    expect(revoke.mock.calls.map(([url]) => url)).toEqual(["blob:a1", "blob:a2", "blob:other-a1"]);
  });

  it("a send that fails after the server acknowledged it leaves the handed-off previews shown", () => {
    using revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const previews = createOptimisticBlobPreviews();
    const sent = message("m1", "blob:m1");
    previews.track(threadA, sent, environmentA);
    let state = applyOptimisticUserMessagesAction(
      emptyOptimisticUserMessages(threadA, environmentA),
      threadA,
      [sent],
      environmentA,
    );
    state = reconcileOptimisticUserMessages(state, threadA, ids("m1"), environmentA);
    previews.handOff(state);

    previews.release(threadA, sent, environmentA);
    expect(revoke).not.toHaveBeenCalled();

    previews.revokeThread(threadA, environmentA);
    expect(revoke.mock.calls.map(([url]) => url)).toEqual(["blob:m1"]);
  });

  it("a send that fails before acknowledgement revokes its previews", () => {
    using revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const previews = createOptimisticBlobPreviews();
    const sent = message("m1", "blob:m1");
    previews.track(threadA, sent, environmentA);
    const state = applyOptimisticUserMessagesAction(
      emptyOptimisticUserMessages(threadA, environmentA),
      threadA,
      [sent],
      environmentA,
    );
    previews.handOff(reconcileOptimisticUserMessages(state, threadA, ids(), environmentA));

    previews.release(threadA, sent, environmentA);
    expect(revoke.mock.calls.map(([url]) => url)).toEqual(["blob:m1"]);
  });
});

class FakeImage {
  static readonly created: FakeImage[] = [];
  src = "";
  private readonly listeners = new Map<string, () => void>();
  constructor() {
    FakeImage.created.push(this);
  }
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }
  fire(type: "load" | "error") {
    this.listeners.get(type)?.();
  }
}

describe("handoff preloads", () => {
  it("reports a handoff loaded, and revokes its blobs, once every server preview loads", async () => {
    vi.stubGlobal("Image", FakeImage);
    try {
      using revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
      FakeImage.created.length = 0;
      const registry = AtomRegistry.make();
      const atom = loadedHandoffMessageIdsAtom(
        JSON.stringify([
          ["m-loaded", ["https://server/a.png", "https://server/b.png"], ["blob:a", "blob:b"]],
          ["m-failed", ["https://server/c.png"], ["blob:c"]],
        ]),
      );
      const release = registry.mount(atom);
      const image = (src: string) => FakeImage.created.find((candidate) => candidate.src === src);

      image("https://server/a.png")?.fire("load");
      image("https://server/c.png")?.fire("error");
      await Promise.resolve();
      expect(registry.get(atom)).toEqual([]);

      image("https://server/b.png")?.fire("load");
      await vi.waitFor(() => expect(registry.get(atom)).toEqual(["m-loaded"]));
      expect(revoke.mock.calls.map(([url]) => url)).toEqual(["blob:a", "blob:b"]);
      release();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
