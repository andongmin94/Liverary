import type { ThreadId, WorktreeSetupSnapshot } from "@t3tools/contracts";

/** Retain progress across stream handoffs without confusing separate preparation attempts. */
export function resolveWorktreeSetupSnapshot(
  threadId: ThreadId | null,
  latest: WorktreeSetupSnapshot | null | undefined,
  held: WorktreeSetupSnapshot | null,
): WorktreeSetupSnapshot | null {
  const current = latest?.threadId === threadId ? latest : null;
  const previous = held?.threadId === threadId ? held : null;
  if (!current) return previous;
  if (!previous) return current;
  // The server resets sequences after finished snapshots expire; startedAt identifies the attempt.
  return current.startedAt > previous.startedAt ||
    (current.startedAt === previous.startedAt && current.sequence >= previous.sequence)
    ? current
    : previous;
}

export function resolveVisibleWorktreeSetup(input: {
  live: WorktreeSetupSnapshot | null;
  recorded: WorktreeSetupSnapshot | null;
  turnStarted: boolean;
  followUpSent: boolean;
}): WorktreeSetupSnapshot | null {
  const snapshot = resolveWorktreeSetupSnapshot(
    input.live?.threadId ?? input.recorded?.threadId ?? null,
    input.live,
    input.recorded,
  );
  if (!snapshot) return null;
  if (snapshot.phase === "running") return snapshot;
  if (input.followUpSent) return null;
  if (snapshot.phase !== "done") return snapshot;
  if (!input.turnStarted) return snapshot;
  return snapshot.stages.some((stage) => stage.status === "failed") ? snapshot : null;
}

export function worktreeSetupAgentStarted(snapshot: WorktreeSetupSnapshot): boolean {
  return snapshot.stages.some((stage) => stage.id === "agent" && stage.status === "done");
}
