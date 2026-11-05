export const chatMessages = {
  placeholder: "무엇이든 물어보세요. @ 파일, $ 스킬, / 명령",
  openIn: (editor: string) => `${editor}에서 열기`,
  summarizeAndSend: (tokens: string | null) => `기록 ${tokens}토큰을 요약한 뒤 전송`,
  compactBeforeSend: (tokens: string) => `전송 전에 기록 ${tokens}토큰 요약`,
  nextSendKeepsHistory: (tokens: string) => `다음 전송에서 기록 ${tokens}토큰을 모두 유지합니다.`,
  nextSendCompactsHistory: (tokens: string) =>
    `다음 전송에서 기록 ${tokens}토큰을 먼저 요약합니다.`,
  dispatchHint: (
    primary: "queue" | "steer",
    alternate: "queue" | "steer" | "restart",
    modifier: string,
    shortcut: string | null,
  ) => {
    const labels = { queue: "대기열에 추가", steer: "진행 중인 작업에 전달", restart: "새로 시작" };
    return `클릭하면 ${labels[primary]}, ${modifier}+클릭${shortcut ? ` 또는 ${shortcut}` : ""}하면 ${labels[alternate]}`;
  },
  resetsAt: (time: string) => `${time}에 사용량 한도 초기화`,
  resetTimeUnavailable: "초기화 시간을 확인할 수 없습니다. 직접 다시 시도해 주세요.",
  snoozeFailed: "대화를 미루지 못했습니다",
  autoResumeFailed: "자동 재개 설정을 변경하지 못했습니다",
  saving: "저장 중…",
  cancelAutoResume: "자동 재개 취소",
  resumeAtReset: "초기화 후 재개",
  wakeNow: "지금 다시 표시",
  snoozeUntilReset: "초기화까지 미루기",
} as const;

const connectionMessages: Record<string, string> = {
  "This device is still loading its T3 Connect sign-in":
    "이 기기에서 T3 Connect 로그인 정보를 불러오는 중입니다",
  "Wait a moment. Liverary retries on its own.":
    "잠시 기다려 주세요. Liverary가 자동으로 다시 시도합니다.",
  "If it keeps waiting, reload or restart Liverary on this device.":
    "계속 대기 중이면 이 기기에서 Liverary를 새로고침하거나 다시 시작하세요.",
};
export const localizeConnectionMessage = (message: string) =>
  connectionMessages[message] ?? message;
