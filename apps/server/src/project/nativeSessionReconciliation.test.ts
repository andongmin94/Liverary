import { expect, it } from "vite-plus/test";
import { nativeLifecycleChange, reconcileNativeMessages } from "./nativeSessionReconciliation.ts";

it("keeps an unchanged native state from undoing a local archive and distinguishes deletion", () => {
  expect(nativeLifecycleChange("archived", "active", "active", false)).toBeUndefined();
  expect(nativeLifecycleChange("archived", "archived", "active", false)).toBe("active");
  expect(nativeLifecycleChange("active", "active", "deleted", false)).toBe("deleted");
  expect(nativeLifecycleChange("active", "active", "archived", true)).toBeUndefined();
  expect(nativeLifecycleChange("deleted", "archived", "active", false)).toBeUndefined();
});

it("links existing messages once and retains a later repeated external message", () => {
  const existing = [{ id: "local-user", role: "user" as const, text: "Continue" }];
  const message = {
    id: "native-1",
    role: "user" as const,
    text: "Continue",
    createdAt: "2026-11-12T00:00:00Z",
  };
  const first = reconcileNativeMessages({
    messages: [message],
    existing,
    seen: [],
    nativeItems: [],
    nativeTurns: [],
  });
  expect(first.append).toEqual([]);
  expect(first.acknowledgements).toEqual([{ nativeId: "native-1", messageId: "local-user" }]);
  const next = reconcileNativeMessages({
    messages: [message, { ...message, id: "native-2" }],
    existing,
    seen: first.acknowledgements,
    nativeItems: [],
    nativeTurns: [],
  });
  expect(next.append.map((entry) => entry.id)).toEqual(["native-2"]);
});

it("recognizes a locally completed native turn without importing its injected context again", () => {
  const result = reconcileNativeMessages({
    messages: [
      {
        id: "handoff",
        turnId: "turn-local",
        role: "user",
        text: "Context from another provider",
        createdAt: "2026-11-12T00:00:00Z",
      },
      {
        id: "reply",
        turnId: "turn-external",
        role: "assistant",
        text: "Updated in the original app",
        createdAt: "2026-11-12T00:01:00Z",
      },
    ],
    existing: [],
    seen: [],
    nativeItems: [],
    nativeTurns: [{ nativeId: "turn-local", userMessageId: "local-user" }],
  });
  expect(result.append.map((entry) => entry.id)).toEqual(["reply"]);
});
