import {
  EnvironmentId,
  SourceControlProviderKind,
  ThreadId,
  type TerminalAgentStatus,
} from "@t3tools/contracts";
import {
  combineTerminalSessionState,
  EMPTY_TERMINAL_BUFFER_STATE,
  type KnownTerminalSession,
} from "@t3tools/client-runtime/state/terminal";
import { ProjectId, type PullRequestSummary, type VcsStatusResult } from "@t3tools/contracts";
import { describe, expect, it } from "@effect/vitest";

import {
  resolveDisplayedThreadPr,
  resolveDisplayedThreadPrProvider,
  terminalStatusFromSessions,
} from "./ThreadStatusIndicators";
import { newestPullRequestSummary } from "../state/pullRequests";
import { sidebarKo } from "../locales/ko/sidebar";

it("targets the running terminal needing attention and keeps unknown distinct", () => {
  const session = (
    terminalId: string,
    agentStatus?: TerminalAgentStatus,
    hasRunningSubprocess = true,
  ): KnownTerminalSession => ({
    target: {
      environmentId: EnvironmentId.make("remote-environment"),
      threadId: ThreadId.make("thread"),
      terminalId,
    },
    state: combineTerminalSessionState(
      {
        threadId: "thread",
        terminalId,
        cwd: "/project",
        worktreePath: null,
        status: "running",
        pid: 123,
        exitCode: null,
        exitSignal: null,
        hasRunningSubprocess,
        label: terminalId,
        updatedAt: "2026-11-18T00:00:00.000Z",
        ...(agentStatus ? { agentStatus } : {}),
      },
      EMPTY_TERMINAL_BUFFER_STATE,
    ),
  });
  const shell = session("shell");
  const working = session("claude", {
    provider: "claude",
    state: "working",
    source: "terminal-screen",
  });
  const blocked = session("codex", {
    provider: "codex",
    state: "blocked",
    source: "terminal-screen",
  });
  const unknown = session("unknown", {
    provider: "codex",
    state: "unknown",
    source: "terminal-screen",
  });
  const exited = session(
    "exited",
    { provider: "codex", state: "blocked", source: "terminal-screen" },
    false,
  );

  expect(terminalStatusFromSessions([shell, working, unknown, blocked, exited])).toMatchObject({
    terminalId: "codex",
    label: sidebarKo.terminalAgentState("codex", "blocked", 4),
    pulse: false,
  });
  expect(terminalStatusFromSessions([shell, working, unknown])).toMatchObject({
    terminalId: "claude",
    pulse: true,
  });
  expect(terminalStatusFromSessions([shell, unknown])).toMatchObject({
    terminalId: "unknown",
    label: sidebarKo.terminalAgentState("codex", "unknown", 2),
    pulse: false,
  });
  expect(terminalStatusFromSessions([exited])).toBeNull();
});

function status(overrides: Partial<VcsStatusResult> = {}): VcsStatusResult {
  return {
    isRepo: true,
    hasPrimaryRemote: true,
    isDefaultRef: false,
    refName: "feature/current",
    hasWorkingTreeChanges: false,
    workingTree: { files: [], insertions: 0, deletions: 0 },
    hasUpstream: true,
    aheadCount: 0,
    behindCount: 0,
    pr: {
      number: 42,
      title: "PR branch",
      url: "https://github.com/pingdotgg/t3code/pull/42",
      baseRef: "main",
      headRef: "feature/current",
      state: "open",
    },
    ...overrides,
  };
}

function mergedFeaturePr(): NonNullable<VcsStatusResult["pr"]> {
  return {
    number: 42,
    title: "Feature PR",
    url: "https://github.com/pingdotgg/t3code/pull/42",
    baseRef: "main",
    headRef: "feature/current",
    state: "merged",
  };
}

function pullRequestSummary(
  state: PullRequestSummary["state"],
  updatedAt: string,
): PullRequestSummary {
  return {
    provider: SourceControlProviderKind.make("github"),
    projectId: ProjectId.make("project-1"),
    repository: "pingdotgg/t3code",
    number: 42,
    title: "Feature PR",
    url: "https://github.com/pingdotgg/t3code/pull/42",
    state,
    headBranch: "feature/current",
    baseBranch: "main",
    updatedAt,
  };
}

describe("shared pull request state", () => {
  it("never lets a stale open response regress a merged observation", () => {
    const merged = pullRequestSummary("merged", "2026-09-03T01:01:00.000Z");
    const staleOpen = pullRequestSummary("open", "2026-09-03T01:00:00.000Z");

    expect(newestPullRequestSummary(merged, staleOpen)).toBe(merged);
  });

  it("accepts a newer open state after a closed pull request is reopened", () => {
    const closed = pullRequestSummary("closed", "2026-09-03T01:00:00.000Z");
    const reopened = pullRequestSummary("open", "2026-09-03T01:01:00.000Z");

    expect(newestPullRequestSummary(closed, reopened)).toBe(reopened);
  });
});

describe("resolveDisplayedThreadPr", () => {
  const featureBranch = "feature/current";
  const mergedPr = mergedFeaturePr();
  const linkedPullRequest = {
    projectId: ProjectId.make("project-1"),
    repository: "pingdotgg/t3code",
    number: 42,
    url: "https://github.com/pingdotgg/t3code/pull/42",
  };
  const provider = {
    kind: SourceControlProviderKind.make("github"),
    name: "GitHub",
    baseUrl: "https://github.com",
  };

  it("shows a linked pull request when the checkout has a different branch", () => {
    const input = {
      threadBranch: "feature/other",
      gitStatus: status({ refName: "feature/other", pr: null }),
      linkedPullRequest,
      linkedPullRequestStatus: { pr: mergedPr, sourceControlProvider: provider },
    };

    expect(resolveDisplayedThreadPr(input)).toEqual(mergedPr);
    expect(resolveDisplayedThreadPrProvider(input)).toEqual(provider);
  });

  it("never attaches a PR reported by main to the feature thread", () => {
    const mainPr = {
      number: 99,
      title: "Unrelated main PR",
      url: "https://github.com/pingdotgg/t3code/pull/99",
      baseRef: "develop",
      headRef: "main",
      state: "merged" as const,
    };
    expect(
      resolveDisplayedThreadPr({
        threadBranch: featureBranch,
        gitStatus: status({ refName: "main", pr: mainPr }),
      }),
    ).toBeNull();
  });
});
