import type {
  NativeSessionMessage,
  NativeSessionState,
} from "@t3tools/provider-core/server/nativeSessions";

export function nativeLifecycleChange(
  local: NativeSessionState,
  previous: NativeSessionState | undefined,
  current: NativeSessionState,
  pending: boolean,
): NativeSessionState | undefined {
  if (pending || local === "deleted" || local === current || previous === current) return;
  // A newly discovered active transcript must not undo a local archive.
  if (previous === undefined && current === "active") return;
  return current;
}

export interface NativeMessageAcknowledgement {
  readonly nativeId: string;
  readonly messageId: string | null;
}

export function reconcileNativeMessages(input: {
  readonly messages: ReadonlyArray<NativeSessionMessage>;
  readonly existing: ReadonlyArray<{
    readonly id: string;
    readonly role: string;
    readonly text: string;
  }>;
  readonly seen: ReadonlyArray<NativeMessageAcknowledgement>;
  readonly nativeItems: ReadonlyArray<{
    readonly nativeId: string;
    readonly messageId: string | null;
  }>;
  readonly nativeTurns: ReadonlyArray<{
    readonly nativeId: string;
    readonly userMessageId: string | null;
  }>;
}) {
  const seen = new Set(input.seen.map((entry) => entry.nativeId));
  const claimed = new Set(
    input.seen.flatMap((entry) => (entry.messageId === null ? [] : [entry.messageId])),
  );
  const items = new Map(input.nativeItems.map((entry) => [entry.nativeId, entry.messageId]));
  const turns = new Map(input.nativeTurns.map((turn) => [turn.nativeId, turn.userMessageId]));
  const append: Array<NativeSessionMessage> = [];
  const acknowledgements: Array<NativeMessageAcknowledgement> = [];
  for (const message of input.messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    if (items.has(message.id)) {
      const messageId = items.get(message.id) ?? null;
      if (messageId !== null) claimed.add(messageId);
      acknowledgements.push({ nativeId: message.id, messageId });
      continue;
    }
    // Local turns already contain their user message, response and injected handoff.
    if (message.turnId !== undefined && turns.has(message.turnId)) {
      const messageId = message.role === "user" ? (turns.get(message.turnId) ?? null) : null;
      if (messageId !== null) claimed.add(messageId);
      acknowledgements.push({ nativeId: message.id, messageId });
      continue;
    }
    // Some SDKs give the submitted user message a new UUID. Bind each existing
    // message only once; a later identical external prompt must remain visible.
    const existing = input.existing.find(
      (candidate) =>
        !claimed.has(candidate.id) &&
        candidate.role === message.role &&
        candidate.text === message.text,
    );
    if (existing) {
      claimed.add(existing.id);
      acknowledgements.push({ nativeId: message.id, messageId: existing.id });
    } else {
      append.push(message);
    }
  }
  return { append, acknowledgements };
}
