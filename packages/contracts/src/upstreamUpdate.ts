import * as Schema from "effect/Schema";

import { ProjectId, ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { ModelSelection } from "./modelSelection.ts";
import type { ServerProvider } from "./server.ts";

const CommitSha = Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/));
const UpstreamUpdateRelease = Schema.Struct({
  tag: TrimmedNonEmptyString,
  sha: CommitSha,
  url: TrimmedNonEmptyString,
});

export const UpstreamUpdateCheckInput = Schema.Struct({});
export const UpstreamUpdateCheckResult = Schema.Struct({
  status: Schema.Literals(["up-to-date", "available", "pending"]),
  upstream: UpstreamUpdateRelease,
  published: UpstreamUpdateRelease,
  integrated: Schema.Boolean,
  releaseRequested: Schema.Boolean,
});
export type UpstreamUpdateCheckResult = typeof UpstreamUpdateCheckResult.Type;

export const UpstreamUpdateLaunchInput = Schema.Struct({
  projectId: ProjectId,
  modelSelection: ModelSelection,
  upstreamSha: CommitSha,
});
export type UpstreamUpdateLaunchInput = typeof UpstreamUpdateLaunchInput.Type;

export const UpstreamUpdateLaunchResult = Schema.Struct({
  threadId: ThreadId,
  resumed: Schema.Boolean,
});
export type UpstreamUpdateLaunchResult = typeof UpstreamUpdateLaunchResult.Type;

const errorMessages = {
  "github-unavailable": "GitHub에서 업데이트 정보를 확인하지 못했습니다. 잠시 후 다시 시도하세요.",
  "invalid-release": "정식 릴리스 정보를 확인할 수 없습니다. 업데이트를 시작하지 않았습니다.",
  "source-project-not-found": "업데이트할 소스 프로젝트를 찾을 수 없습니다.",
  "source-repository-mismatch": "andongmin94/t3-custom 소스 저장소 프로젝트를 선택하세요.",
  "source-checkout-dirty":
    "소스 프로젝트에 커밋하지 않은 변경이 있습니다. 변경을 커밋하거나 별도 체크아웃을 선택한 뒤 다시 시도하세요.",
  "source-checkout-unavailable": "소스 프로젝트의 Git 상태를 확인하지 못했습니다.",
  "provider-not-supported":
    "구독 계정으로 로그인한 사용 가능한 Codex 또는 Claude Code를 선택하세요.",
  "model-unavailable": "선택한 모델을 사용할 수 없습니다. 모델 목록을 확인하세요.",
  "release-changed": "확인한 뒤 원본 정식 릴리스가 변경되었습니다. 업데이트를 다시 확인하세요.",
  "up-to-date": "최신 원본 정식 릴리스가 이미 발행되어 있습니다.",
  "existing-thread-unavailable": "기존 업데이트 대화를 찾을 수 없습니다. 대화 목록을 확인하세요.",
  "launch-failed": "업데이트 대화를 시작하지 못했습니다. 환경 연결과 제공자 상태를 확인하세요.",
} as const;

export class UpstreamUpdateError extends Schema.TaggedError<UpstreamUpdateError>()(
  "UpstreamUpdateError",
  {
    reason: Schema.Literals(Object.keys(errorMessages) as Array<keyof typeof errorMessages>),
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return errorMessages[this.reason];
  }
}

const CLAUDE_SUBSCRIPTION_TYPES = new Set([
  "free",
  "pro",
  "max",
  "maxplan",
  "max5",
  "max20",
  "team",
  "enterprise",
  "claudefreesubscription",
  "claudeprosubscription",
  "claudemaxsubscription",
  "claudemax5xsubscription",
  "claudemax20xsubscription",
  "claudeteamsubscription",
  "claudeenterprisesubscription",
]);

export function isLiveraryUpdateProvider(provider: ServerProvider): boolean {
  if (
    !provider.enabled ||
    !provider.installed ||
    provider.status !== "ready" ||
    provider.availability === "unavailable" ||
    provider.auth.status !== "authenticated"
  )
    return false;
  if (provider.driver === "codex") return provider.auth.type === "chatgpt";
  return (
    provider.driver === "claudeAgent" &&
    CLAUDE_SUBSCRIPTION_TYPES.has(provider.auth.type?.toLowerCase().replace(/[\s_-]+/g, "") ?? "")
  );
}
