import {
  managedCapabilityDenial as capabilityDenial,
  managedRuntimeModeDenial as runtimeModeDenial,
  managedUpdatesDenial as updatesDenial,
  type ManagedPolicySummary,
  type RuntimeMode,
} from "@t3tools/contracts";

const runtimeModes: Record<RuntimeMode, string> = {
  "approval-required": "승인 필요",
  "auto-accept-edits": "파일 수정 자동 승인",
  auto: "자동",
  "full-access": "전체 접근",
};
const capabilities = {
  remoteClients: "다른 기기에서 연결",
  connect: "T3 Connect",
  webhookTasks: "웹훅 작업",
  browserCookieImport: "브라우저 쿠키 가져오기",
};
export const managedUpdatesMessage = (organization: string) =>
  `${organization}에서 Liverary 업데이트를 관리합니다.`;
export const managedNightlyDeniedMessage = (organization: string) =>
  `${managedUpdatesMessage(organization)} 정식 릴리스만 설치할 수 있습니다.`;
export const managedRuntimeModeCeilingMessage = (organization: string, ceiling: RuntimeMode) =>
  `${organization}에서 대화 권한을 '${runtimeModes[ceiling]}' 이하로 제한합니다.`;
export function managedRuntimeModeDenial(
  summary: ManagedPolicySummary | undefined,
  mode: RuntimeMode,
) {
  const denial = runtimeModeDenial(summary, mode);
  return denial === undefined || summary?.limits?.maxRuntimeMode === undefined
    ? denial
    : managedRuntimeModeCeilingMessage(summary.organization, summary.limits.maxRuntimeMode);
}
export function managedCapabilityDenial(
  summary: ManagedPolicySummary | undefined,
  capability: keyof typeof capabilities,
) {
  const denial = capabilityDenial(summary, capability);
  return denial === undefined || summary === undefined
    ? denial
    : `${summary.organization} 정책에서 '${capabilities[capability]}' 기능을 허용하지 않습니다.`;
}
export function managedUpdatesDenial(summary: ManagedPolicySummary | undefined) {
  const denial = updatesDenial(summary);
  return denial === undefined || summary === undefined
    ? denial
    : managedUpdatesMessage(summary.organization);
}

export const managedBy = (organization: string) => `${organization}에서 관리합니다.`;

export const browserCookieImportPolicyUnreadable = (path: string) =>
  `${path}의 관리 정책을 읽을 수 없어 브라우저 쿠키를 가져올 수 없습니다.`;
export const browserCookieImportDenied = (organization: string) =>
  `${organization} 정책에서 브라우저 쿠키 가져오기를 허용하지 않습니다.`;
