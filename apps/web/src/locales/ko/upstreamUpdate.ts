export const upstreamUpdateKo = {
  title: "T3 기능 업데이트",
  description: "최신 T3 정식 릴리스를 확인하고, 연결된 구독 모델로 Liverary에 반영합니다.",
  check: "업데이트 확인",
  checkDescription: "T3 정식 릴리스와 Liverary 설치본의 업데이트를 확인합니다.",
  checking: "T3 정식 릴리스를 확인하는 중…",
  checkFailed: "T3 정식 릴리스를 확인하지 못했습니다.",
  retry: "다시 확인",
  close: "닫기",
  noEnvironment: "업데이트를 확인할 실행 환경이 연결되어 있지 않습니다.",
  upToDate: "최신 T3 정식 릴리스가 발행된 Liverary에 반영되어 있습니다.",
  available: (tag: string) => `T3 ${tag} 업데이트를 반영할 수 있습니다.`,
  pending: "아직 발행되지 않은 업데이트가 있습니다. 에이전트가 이어서 확인합니다.",
  upstreamRelease: "최신 T3 정식 릴리스",
  publishedRelease: "발행된 Liverary",
  environment: "실행 환경",
  project: "소스 프로젝트",
  chooseProject: "Liverary 소스 프로젝트 선택",
  projectDescription:
    "andongmin94/t3-custom 소스 체크아웃을 선택하세요. 해당 환경에 저장소 푸시 권한이 필요합니다.",
  noProject:
    "이 환경에 소스 프로젝트가 없습니다. andongmin94/t3-custom 저장소를 프로젝트로 추가하세요.",
  addProject: "프로젝트 추가",
  providerModel: "구독 모델",
  noProvider:
    "이 프로젝트에서 사용할 수 있는 로그인된 Codex 또는 Claude 구독 모델이 없습니다. 제공자 설정에서 연결 상태를 확인하세요.",
  launch: "이 모델로 업데이트",
  launching: "업데이트 대화를 여는 중…",
  launchFailed: "업데이트 대화를 시작하지 못했습니다.",
  resumed: "기존 업데이트 대화를 열었습니다.",
  resumedDescription:
    "같은 업데이트를 위한 대화가 이미 있습니다. 그 대화의 기존 모델로 진행 상황을 확인하거나 작업을 계속할 수 있습니다.",
  permissionRequired: "이 환경에서 에이전트 작업을 시작할 권한이 없습니다.",
  launchDescription:
    "선택한 소스 체크아웃에서 병합, 한국어화, 검증, 커밋·푸시와 릴리스 확인을 진행합니다. 현재 권한 설정에 따른 승인과 진행 상황은 새 대화에서 확인할 수 있습니다.",
  binaryDescription:
    "새 Liverary 릴리스가 발행되면 기존 다운로드·설치 버튼으로 설치본을 업데이트할 수 있습니다.",
} as const;
