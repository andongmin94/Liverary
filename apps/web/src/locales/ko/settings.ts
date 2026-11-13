import {
  CLOUD_SPEECH_PROVIDER_NAMES,
  type CloudSpeechProvider,
  type STATIC_KEYBINDING_COMMANDS,
  type ScheduledTask,
} from "@t3tools/contracts";
import type { ThemeColorRole } from "@t3tools/shared/themePalettes";

export const settingsThemeColorLabels = {
  canvas: "배경",
  chrome: "창 배경",
  toolbar: "도구 모음 배경",
  toolbarForeground: "도구 모음 텍스트",
  toolbarBorder: "도구 모음 테두리",
  toolbarControl: "도구 모음 컨트롤",
  toolbarControlForeground: "도구 모음 컨트롤 텍스트",
  toolbarControlHover: "도구 모음 컨트롤에 마우스를 올렸을 때",
  surface: "표면",
  surfaceRaised: "떠 있는 표면",
  surfaceOverlay: "덮개 표면",
  text: "텍스트",
  textMuted: "보조 텍스트",
  border: "테두리",
  input: "입력",
  focus: "포커스",
  accent: "강조 색상",
  accentForeground: "강조 텍스트",
  secondary: "보조 배경",
  secondaryForeground: "보조 배경 텍스트",
  muted: "흐린 배경",
  mutedForeground: "흐린 텍스트",
  placeholder: "입력 안내",
  secondaryLabel: "보조 라벨",
  iconMuted: "보조 아이콘",
  error: "오류",
  errorForeground: "오류 텍스트",
  errorSurface: "오류 배경",
  warning: "경고",
  warningForeground: "경고 텍스트",
  warningSurface: "경고 배경",
  update: "업데이트",
  updateForeground: "업데이트 텍스트",
  updateSurface: "업데이트 배경",
  accentSurface: "강조 배경",
  accentSurfaceForeground: "강조 배경 텍스트",
  messageSurface: "메시지 배경",
  messageForeground: "메시지 텍스트",
  messageAction: "메시지 작업",
  messageActionForeground: "메시지 작업 텍스트",
  messageActionHover: "메시지 작업에 마우스를 올렸을 때",
  codeBackground: "코드 배경",
  codeForeground: "코드 텍스트",
  searchMatchBackground: "검색 결과 배경",
  searchMatchForeground: "검색 결과 텍스트",
  searchMatchActiveBackground: "현재 검색 결과 배경",
  searchMatchActiveForeground: "현재 검색 결과 텍스트",
  sidebar: "사이드바 배경",
  sidebarForeground: "사이드바 텍스트",
  sidebarMutedForeground: "사이드바 보조 텍스트",
  sidebarControlSurface: "사이드바 컨트롤 배경",
  sidebarRowHover: "사이드바 항목에 마우스를 올렸을 때",
  sidebarRowActive: "활성 사이드바 항목",
  sidebarRowSelected: "선택한 사이드바 항목",
  sidebarBorder: "사이드바 테두리",
  terminalBackground: "터미널 배경",
  terminalForeground: "터미널 텍스트",
  terminalCursor: "터미널 커서",
  terminalSelection: "터미널 선택 영역",
  terminalScrollbar: "터미널 스크롤 막대",
  terminalScrollbarHover: "터미널 스크롤 막대에 마우스를 올렸을 때",
} as const satisfies Record<ThemeColorRole, string>;

export const settingsText = {
  "Session sharing": "세션 공유",
  "Session sharing failed": "세션 공유를 완료하지 못했습니다",
  "Separate integration session store":
    "이 연동은 별도 세션 저장소를 사용합니다. 공급자의 데스크톱 앱·IDE 대화 목록과는 공유되지 않습니다.",
  "Shared sessions appear automatically":
    "이 연동에서 조회를 지원하는 세션과 대화 기록이 자동으로 표시됩니다.",
  "Session sharing unavailable": "이 연동에서는 외부 세션을 자동으로 조회하지 않습니다.",
  "Archive synchronization": "보관·복원",
  "Delete synchronization": "삭제",
  "Shared with the provider": "공급자에도 반영",
  "Local archive only": "Liverary에서만 변경 · 원래 앱의 보관은 해당 앱에서 처리",
  "Local delete only": "Liverary에서만 삭제 · 원래 앱의 삭제는 해당 앱에서 처리",
  "Native transcript deletion only":
    "로컬 대화 기록 삭제 · 별도 데스크톱·클라우드 목록은 해당 앱에서 삭제",
  "Use existing": "기존 모델 사용",
  "Already downloaded elsewhere? Paste the model file or folder path":
    "이미 다운로드한 모델 파일 또는 폴더의 경로를 붙여 넣으세요",
  "Path to a model file or folder already on this environment":
    "이 환경에 있는 모델 파일 또는 폴더 경로",
  "Could not use a model from that path": "해당 경로의 모델을 사용할 수 없습니다",
  "screen reader announcements": "화면 읽기 프로그램 알림",
  "What a screen reader hears from the open thread: a turn starting, needing you, and ending. Status and messages adds what the agent writes before its last message. Everything adds each step.":
    "열린 대화에서 작업이 시작되거나 입력이 필요하거나 작업이 끝나면 알려 줍니다. ‘상태와 메시지’는 에이전트의 중간 메시지도 읽고, ‘모두’는 각 작업 단계까지 읽습니다.",
  Everything: "모두",
  "Status and messages": "상태와 메시지",
  "Status only": "상태만",
  "Screen reader announcements": "화면 읽기 프로그램 알림",
  "Choose a machine": "기기 선택",
  "This app cannot confirm it is one of your machines. The pairing code you paste is sent there.":
    "이 주소가 내 기기 중 하나인지 확인할 수 없습니다. 붙여 넣은 페어링 코드는 그 주소로 전송됩니다.",
  "Check this address": "주소를 확인하세요",
  "Best all-around choice for English dictation": "영어 받아쓰기에 전반적으로 가장 적합한 모델",
  "Fast and accurate transcription in many European languages":
    "여러 유럽 언어를 빠르고 정확하게 받아쓰기",
  "Tiny, fast, and runs well on any hardware": "매우 작고 빠르며 모든 하드웨어에서 원활하게 실행",
  "Consistently strong in many languages, best for Greek and Polish":
    "여러 언어에서 고른 성능을 보이며 그리스어와 폴란드어에 가장 적합",
  "Broadest language support, but may run a bit slow":
    "가장 다양한 언어를 지원하지만 다소 느릴 수 있음",
  "Multilingual, very accurate in Italian and Spanish. Best on Apple Silicon or discrete GPUs":
    "다국어를 지원하며 이탈리아어와 스페인어의 정확도가 매우 높음. Apple Silicon 또는 외장 GPU에 적합",
  "Best accuracy across 25 European languages": "유럽 25개 언어에서 가장 높은 정확도",
  "Fast and accurate, great overall multilingual pick":
    "빠르고 정확하며 다국어 용도로 전반적으로 적합",
  "Excellent English only model, runs on any hardware":
    "영어 전용 고성능 모델로 모든 하드웨어에서 실행 가능",
  "Best for Chinese, Cantonese, and Asian languages with English":
    "중국어, 광둥어 및 영어가 섞인 아시아 언어에 가장 적합",
  "Best for Japanese, good at Thai, Indonesian, Malay":
    "일본어에 가장 적합하며 태국어, 인도네시아어, 말레이어도 우수",
  "Most accurate small model for European languages": "유럽 언어용 소형 모델 중 가장 높은 정확도",
  "Very accurate English. Slow without a GPU.": "영어 정확도가 매우 높음. GPU가 없으면 느림.",
  "Best for Arabic and Arabic/English speakers":
    "아랍어 및 아랍어와 영어를 함께 사용하는 화자에 가장 적합",
  "Good for Mandarin, English, Japanese": "중국어 표준어, 영어, 일본어에 적합",
  "Russian only.": "러시아어 전용.",
  "Best for Russian dictation. English may be unreliable.":
    "러시아어 받아쓰기에 가장 적합. 영어 정확도는 떨어질 수 있음.",
  "Extremely fast English transcription, best on GPU":
    "매우 빠른 영어 받아쓰기로 GPU 사용에 가장 적합",
  "Accurate with translation support. Best with GPU": "정확하며 번역 지원. GPU 사용에 가장 적합",
  "For clinicians dictating notes. Poor on general speech":
    "의료진의 기록 받아쓰기용. 일반 발화에는 부적합",
  "Tiny English model, virtually instant even on CPU":
    "매우 작은 영어 모델로 CPU에서도 거의 즉시 처리",
  "For overlapping speakers in meetings, not for solo dictation":
    "회의에서 여러 화자의 겹치는 발화용이며 단독 받아쓰기에는 부적합",
  "Top accuracy across languages. Best on Apple Silicon or a GPU":
    "여러 언어에서 최고 수준의 정확도. Apple Silicon 또는 GPU에 가장 적합",
  "Instant Mandarin, Japanese, Korean on any machine. Weak Cantonese":
    "모든 컴퓨터에서 중국어 표준어, 일본어, 한국어를 즉시 처리. 광둥어는 취약",
  "Accurate with translation support. Best on Apple Silicon or a GPU.":
    "정확하며 번역 지원. Apple Silicon 또는 GPU에 가장 적합.",
  "Wide language support in a relatively small model.": "비교적 작은 모델로 다양한 언어 지원.",
  "Accurate in many languages. Slow without a GPU":
    "여러 언어에서 정확도가 높음. GPU가 없으면 느림",
  "Taiwan Mandarin with English mixed in. Traditional script, no punctuation":
    "영어가 섞인 대만 중국어 표준어용. 번체로 출력하며 문장부호 없음",
  "Most languages at usable accuracy. Best on Apple Silicon or a GPU.":
    "대부분의 언어에서 실용적인 정확도. Apple Silicon 또는 GPU에 가장 적합.",

  "Base URL": "기본 URL",
  "Search threads": "대화 검색",
  sorry: "미안해",
  "Run `liverary connect link` on the host, then restart Liverary there.":
    "호스트에서 `liverary connect link`를 실행한 뒤 해당 호스트의 Liverary를 다시 시작하세요.",

  Auto: "자동",
  dictionary: "사전",
  "Custom (OpenAI-compatible)": "사용자 지정(OpenAI 호환)",
  "Couldn't read this environment's settings.": "이 환경의 설정을 읽지 못했습니다.",
  "Your organization's provider policy turns off text generators.":
    "조직의 제공자 정책으로 텍스트 생성기가 꺼져 있습니다.",
  "That text generator no longer exists.": "이 텍스트 생성기는 더 이상 존재하지 않습니다.",
  "Restart Liverary. If it stays, run `liverary connect` again.":
    "Liverary를 다시 시작하세요. 문제가 계속되면 `liverary connect`를 다시 실행하세요.",
  "The server has not set up a T3 Connect tunnel.": "서버에 T3 Connect 터널이 설정되지 않았습니다.",
  "Run `liverary connect`, then restart Liverary so it applies the link.":
    "`liverary connect`를 실행한 뒤 Liverary를 다시 시작하여 연결을 적용하세요.",
  "The tunnel client (cloudflared) is not running.":
    "터널 클라이언트(cloudflared)가 실행 중이 아닙니다.",
  "Restart Liverary. If it stays down, check the server log for relay client errors.":
    "Liverary를 다시 시작하세요. 계속 실행되지 않으면 서버 로그에서 릴레이 클라이언트 오류를 확인하세요.",
  "A VPN, proxy, or firewall may block it.": "VPN, 프록시 또는 방화벽이 차단하고 있을 수 있습니다.",
  "The tunnel is up, but it cannot reach the Liverary server on this machine.":
    "터널이 연결되었지만 이 컴퓨터의 Liverary 서버에 접근할 수 없습니다.",
  "Restart Liverary so the tunnel uses the port the server listens on.":
    "터널이 서버의 수신 포트를 사용하도록 Liverary를 다시 시작하세요.",
  "cloudflared has not connected to Cloudflare yet.":
    "cloudflared가 아직 Cloudflare에 연결되지 않았습니다.",
  "Wait a minute. If it stays, check the network and the server log.":
    "잠시 기다려 주세요. 문제가 계속되면 네트워크와 서버 로그를 확인하세요.",
  "Cloudflare has no live connection from this machine for the tunnel.":
    "Cloudflare에 이 컴퓨터의 활성 터널 연결이 없습니다.",
  "The T3 Connect address does not resolve from this machine.":
    "이 컴퓨터에서 T3 Connect 주소의 DNS를 확인할 수 없습니다.",
  "Check the DNS settings on this machine or its VPN.":
    "이 컴퓨터 또는 VPN의 DNS 설정을 확인하세요.",
  "The T3 Connect address did not answer from this machine.":
    "이 컴퓨터에서 T3 Connect 주소의 응답을 받지 못했습니다.",
  "Check the network, VPN, or proxy on this machine.":
    "이 컴퓨터의 네트워크, VPN 또는 프록시를 확인하세요.",

  "Use in another app (MCP)": "다른 앱에서 사용(MCP)",
  "Remove connection": "연결 제거",
  Open: "열기",
  "Must be a coding agent: it reads the pull request over many steps. Off uses the writer model, or Codex or Claude if that model is a text generator.":
    "여러 단계에 걸쳐 풀 리퀘스트를 읽으므로 코딩 에이전트가 필요합니다. 끄면 작성 모델을 사용하며, 작성 모델이 텍스트 생성기라면 Codex 또는 Claude를 사용합니다.",

  "error rate": "오류율",

  "per 30 seconds": "/ 30초",

  "Transcription hardware and model unloading": "음성 인식 하드웨어 및 모델 메모리 해제",
  "Welcome page": "시작 페이지",

  "Show a predicted next message in the empty composer after a Claude or Codex turn. Tab uses it. Each is an extra cached request on your plan. Needs Codex 0.165+. Claude threads update on restart.":
    "Claude 또는 Codex 턴이 끝난 뒤 빈 입력창에 다음 메시지 제안을 표시합니다. Tab 키로 사용합니다. 제안마다 요금제의 캐시된 요청을 추가로 사용합니다. Codex 0.165 이상이 필요하며 Claude 대화는 다시 시작하면 적용됩니다.",
  "Suggest next prompt": "다음 프롬프트 제안",
  "On a Mac, clone new worktrees from a checkout cached in the T3 home folder instead of writing every file. Uses Git’s normal checkout when it can’t. Turning it off deletes the cache.":
    "Mac에서는 Liverary 홈 폴더에 캐시된 체크아웃을 복제하여 새 워크트리를 만듭니다. 사용할 수 없으면 일반 Git 체크아웃을 사용합니다. 끄면 캐시가 삭제됩니다.",
  "Fast worktree checkout": "빠른 워크트리 체크아웃",

  "Import from": "가져올 곳",

  "Showing access for": "접근 권한을 표시할 환경",

  "Clone into host folders": "호스트별 폴더에 복제",
  Activity: "활동",
  "Show all": "모두 표시",
  "Hide successful": "성공한 호출 숨기기",
  "Hide all": "모두 숨기기",
  Zen: "집중 모드",
  "Hide the commands, edits, and searches agents run. Hide successful keeps failures. Zen shows only final answers. Approvals, questions, and errors always show.":
    "에이전트가 실행한 명령, 수정, 검색을 숨깁니다. 성공한 호출 숨기기는 실패한 호출을 표시하며 집중 모드는 최종 응답만 표시합니다. 승인, 질문, 오류는 항상 표시됩니다.",
  "tool calls in chat": "채팅의 도구 호출",
  "Clones go to github.com/owner/repo under the folder above, like ghq.":
    "ghq처럼 위 폴더 아래의 github.com/소유자/저장소 경로에 복제합니다.",
  "clone into host folders": "호스트별 폴더에 복제",

  "not benchmarked": "벤치마크 없음",
  "Speed:": "속도:",
  "update server": "서버 업데이트 필요",

  "Auto-detect": "자동 감지",
  "Transcription language": "음성 인식 언어",

  "Add generator": "생성기 추가",
  "No text generators yet": "텍스트 생성기가 없습니다",
  "Add a model API to write thread titles, commit messages, and other short text without starting a coding agent.":
    "코딩 에이전트를 시작하지 않고 대화 제목, 커밋 메시지 등의 짧은 텍스트를 작성할 모델 API를 추가하세요.",
  "Off · ": "꺼짐 · ",
  "Show models": "모델 표시",
  "Use it": "사용 설정",
  "Thread titles and other generated text": "대화 제목 및 기타 생성 텍스트",
  "Commit messages, pull requests, and branch names": "커밋 메시지, 풀 리퀘스트 및 브랜치 이름",
  "Voice transcript cleanup": "음성 인식 결과 정리",
  "Add a text generator": "텍스트 생성기 추가",
  "Writes thread titles, commit messages, and other short text without starting a coding agent. Your API key is stored on this environment.":
    "코딩 에이전트를 시작하지 않고 대화 제목, 커밋 메시지 등의 짧은 텍스트를 작성합니다. API 키는 이 환경에 저장됩니다.",
  Service: "서비스",
  "API key (optional)": "API 키(선택 사항)",
  "Name (optional)": "이름(선택 사항)",
  "e.g. My local model": "예: 내 로컬 모델",
  "Save and continue": "저장하고 계속",
  "Follows the text generation model": "텍스트 생성 모델을 따름",

  "The model list couldn't load.": "모델 목록을 불러오지 못했습니다.",
  "Loading the model list.": "모델 목록을 불러오는 중입니다.",

  "OpenRouter model": "OpenRouter 모델",
  "No transcription model matches.": "일치하는 음성 인식 모델이 없습니다.",
  "Couldn’t save this change. Check your connection and try again.":
    "변경 사항을 저장하지 못했습니다. 연결을 확인한 후 다시 시도하세요.",
  "Replace API key": "API 키 바꾸기",
  "Enter API key": "API 키 입력",
  "Enter an API key, not a URL or secret reference.":
    "URL이나 비밀 값 참조 대신 API 키를 입력하세요.",
  "Updating the key keeps dictation enabled.": "키를 변경해도 받아쓰기는 계속 켜져 있습니다.",
  "Leave blank to keep the saved key.": "저장된 키를 유지하려면 비워 두세요.",
  "Manage OpenRouter dictation": "OpenRouter 받아쓰기 관리",
  "Retry loading API key": "API 키 다시 불러오기",
  "Checking for an API key…": "API 키 확인 중…",
  "Retry loading models": "모델 다시 불러오기",
  "Loading transcription models…": "음성 인식 모델 불러오는 중…",
  "This choice applies only to this device. Choose Off to stop sharing.":
    "이 선택은 이 기기에만 적용됩니다. 공유를 중지하려면 꺼짐을 선택하세요.",
  "Remove key…": "키 제거…",
  "Remove key": "키 제거",
  "Save and enable": "저장하고 활성화",
  "Save key": "키 저장",

  "Microphone testing is unavailable in this browser. Use HTTPS or the desktop app.":
    "이 브라우저에서는 마이크를 테스트할 수 없습니다. HTTPS 또는 데스크톱 앱을 사용하세요.",
  "No audio was recorded. Try again.": "녹음된 오디오가 없습니다. 다시 시도하세요.",
  "Could not record microphone audio. Try again.":
    "마이크 오디오를 녹음하지 못했습니다. 다시 시도하세요.",
  "The microphone disconnected.": "마이크 연결이 끊어졌습니다.",
  "Could not access the microphone.": "마이크에 접근하지 못했습니다.",
  "Test microphone": "마이크 테스트",
  "Cancel microphone test": "마이크 테스트 취소",
  "Recording time": "녹음 시간",
  "Microphone input level": "마이크 입력 레벨",
  "Opening microphone…": "마이크 여는 중…",
  "Stop recording": "녹음 중지",
  "Pause recording": "녹음 재생 일시 중지",
  "Play recording": "녹음 재생",
  "Recording playback position": "녹음 재생 위치",
  "Record again": "다시 녹음",
  "Could not play this recording. Try recording again.":
    "녹음을 재생하지 못했습니다. 다시 녹음하세요.",

  "Auto: press to toggle, hold to record": "자동: 눌러 전환, 길게 눌러 녹음",
  "Hold: record while held": "길게 누르기: 누르는 동안 녹음",
  "Toggle: press to start, press again to stop": "전환: 눌러 시작, 다시 눌러 중지",

  Immediately: "즉시",
  "After 2 minutes": "2분 후",
  "After 5 minutes": "5분 후",
  "After 10 minutes": "10분 후",
  "After 15 minutes": "15분 후",
  "After 1 hour": "1시간 후",
  Recommended: "추천",
  "A good default pick for the languages it covers.":
    "지원하는 언어에 기본으로 사용하기 좋은 모델입니다.",
  "Live preview": "실시간 미리보기",
  "Shows words in your draft as you speak, before the recording finishes.":
    "녹음이 끝나기 전 말하는 내용을 입력창에 실시간으로 표시합니다.",
  Translate: "번역",
  "Can write English text from speech in another language. Turn on Translate to English to use it.":
    "다른 언어의 음성을 영어 텍스트로 변환할 수 있습니다. 사용하려면 영어로 번역을 켜세요.",
  "Verifying download…": "다운로드 확인 중…",

  Selected: "선택됨",
  "Use model": "모델 사용",
  "Add words or phrases, separated by commas or line breaks":
    "쉼표나 줄바꿈으로 구분하여 단어나 문구 추가",

  Misspelling: "잘못 인식한 표기",
  Alias: "별칭",
  "Project dictionary": "프로젝트 사전",
  "Shared dictionary": "공유 사전",
  "project dictionary": "프로젝트 사전",
  "shared dictionary": "공유 사전",
  "Saved on the environment and used in every project there, along with each person’s own dictionary. Pick a project above to limit these words to one project.":
    "환경에 저장되어 개인 사전과 함께 해당 환경의 모든 프로젝트에서 사용됩니다. 한 프로젝트에만 적용하려면 위에서 프로젝트를 선택하세요.",
  "Cleanup model not saved": "정리 모델을 저장하지 못했습니다",
  "Cleanup model": "정리 모델",
  "Model for transcript cleanup, such as a cheaper or faster one. When disabled, use the text generation model configured for this environment.":
    "음성 인식 결과를 정리할 모델입니다. 더 저렴하거나 빠른 모델을 선택할 수 있습니다. 끄면 이 환경에 설정된 텍스트 생성 모델을 사용합니다.",
  "Connect an environment first.": "먼저 환경을 연결하세요.",
  "Use a separate cleanup model": "별도의 정리 모델 사용",
  "Could not load transcription models": "음성 인식 모델을 불러오지 못했습니다",
  Hardware: "하드웨어",
  "Auto uses the environment’s GPU when it has one.": "자동은 환경에 GPU가 있으면 이를 사용합니다.",
  "Could not change transcription hardware": "음성 인식 하드웨어를 변경하지 못했습니다",
  "Transcription hardware": "음성 인식 하드웨어",
  "Selected GPU": "선택한 GPU",
  "Unload model": "모델 메모리 해제",
  "Release the model’s memory on the environment after it sits idle.":
    "모델을 사용하지 않는 동안 환경에서 모델 메모리를 해제합니다.",
  "Could not change when the model unloads": "모델 메모리 해제 시점을 변경하지 못했습니다",
  "Smallest download": "가장 작은 다운로드",
  "Fastest transcription": "가장 빠른 음성 인식",
  "This environment can’t transcribe audio:": "이 환경에서는 음성을 인식할 수 없습니다:",
  "Pick languages to see models that support all of them. Accuracy is word or character error rate: lower is better. Speed is the time to transcribe 30 seconds of audio on Handy’s benchmark":
    "언어를 선택하면 모두 지원하는 모델이 표시됩니다. 정확도는 단어 또는 문자 오류율로 낮을수록 좋습니다. 속도는 Handy 벤치마크에서 30초 분량의 음성을 인식하는 데 걸린 시간입니다",
  Languages: "언어",
  "Search languages": "언어 검색",
  "Browse models by language": "언어별 모델 찾기",
  "All languages": "모든 언어",
  "No languages match.": "일치하는 언어가 없습니다.",
  "All models": "모든 모델",
  "Search transcription models": "음성 인식 모델 검색",
  "Search models": "모델 검색",
  "Sort by": "정렬 기준",
  "Downloaded only": "다운로드한 모델만",
  "Transcription models": "음성 인식 모델",
  "Could not download the model": "모델을 다운로드하지 못했습니다",
  "Could not select the model": "모델을 선택하지 못했습니다",
  "Could not cancel the download": "다운로드를 취소하지 못했습니다",
  "Could not delete the model": "모델을 삭제하지 못했습니다",
  "Test model": "모델 테스트",
  "Waiting for the environment to connect": "환경 연결을 기다리는 중",
  "Say a sentence in the language above. Cleanup is skipped, so you see exactly what the model heard. The transcript stays on this page.":
    "위 언어로 문장을 말하세요. 정리 과정을 건너뛰어 모델이 인식한 결과를 그대로 표시합니다. 인식 결과는 이 페이지에만 남습니다.",
  "Close model test": "모델 테스트 닫기",
  "Test transcript": "테스트 음성 인식 결과",
  "No speech recognized. Try again.": "음성이 인식되지 않았습니다. 다시 시도하세요.",
  "Selected microphone (unavailable)": "선택한 마이크(사용 불가)",
  "Manage OpenRouter": "OpenRouter 관리",
  "Manage key": "키 관리",

  Microphone: "마이크",
  "System default follows your operating system. Record a ten-second test and play it back here. Test audio stays on this device and is never transcribed.":
    "시스템 기본값은 운영체제 설정을 따릅니다. 10초 동안 테스트 녹음한 뒤 여기서 재생할 수 있습니다. 테스트 오디오는 이 기기에만 보관되며 음성 인식에 사용되지 않습니다.",
  "Refresh microphones": "마이크 새로고침",
  "Dictation shortcut": "받아쓰기 단축키",
  "How the dictation shortcut starts and stops recording.":
    "받아쓰기 단축키로 녹음을 시작하고 중지하는 방식입니다.",
  "Dictation shortcut mode": "받아쓰기 단축키 모드",
  Transcription: "음성 인식",
  "Transcribe with": "음성 인식 대상",
  Use: "사용",
  "Chosen environment (unavailable)": "선택한 환경(사용 불가)",
  "unavailable environment": "사용할 수 없는 환경",
  "On an environment": "환경에서 실행",
  "Cloud via": "다음 환경을 통한 클라우드",
  Language: "언어",
  "The cloud provider can detect your language automatically.":
    "클라우드 제공자가 언어를 자동으로 감지할 수 있습니다.",
  "Choose an environment above to see the languages its transcription model supports.":
    "위에서 환경을 선택하면 음성 인식 모델이 지원하는 언어가 표시됩니다.",
  "Translate to English": "영어로 번역",
  "Speak any language and get English text.": "다른 언어로 말한 내용을 영어 텍스트로 받습니다.",
  "Transcription options": "음성 인식 옵션",
  "Silence filtering": "무음 필터링",
  "OpenAI handles silence automatically.": "OpenAI는 무음을 자동으로 처리합니다.",
  "Skip silence and other non-speech audio before transcription, keeping a short buffer so words aren’t cut off.":
    "음성 인식 전에 무음과 말소리가 아닌 오디오를 건너뜁니다. 단어가 잘리지 않도록 짧은 여유 구간을 유지합니다.",
  "Remove filler words": "군더더기 말 제거",
  "Remove filler words like “um” and “uh” from transcripts.":
    "음성 인식 결과에서 “음”, “어”와 같은 군더더기 말을 제거합니다.",
  Dictionary: "사전",
  "Names and terms transcription should spell your way, saved on this device. Add an alias when it keeps hearing a term wrong. The name of the project you dictate in is also sent as a hint.":
    "원하는 대로 표기할 이름과 용어를 이 기기에 저장합니다. 계속 잘못 인식하는 용어에는 별칭을 추가하세요. 받아쓰는 프로젝트 이름도 힌트로 전송됩니다.",

  "Clean up transcripts": "음성 인식 결과 정리",
  "Fixes punctuation, numbers, and spoken corrections with the cleanup model on the draft’s environment. Sends the transcript and nearby draft text, never audio.":
    "입력창의 환경에 설정된 정리 모델로 문장 부호, 숫자, 말로 수정한 내용을 정리합니다. 인식 결과와 주변 입력 텍스트를 전송하며 오디오는 보내지 않습니다.",
  "Cleanup instructions": "정리 지침",
  "Use the built-in instructions or write your own.": "기본 지침을 사용하거나 직접 작성하세요.",
  "Built-in": "기본 제공",
  "Custom cleanup instructions": "사용자 정의 정리 지침",
  "Correction cue": "수정 신호",
  "The word or phrase you say to flag a correction, like “sorry” or “scratch that”. Cleanup applies the correction only where one is meant, and hears the cue as a hint.":
    "“아니”, “다시 말하면”처럼 수정을 알릴 단어나 문구입니다. 정리 모델은 이를 힌트로 삼아 수정 의도가 있는 부분에만 적용합니다.",

  "New thread each run": "실행마다 새 대화",
  "One thread, continuing the conversation": "하나의 대화에서 이어서 실행",
  "One thread, fresh session each run": "하나의 대화에서 매번 새 세션으로 실행",
  "Started by the first run": "첫 실행에서 생성",
  "Destination thread": "대상 대화",
  "Search all threads...": "모든 대화 검색…",
  "No threads found.": "대화를 찾지 못했습니다.",
  "Deleting the thread also deletes this task.": "대화를 삭제하면 이 작업도 삭제됩니다.",
  "The first run starts a thread with the workspace and model below. Later runs continue that conversation.":
    "첫 실행에서 아래 작업 공간과 모델로 대화를 시작합니다. 이후 실행은 해당 대화를 이어갑니다.",
  "The first run starts a thread with the workspace and model below. Later runs post there, each in a fresh session without earlier runs' context.":
    "첫 실행에서 아래 작업 공간과 모델로 대화를 시작합니다. 이후 실행은 이전 실행의 컨텍스트 없이 매번 새 세션으로 같은 대화에 게시합니다.",
  "Each run starts a fresh session in this thread, without earlier runs' context.":
    "실행마다 이전 실행의 컨텍스트 없이 이 대화에서 새 세션을 시작합니다.",

  Reclaim: "공간 회수",
  "Restart and reclaim": "다시 시작하고 공간 회수",

  "Tool calls in chat": "채팅의 도구 호출",
  "For thread titles and other generated text. Source control has its own setting. Text generators from Providers also appear here.":
    "대화 제목 등 생성되는 텍스트에 사용합니다. 소스 제어에는 별도 설정이 있습니다. 제공자에서 설정한 텍스트 생성기도 여기에 표시됩니다.",
  "See your agents, import projects, and set up your phone.":
    "에이전트를 확인하고 프로젝트를 가져오며 휴대폰을 설정합니다.",
  Voice: "음성",
  "Text generators": "텍스트 생성기",

  "Could not install liverary": "liverary 명령을 설치하지 못했습니다",
  "Could not remove liverary": "liverary 명령을 제거하지 못했습니다",
  "Could not add liverary to PATH": "liverary 명령을 PATH에 추가하지 못했습니다",
  "Add to PATH": "PATH에 추가",
  "Manage tunnels": "터널 관리",
  "Show folder threads on two lines: the title, then the branch, pull request, and agent.":
    "폴더 대화를 제목과 브랜치·풀 리퀘스트·에이전트의 두 줄로 표시합니다.",
  ". Turning it off stops every guest link.": ". 끄면 모든 게스트 링크가 작동을 멈춥니다.",
  ". While off, nothing new starts over a link; running tasks finish.":
    ". 꺼진 동안 링크로 새 작업을 시작할 수 없으며 실행 중인 작업은 완료됩니다.",

  retrying: "재시도 중",
  "Choose files": "파일 선택",
  "All checkouts": "모든 체크아웃",
  "Saved. Restart the server to apply.": "저장했습니다. 적용하려면 서버를 다시 시작하세요.",
  "Prompt preview example":
    "$frontend-design로 [surface.test.ts](apps/web/src/terminal/ghostty/surface.test.ts)의 불안정한 테스트를 수정하고, 배포 전에 [SettingsPanels.tsx](apps/web/src/components/settings/SettingsPanels.tsx)와 헤더를 맞춰 주세요.",
  "connection diagnostics": "연결 진단",
  "trace ID": "추적 ID",
  "webhook URL": "웹훅 URL",
  "project actions update": "프로젝트 작업 업데이트",
  "action shortcut update": "작업 단축키 업데이트",
  "action shortcut removal": "작업 단축키 삭제",

  "Last Seen": "마지막 발생",
  Renderer: "렌더러",
  Monitor: "모니터",
  Connecting: "연결 중",
  Reconnecting: "다시 연결 중",
  "Install Git from https://git-scm.com/downloads or with your package manager.":
    "https://git-scm.com/downloads 또는 패키지 관리자로 Git을 설치하세요.",
  "Install Jujutsu with `brew install jj` or from https://github.com/jj-vcs/jj.":
    "`brew install jj` 또는 https://github.com/jj-vcs/jj에서 Jujutsu를 설치하세요.",
  "Install the GitHub command-line tool (`gh`) via https://cli.github.com/ or your package manager (for example `brew install gh`).":
    "https://cli.github.com/ 또는 패키지 관리자(예: `brew install gh`)로 GitHub 명령줄 도구(`gh`)를 설치하세요.",
  "Install the GitLab command-line tool (`glab`) from https://gitlab.com/gitlab-org/cli or your package manager (for example `brew install glab`).":
    "https://gitlab.com/gitlab-org/cli 또는 패키지 관리자(예: `brew install glab`)로 GitLab 명령줄 도구(`glab`)를 설치하세요.",
  "Install the Azure command-line tools (`az`), then enable Azure DevOps support with `az extension add --name azure-devops`.":
    "Azure 명령줄 도구(`az`)를 설치한 뒤 `az extension add --name azure-devops`로 Azure DevOps 지원을 켜세요.",
  "Add a Bitbucket token in Settings → Source Control.":
    "설정 → 소스 제어에서 Bitbucket 토큰을 추가하세요.",
  "Install `fj` 0.6 or later from https://codeberg.org/forgejo-contrib/forgejo-cli and run `fj --host <server-url> auth add-token`, or install `tea` 0.16 or later from https://gitea.com/gitea/tea and run `tea login add` for each Forgejo or Gitea server.":
    "https://codeberg.org/forgejo-contrib/forgejo-cli에서 `fj` 0.6 이상을 설치하고 `fj --host <server-url> auth add-token`을 실행하세요. 또는 https://gitea.com/gitea/tea에서 `tea` 0.16 이상을 설치하고 Forgejo나 Gitea 서버마다 `tea login add`를 실행하세요.",
  "Run `tea login add` to authenticate a Forgejo or Gitea server.":
    "Forgejo나 Gitea 서버를 인증하려면 `tea login add`를 실행하세요.",
  "Could not read fj authentication storage. Authenticate again with fj.":
    "fj 인증 저장소를 읽지 못했습니다. fj에서 다시 인증하세요.",
  "Authenticate this server with `fj --host <server-url> auth add-token`.":
    "`fj --host <server-url> auth add-token`으로 이 서버를 인증하세요.",
  "Every GitHub host gh is signed in to is turned off in Settings → Source Control.":
    "gh로 로그인한 모든 GitHub 호스트가 설정 → 소스 제어에서 꺼져 있습니다.",
  "Run `gh auth login` to authenticate GitHub CLI with an active account.":
    "활성 계정으로 GitHub CLI를 인증하려면 `gh auth login`을 실행하세요.",
  "GitHub CLI is too old to report sign-in status. Update `gh` to 2.81.0 or newer (for example `brew upgrade gh`) and rescan.":
    "GitHub CLI가 오래되어 로그인 상태를 확인할 수 없습니다. `gh`를 2.81.0 이상으로 업데이트(예: `brew upgrade gh`)한 뒤 다시 검색하세요.",
  "Run `gh auth login` to authenticate GitHub CLI.":
    "GitHub CLI를 인증하려면 `gh auth login`을 실행하세요.",
  "GitHub CLI auth status could not be parsed.": "GitHub CLI 인증 상태를 해석하지 못했습니다.",
  "Run `glab auth login` to authenticate GitLab CLI.":
    "GitLab CLI를 인증하려면 `glab auth login`을 실행하세요.",
  "GitLab CLI auth status could not be parsed.": "GitLab CLI 인증 상태를 해석하지 못했습니다.",
  "Run `az login` to authenticate Azure CLI.": "Azure CLI를 인증하려면 `az login`을 실행하세요.",
  "Azure CLI account status could not be parsed.": "Azure CLI 계정 상태를 해석하지 못했습니다.",
  "An access token is configured.": "액세스 토큰이 설정되어 있습니다.",
  "An API token is configured.": "API 토큰이 설정되어 있습니다.",
  "Add a Bitbucket token in Settings → Source Control, or set the T3CODE_BITBUCKET_* environment variables on the server.":
    "설정 → 소스 제어에서 Bitbucket 토큰을 추가하거나 서버의 T3CODE_BITBUCKET_* 환경 변수를 설정하세요.",
  "The hosting service did not answer in time. Refresh to try again.":
    "호스팅 서비스의 응답 시간이 초과되었습니다. 새로고침하여 다시 시도하세요.",
  "Hosting integration command was not found on the server PATH.":
    "서버 PATH에서 호스팅 연동 명령을 찾지 못했습니다.",
  "read and write access to pull requests and contents": "Pull Request와 콘텐츠의 읽기·쓰기 권한",
  hours: "시간",
  "Show full message": "전체 메시지 표시",
  "minutes, optional": "분, 선택 사항",
  "template, optional": "템플릿, 선택 사항",
  "seconds, 10–3600": "초, 10~3600",
  "Click to reveal account": "클릭하여 계정 표시",
  "Click to hide account": "클릭하여 계정 숨기기",
  "Show account": "계정 표시",
  "Hide account": "계정 숨기기",
  Unknown: "알 수 없음",

  "Select icon": "아이콘 선택",
  "Publish agent activity to mobile clients": "에이전트 활동을 모바일 클라이언트에 게시",
  "Hold webhook requests while this environment is offline":
    "이 환경이 오프라인인 동안 웹훅 요청 보관",
  "Toggle account visibility": "계정 표시 여부 전환",
  "Prompt font preview": "프롬프트 글꼴 미리보기",
  "Signed-in GitHub account": "로그인한 GitHub 계정",
  "Toggle source control account visibility": "소스 제어 계정 표시 여부 전환",
  "ACP Registry": "ACP 레지스트리",
  Downloading: "다운로드 중",
  Preparing: "준비 중",
  Identity: "식별 정보",
  Config: "구성",
  Subprocess: "하위 프로세스",
  Agent: "에이전트",
  Root: "루트",
  Child: "하위",
  Cause: "원인",
  Duration: "소요 시간",
  Ended: "종료",
  Max: "최대",
  "Connection failed": "연결 실패",
  "Switched off": "꺼짐",
  "Opened window": "요청 병합 시작",
  "Run failed": "실행 실패",
  "Bad signature": "잘못된 서명",
  "Task paused": "작업 일시 중지됨",
  "Rate limited": "요청 한도 초과",
  "Too old": "유효 시간 초과",
  Battery: "배터리",
  Suspended: "일시 중단됨",
  Locked: "잠김",
  Unlocked: "잠금 해제됨",
  Restarting: "다시 시작 중",
  "Request accepted": "요청 접수됨",
  Duplicate: "중복",
  Coalesced: "병합됨",
  Filtered: "필터링됨",
  Sun: "일",
  Mon: "월",
  Tue: "화",
  Wed: "수",
  Thu: "목",
  Fri: "금",
  Sat: "토",
  Su: "일",
  Mo: "월",
  Tu: "화",
  We: "수",
  Th: "목",
  Fr: "금",
  Sa: "토",
  Daily: "매일",
  Weekdays: "평일",
  In: "일정 시간 후",
  Today: "오늘",
  Tomorrow: "내일",
  Monday: "월요일",
  Tuesday: "화요일",
  Wednesday: "수요일",
  Thursday: "목요일",
  Friday: "금요일",
  Saturday: "토요일",
  Sunday: "일요일",
  Show: "표시",
  Installing: "설치 중",
  "in under a minute": "1분 이내",
  "Not connected:": "연결되지 않음:",
  "Loading scheduled tasks on": "예약 작업 불러오는 중:",
  "Could not load scheduled tasks:": "예약 작업을 불러오지 못함:",
  "No tasks on": "예약 작업 없음:",
  "Rotate this webhook URL? The current URL stops working.":
    "웹훅 URL을 교체할까요? 현재 URL은 더 이상 작동하지 않습니다.",
  "Scheduled task is incomplete": "예약 작업 설정이 완료되지 않았습니다",
  "Add a title, prompt, project, and model.": "제목, 프롬프트, 프로젝트와 모델을 입력하세요.",
  "Invalid filter": "필터가 올바르지 않습니다",
  "Signing secret is required": "서명용 비밀 값이 필요합니다",
  "Enter the signature header and secret.": "서명 헤더와 비밀 값을 입력하세요.",
  "Invalid interval": "실행 간격이 올바르지 않습니다",
  "Enter an interval of at least one minute.": "1분 이상의 간격을 입력하세요.",
  "Checkout path is required": "체크아웃 경로가 필요합니다",
  "Enter the path of the checkout to run in.": "실행할 체크아웃 경로를 입력하세요.",
  "Could not save scheduled task": "예약 작업을 저장하지 못했습니다",
  "This setting is environment-wide and cannot be overridden by a project.":
    "환경 전체에 적용되는 설정이므로 프로젝트에서 재정의할 수 없습니다.",
  "Connect the selected checkouts, or update their environments, to save a project override.":
    "프로젝트 재정의 설정을 저장하려면 선택한 체크아웃을 연결하거나 해당 환경을 업데이트하세요.",
  "an environment": "환경",
  "Connect the selected checkouts, or update their environments, to reset this override.":
    "재정의 설정을 초기화하려면 선택한 체크아웃을 연결하거나 해당 환경을 업데이트하세요.",
  "Connect the environments to reset these overrides.":
    "재정의 설정을 초기화하려면 환경을 연결하세요.",
  "Enter the 1Password account.": "1Password 계정을 입력하세요.",
  "The name needs at least one letter or digit.": "이름에 문자나 숫자가 하나 이상 필요합니다.",
  "A secret provider with this name exists.": "같은 이름의 비밀 정보 제공자가 있습니다.",
  "Select a project to choose one of its checkouts.":
    "체크아웃을 선택하려면 프로젝트를 선택하세요.",
  "The ACP could not be prepared.": "ACP를 준비하지 못했습니다.",
  "Already added": "이미 추가됨",
  "Headers must be valid JSON.": "헤더는 유효한 JSON이어야 합니다.",
  "Headers must be a JSON object with string values.": "헤더는 값이 문자열인 JSON 객체여야 합니다.",
  "Could not list ACP sessions": "ACP 세션 목록을 불러오지 못했습니다",
  "Could not import ACP session": "ACP 세션을 가져오지 못했습니다",
  "Could not delete ACP session": "ACP 세션을 삭제하지 못했습니다",
  "Could not list ACP providers": "ACP 제공자 목록을 불러오지 못했습니다",
  "Could not configure ACP provider": "ACP 제공자를 설정하지 못했습니다",
  "Could not disable ACP provider": "ACP 제공자를 끄지 못했습니다",
  "Could not log out of ACP agent": "ACP 에이전트에서 로그아웃하지 못했습니다",
  "Failed to add backend.": "백엔드를 추가하지 못했습니다.",
  "Could not add the route.": "접속 경로를 추가하지 못했습니다.",
  "Not connected yet.": "아직 연결되지 않았습니다.",
  "Failed to create pairing URL.": "페어링 URL을 만들지 못했습니다.",
  "Pauses probes for idle clients, locked hosts, or low power mode.":
    "클라이언트가 유휴 상태이거나 호스트가 잠겼거나 저전력 모드이면 상태 확인을 일시 중지합니다.",
  "Allows scoped background probes while any subscribed client remains connected.":
    "대상 클라이언트가 하나라도 연결되어 있으면 백그라운드 상태 확인을 허용합니다.",
  "Also pauses background probes when the host or client is on battery.":
    "호스트나 클라이언트가 배터리를 사용하는 경우에도 백그라운드 상태 확인을 일시 중지합니다.",
  "Uses custom intervals.": "사용자 지정 간격을 사용합니다.",
  "That profile is no longer available. Choose where to import these cookies.":
    "해당 프로필을 더 이상 사용할 수 없습니다. 쿠키를 가져올 프로필을 선택하세요.",
  "no cookies": "쿠키 없음",
  "Could not open System Settings. Try Allow again.":
    "시스템 설정을 열지 못했습니다. 허용을 다시 눌러 보세요.",
  "You've reached the profile limit. Choose an existing profile to import into.":
    "프로필 개수 한도에 도달했습니다. 가져올 기존 프로필을 선택하세요.",
  "Created for these cookies": "이 쿠키를 위해 만든 프로필",
  "Existing profile": "기존 프로필",
  "Turn on Network access to detect Tailscale.": "Tailscale을 감지하려면 네트워크 접근을 켜세요.",
  "Start Tailscale to set up HTTPS access through MagicDNS.":
    "MagicDNS로 HTTPS 접근을 설정하려면 Tailscale을 시작하세요.",
  "Up to date": "최신 버전입니다",
  "Downloading update": "업데이트 다운로드 중",
  "Update downloaded": "업데이트 다운로드 완료",
  "SSH host or alias is required.": "SSH 호스트 또는 별칭이 필요합니다.",
  "SSH port must be between 1 and 65535.": "SSH 포트는 1~65535 사이여야 합니다.",
  "Enter a backend host.": "백엔드 호스트를 입력하세요.",
  "Enter a pairing code.": "페어링 코드를 입력하세요.",
  "Failed to connect SSH host.": "SSH 호스트에 연결하지 못했습니다.",
  "Opens the hosted app, no install needed": "설치 없이 호스팅 앱을 엽니다",
  "Devices on the same network": "같은 네트워크의 기기",
  "Devices on your private network": "사용자 사설 네트워크의 기기",
  "Reachable from anywhere": "어디서나 접속 가능",
  "Clients on this machine": "이 컴퓨터의 클라이언트",
  "Connection checks passed": "연결 테스트 통과",
  "Check access before saving": "저장하기 전에 접근 권한을 확인하세요",
  "Multiple hosts match this SSH destination. Select the environment to edit its hosts.":
    "이 SSH 대상과 일치하는 호스트가 여러 개입니다. 호스트를 편집할 환경을 선택하세요.",
  "Device host not removed everywhere": "일부 환경에서 기기 호스트를 삭제하지 못했습니다",
  "Device host not saved everywhere": "일부 환경에 기기 호스트를 저장하지 못했습니다",
  "EAS host not removed everywhere": "일부 환경에서 EAS 호스트를 삭제하지 못했습니다",
  "EAS host not saved everywhere": "일부 환경에 EAS 호스트를 저장하지 못했습니다",
  "Simlock host not saved everywhere": "일부 환경에 Simlock 호스트를 저장하지 못했습니다",
  "Simlock host not removed everywhere": "일부 환경에서 Simlock 호스트를 삭제하지 못했습니다",
  "Not added": "추가되지 않음",
  "Unable to open logs folder.": "로그 폴더를 열지 못했습니다.",
  "the access token saved here": "여기에 저장한 액세스 토큰",
  "EXPO_TOKEN on the server": "서버의 EXPO_TOKEN",
  "the server's eas login": "서버의 eas 로그인",
  "Sessions at once": "동시 세션 수",
  "Session minutes": "세션 시간(분)",
  "Idle minutes": "유휴 시간(분)",
  "Connect to this environment to change its icon.": "아이콘을 바꾸려면 이 환경을 연결하세요.",
  "Your session on this environment cannot change its settings.":
    "이 환경의 현재 세션에서는 설정을 바꿀 수 없습니다.",
  "Reorder routes": "접속 경로 순서 변경",
  "Show full error": "전체 오류 표시",
  "Browser profile data is not available to clear.":
    "지울 수 있는 브라우저 프로필 데이터가 없습니다.",
  "Browser profile limit reached.": "브라우저 프로필 개수 한도에 도달했습니다.",
  "Your default browser": "기본 브라우저",
  "This connection cannot change device settings.": "이 연결에서는 기기 설정을 바꿀 수 없습니다.",
  "Connect to an environment before removing this profile.":
    "이 프로필을 삭제하기 전에 환경을 연결하세요.",
  "Profile data could not be deleted. Try again.":
    "프로필 데이터를 삭제하지 못했습니다. 다시 시도하세요.",
  "Only available in the desktop app.": "데스크톱 앱에서만 사용할 수 있습니다.",
  "Searching project files…": "프로젝트 파일 검색 중…",
  "Indexing project files…": "프로젝트 파일 색인 중…",
  "No matching image files.": "일치하는 이미지 파일이 없습니다.",
  "No image files found.": "이미지 파일이 없습니다.",
  "Could not open the provider link.": "제공자 링크를 열지 못했습니다.",
  "Could not load the sign-in terminal. Cancel and retry sign-in.":
    "로그인 터미널을 불러오지 못했습니다. 취소한 뒤 로그인을 다시 시도하세요.",
  "read and act": "읽기 및 작업",
  "read PRs": "PR 읽기",
  "Backend child": "백엔드 하위 프로세스",
  "Electron main": "Electron 메인",
  "Electron utility": "Electron 유틸리티",
  "Liverary process": "Liverary 프로세스",
  "Storage bytes": "저장소 바이트",
  "Logical bytes": "논리적 바이트",
  "No reported errors": "보고된 오류 없음",
  "This environment is no longer available.": "이 환경을 더 이상 사용할 수 없습니다.",
  "This project has no checkout on this environment.":
    "이 환경에 이 프로젝트의 체크아웃이 없습니다.",
  "This checkout's environment is no longer available.":
    "이 체크아웃의 환경을 더 이상 사용할 수 없습니다.",
  "Devices at once": "동시 기기 수",
  "Lease minutes": "대여 시간(분)",
  "Give the host a label.": "호스트 이름을 입력하세요.",
  "Enter the gateway's origin, such as https://gateway.example.ts.net:4700.":
    "https://gateway.example.ts.net:4700과 같은 게이트웨이 주소를 입력하세요.",
  "Keep the limits within the ranges shown.": "표시된 범위 안에서 한도를 설정하세요.",
  "Checking snapshots…": "스냅샷 확인 중…",
  "Not supported on this platform.": "이 플랫폼에서는 지원하지 않습니다.",
  "Turn this on to set up snapshots.": "스냅샷을 설정하려면 켜세요.",
  "Capture needs attention": "캡처 설정 확인 필요",
  "Check capture access in setup": "설정에서 캡처 접근 권한 확인",
  "Install the capture helper to continue": "계속하려면 캡처 도우미를 설치하세요",
  "Set up active-window snapshots": "활성 창 스냅샷 설정",
  "Manual capture only. You'll choose a window each time":
    "수동 캡처만 지원합니다. 매번 창을 선택합니다",
  "Enable capture to continue": "계속하려면 캡처를 켜세요",
  "Connecting your shortcut…": "단축키 연결 중…",
  "Waiting for shortcut permission": "단축키 권한 대기 중",
  "Ready to capture": "캡처 준비 완료",
  "Use your shortcut from another app": "다른 앱에서 단축키를 사용하세요",
  "Finish shortcut setup": "단축키 설정 완료하기",
  "Approve the shortcut permission prompt to continue.":
    "계속하려면 단축키 권한 요청을 승인하세요.",
  "Shortcut saved.": "단축키를 저장했습니다.",
  "Continue setup": "설정 계속",
  "Manage capture": "캡처 관리",
  "Capture effects aren't available on this desktop.":
    "이 데스크톱에서는 캡처 효과를 사용할 수 없습니다.",
  "Install or update the capture helper to enable effects.":
    "효과를 사용하려면 캡처 도우미를 설치하거나 업데이트하세요.",
  "Capture effects aren't available on Niri.": "Niri에서는 캡처 효과를 사용할 수 없습니다.",
  "Update the GNOME extension, then sign out and back in to enable effects.":
    "효과를 사용하려면 GNOME 확장 프로그램을 업데이트한 뒤 로그아웃하고 다시 로그인하세요.",
  "Finish extension setup to enable effects.": "효과를 사용하려면 확장 프로그램 설정을 완료하세요.",
  "Automatic capture isn't available here. Choose a window instead.":
    "자동 캡처를 사용할 수 없습니다. 창을 직접 선택하세요.",
  "Capture a window and attach it to your current draft.": "창을 캡처해 현재 초안에 첨부합니다.",
  "This desktop only provides a screenshot.": "이 데스크톱은 스크린샷만 제공합니다.",
  "Update the desktop app to use snapshots.": "스냅샷을 사용하려면 데스크톱 앱을 업데이트하세요.",
  "Couldn't check capture setup": "캡처 설정을 확인하지 못했습니다",
  "Couldn't open shortcut permissions": "단축키 권한을 열지 못했습니다",
  "Couldn't complete capture setup": "캡처 설정을 완료하지 못했습니다",
  "Couldn't save capture settings": "캡처 설정을 저장하지 못했습니다",
  "Couldn't allow app text capture": "앱 텍스트 캡처를 허용하지 못했습니다",
  "Checking shortcut…": "단축키 확인 중…",
  "Ready to save.": "저장 준비가 되었습니다.",
  "Try a shortcut such as Ctrl+Shift+2.": "Ctrl+Shift+2 같은 단축키를 사용해 보세요.",
  "Couldn't verify capture access": "캡처 접근 권한을 확인하지 못했습니다",
  "Couldn't close capture setup": "캡처 설정을 닫지 못했습니다",
  "Still unable to check access. See Advanced for help.":
    "아직 접근 권한을 확인할 수 없습니다. 고급 설정에서 도움말을 확인하세요.",
  "Ready. You'll choose a window each time.": "준비되었습니다. 매번 창을 선택합니다.",
  "Still waiting for you to sign out and back in.":
    "로그아웃한 뒤 다시 로그인하기를 기다리고 있습니다.",
  "Ready. Continue to choose your shortcut.": "준비되었습니다. 계속해서 단축키를 선택하세요.",
  "Not ready yet. Finish the step above.": "아직 준비되지 않았습니다. 위 단계를 완료하세요.",
  "Permission status unavailable": "권한 상태를 확인할 수 없습니다",
  "Choose your shortcut": "단축키 선택",
  "Click the shortcut, then press the keys you want.":
    "단축키를 클릭한 뒤 원하는 키 조합을 누르세요.",
  "Choose your keys, then approve the permission prompt if asked.":
    "키 조합을 선택한 뒤 권한 요청이 나타나면 승인하세요.",
  "Use both Shift keys, or record a different shortcut.":
    "양쪽 Shift 키를 사용하거나 다른 단축키를 기록하세요.",
  "Passed for today": "오늘은 지난 시간",
  "Duplicate of an option above": "위 옵션과 중복됨",
  "Same time as an option above": "위 옵션과 같은 시간",
  "Signed in": "로그인됨",
  "Approve the app on GitHub to finish signing in.":
    "GitHub에서 앱을 승인하여 로그인을 완료하세요.",
  "A far higher GitHub API rate limit than a personal token or gh login.":
    "개인 토큰이나 gh 로그인보다 훨씬 높은 GitHub API 요청 한도를 제공합니다.",
  "Set by environment": "환경 변수로 설정됨",
  "Set by desktop": "데스크톱에서 설정됨",
  "Toolbar background": "도구 모음 배경",
  "Toolbar text": "도구 모음 텍스트",
  "Toolbar border": "도구 모음 테두리",
  "Toolbar control": "도구 모음 컨트롤",
  "Toolbar control text": "도구 모음 컨트롤 텍스트",
  "Toolbar control hover": "도구 모음 컨트롤에 마우스를 올렸을 때",
  "Error text": "오류 텍스트",
  "Error background": "오류 배경",
  "Warning text": "경고 텍스트",
  "Warning background": "경고 배경",
  "Update text": "업데이트 텍스트",
  "Update background": "업데이트 배경",
  "Name your theme first.": "먼저 테마 이름을 입력하세요.",
  "Theme saved, but it could not be made active. Try again.":
    "테마를 저장했지만 적용하지 못했습니다. 다시 시도하세요.",
  "Could not save the theme.": "테마를 저장하지 못했습니다.",
  "Could not create the theme.": "테마를 만들지 못했습니다.",
  "Could not read that file. Paste the JSON below instead.":
    "파일을 읽지 못했습니다. 아래에 JSON을 붙여 넣으세요.",
  "not a theme file": "테마 파일이 아님",
  "could not install": "설치하지 못함",
  "Theme added, but it could not be selected. Try again.":
    "테마를 추가했지만 선택하지 못했습니다. 다시 시도하세요.",
  "That theme file is invalid.": "올바르지 않은 테마 파일입니다.",
  "Open VSX search failed.": "Open VSX 검색에 실패했습니다.",
  "Installed themes could not be read.": "설치된 테마를 읽지 못했습니다.",
  "That theme could not be added.": "테마를 추가하지 못했습니다.",
  "This connection cannot test device hosts.": "이 연결에서는 기기 호스트를 테스트할 수 없습니다.",
  "No available machine, or another action change is saving.":
    "사용 가능한 컴퓨터가 없거나 다른 작업 변경사항을 저장하고 있습니다.",
  "a selected environment": "선택한 환경",
  "Could not start shortcut recording.": "단축키 기록을 시작하지 못했습니다.",
  "Add a letter, number, or function key to your shortcut.":
    "단축키에 문자, 숫자 또는 기능 키를 추가하세요.",
  "Settings content": "설정 내용",
  "Choose an agent": "에이전트 선택",
  "Search ACP Registry": "ACP 레지스트리 검색",
  "Search agents…": "에이전트 검색…",
  "Searching the ACP Registry.": "ACP 레지스트리를 검색하고 있습니다.",
  "Refreshing ACP Registry results.": "ACP 레지스트리 검색 결과를 새로고침하고 있습니다.",
  "Searching the registry...": "레지스트리 검색 중…",
  "No compatible agents found": "호환되는 에이전트가 없습니다",
  "Try a broader search.": "검색어를 더 넓게 입력해 보세요.",
  Added: "추가됨",
  "The ACP operation failed.": "ACP 작업에 실패했습니다.",
  "ACP session imported": "ACP 세션을 가져왔습니다",
  "ACP session already imported": "이미 가져온 ACP 세션입니다",
  "ACP session deleted": "ACP 세션을 삭제했습니다",
  "Invalid provider headers": "제공자 헤더가 올바르지 않습니다",
  "ACP provider configured": "ACP 제공자를 설정했습니다",
  "ACP provider disabled": "ACP 제공자를 껐습니다",
  "Logged out of ACP agent": "ACP 에이전트에서 로그아웃했습니다",
  "Resume agent-owned conversations as Liverary threads.":
    "에이전트의 기존 대화를 Liverary 대화로 이어갑니다.",
  "Add a project before importing sessions.": "세션을 가져오려면 먼저 프로젝트를 추가하세요.",
  "Logging out": "로그아웃 중",
  "Log out": "로그아웃",
  "Project for ACP sessions": "ACP 세션의 프로젝트",
  Loading: "불러오는 중",
  "List sessions": "세션 목록",
  Imported: "가져옴",
  Importing: "가져오는 중",
  Import: "가져오기",
  Deleting: "삭제 중",
  Delete: "삭제",
  "Load more": "더 보기",
  "Agent providers": "에이전트 제공자",
  "Configure non-secret routing. Headers are write-only.":
    "비밀 정보가 아닌 라우팅을 설정합니다. 저장한 헤더는 다시 표시되지 않습니다.",
  "List providers": "제공자 목록",
  "Project for ACP providers": "ACP 제공자의 프로젝트",
  Configured: "설정됨",
  " · Required": " · 필수",
  Disable: "끄기",
  'Write-only headers JSON, e.g. {"Authorization":"Bearer …"}':
    '저장 후 표시되지 않는 헤더 JSON. 예: {"Authorization":"Bearer …"}',
  "Preparing managed setup.": "관리형 런타임을 준비하고 있습니다.",
  "Account name": "계정 이름",
  "Shown in the provider list and model picker.": "제공자 목록과 모델 선택기에 표시됩니다.",
  "e.g. Personal or Work": "예: 개인용 또는 업무용",
  "Finish later": "나중에 완료",
  "Adding account…": "계정 추가 중…",
  "Route added": "접속 경로를 추가했습니다",
  "Environment connected": "환경을 연결했습니다",
  "Could not add backend": "백엔드를 추가하지 못했습니다",
  "Backend added": "백엔드를 추가했습니다",
  "The environment is saved and will reconnect on app startup.":
    "환경을 저장했습니다. 앱을 시작할 때 다시 연결합니다.",
  Host: "호스트",
  "Paste a full pairing URL here to fill both fields automatically.":
    "전체 페어링 URL을 붙여 넣으면 두 필드가 자동으로 채워집니다.",
  "Adding…": "추가 중…",
  "Add route": "접속 경로 추가",
  "Add environment": "환경 추가",
  "SSH host or alias": "SSH 호스트 또는 별칭",
  "Search hosts or type devbox": "호스트를 검색하거나 devbox 입력",
  "Loading hosts…": "호스트 불러오는 중…",
  'No hosts match "': '일치하는 호스트가 없습니다: "',
  Username: "사용자 이름",
  Port: "포트",
  "Add Environment": "환경 추가",
  "Pair this machine again over another address, such as its Tailscale name. It joins the existing routes instead of adding a second machine.":
    "Tailscale 이름 등 다른 주소로 이 컴퓨터를 다시 페어링합니다. 컴퓨터를 새로 추가하지 않고 기존 접속 경로에 합칩니다.",
  "Pair another environment to this client.": "다른 환경을 이 클라이언트와 페어링합니다.",
  "Remote link": "원격 연결",
  "Enter a backend host and pairing code.": "백엔드 호스트와 페어링 코드를 입력하세요.",
  "Use local SSH config, agent, and tunnels for the backend.":
    "로컬 SSH 설정, 에이전트와 터널로 백엔드에 연결합니다.",
  "Adding...": "추가 중…",
  "Add a CLIProxyAPI hub": "CLIProxyAPI 허브 추가",
  "Show the quota of every account the hub pools, next to the providers on":
    "허브에 묶인 각 계정의 사용 한도를 다음 환경의 제공자와 함께 표시합니다:",
  ". The key stays on that server.": ". 키는 해당 서버에만 저장됩니다.",
  "Hub URL": "허브 URL",
  "Label (optional)": "이름 (선택 사항)",
  "Defaults to the hub's host name": "비워 두면 허브의 호스트 이름 사용",
  "Add hub": "허브 추가",
  Unarchive: "보관 해제",
  "Failed to unarchive thread": "대화 보관을 해제하지 못했습니다",
  "Failed to delete thread": "대화를 삭제하지 못했습니다",
  "Loading archived threads": "보관된 대화 불러오는 중",
  "Could not load archived threads": "보관된 대화를 불러오지 못했습니다",
  "No archived threads": "보관된 대화가 없습니다",
  "Checking connected environments.": "연결된 환경을 확인하고 있습니다.",
  "Archived threads will appear here.": "보관된 대화가 여기에 표시됩니다.",
  "Archived thread action failed": "보관된 대화 작업에 실패했습니다",
  " · Created ": " · 생성일 ",
  "Granted scopes": "허용된 권한",
  "Hosted app link copied": "호스팅 앱 링크를 복사했습니다",
  "Pairing URL copied": "페어링 URL을 복사했습니다",
  "Pairing code copied": "페어링 코드를 복사했습니다",
  "Open it in the browser on the device you want to connect.": "연결할 기기의 브라우저에서 여세요.",
  "Open it in the client you want to pair to this environment.":
    "이 환경과 페어링할 클라이언트에서 여세요.",
  "Paste it into another client to finish pairing.":
    "다른 클라이언트에 붙여 넣어 페어링을 완료하세요.",
  "Could not copy hosted app link": "호스팅 앱 링크를 복사하지 못했습니다",
  "Could not copy pairing URL": "페어링 URL을 복사하지 못했습니다",
  "Could not copy pairing code": "페어링 코드를 복사하지 못했습니다",
  "Clipboard copy unavailable": "클립보드에 복사할 수 없습니다",
  "Showing the full value instead.": "전체 값을 표시합니다.",
  "Pairing link scopes": "페어링 링크 권한",
  "Create a new link to share from this client.": "이 클라이언트에서 공유할 새 링크를 만드세요.",
  "Copy the token and pair from another client using this backend's reachable host.":
    "토큰을 복사한 뒤 이 백엔드에 접속할 수 있는 호스트 주소를 사용해 다른 클라이언트에서 페어링하세요.",
  Share: "공유",
  "Copy code": "코드 복사",
  "Show link": "링크 표시",
  "Show code": "코드 표시",
  "Hosted app pairing link": "호스팅 앱 페어링 링크",
  "Pairing link": "페어링 링크",
  "Clipboard copy is unavailable here. Open or manually copy this hosted app link on the device you want to connect.":
    "여기서는 클립보드에 복사할 수 없습니다. 연결할 기기에서 이 호스팅 앱 링크를 열거나 직접 복사하세요.",
  "Clipboard copy is unavailable here. Open or manually copy this full pairing URL on the device you want to connect.":
    "여기서는 클립보드에 복사할 수 없습니다. 연결할 기기에서 전체 페어링 URL을 열거나 직접 복사하세요.",
  "Clipboard copy is unavailable here. Manually copy this code into another client.":
    "여기서는 클립보드에 복사할 수 없습니다. 이 코드를 다른 클라이언트에 직접 복사하세요.",
  "Pairing link. Scan to open on another device": "페어링 링크. 스캔하여 다른 기기에서 열기",
  "Revoking…": "권한 해제 중…",
  Revoke: "권한 해제",
  "Endpoint the pairing QR code and URL use": "페어링 QR 코드와 URL에 사용할 주소",
  "Reach this machine via": "이 컴퓨터의 접속 주소",
  "Copy link": "링크 복사",
  "Copy code only": "코드만 복사",
  "No QR for this endpoint. Another device scanning a loopback link would dial itself; copy the URL for use on this machine instead.":
    "이 주소에는 QR 코드가 없습니다. 다른 기기에서 루프백 링크를 스캔하면 자기 자신에 접속합니다. 이 컴퓨터에서 사용할 URL을 복사하세요.",
  "This device": "이 기기",
  "Client scopes": "클라이언트 권한",
  "Could not create pairing URL": "페어링 URL을 만들지 못했습니다",
  "Revoke others": "다른 기기 권한 해제",
  "Create pairing link": "페어링 링크 만들기",
  "Generate a one-time link that another device can use to pair with this backend as an authorized client.":
    "다른 기기를 이 백엔드의 허용된 클라이언트로 페어링하는 일회용 링크를 만듭니다.",
  "Client label (optional)": "클라이언트 이름 (선택 사항)",
  "e.g. Living room iPad": "예: 거실 iPad",
  "Limit what the paired client can do.": "페어링한 클라이언트에서 할 수 있는 작업을 제한합니다.",
  "Read only": "읽기 전용",
  Standard: "표준",
  "Select at least one permission.": "권한을 하나 이상 선택하세요.",
  "This client can create or revoke access for other devices.":
    "이 클라이언트에서 다른 기기의 접근 권한을 부여하거나 해제할 수 있습니다.",
  "Creating…": "만드는 중…",
  "No pairing links or client sessions.": "페어링 링크나 클라이언트 세션이 없습니다.",
  "Setup required": "설정 필요",
  "Set as default": "기본값으로 설정",
  Hide: "숨기기",
  "Reachable at": "접속 주소",
  "Pause when host is locked": "호스트가 잠기면 일시 중지",
  "Pause on host low power": "호스트가 저전력 모드이면 일시 중지",
  "Pause on client low power": "클라이언트가 저전력 모드이면 일시 중지",
  "Pause on battery": "배터리 사용 시 일시 중지",
  "Background Activity": "백그라운드 활동",
  "Tune the shared power policy and the background intervals that feed it.":
    "공통 전원 정책과 백그라운드 작업 간격을 조정합니다.",
  "Shared policy": "공통 정책",
  "Controls whether background work may run after a subscribed interval fires.":
    "설정한 간격이 지났을 때 백그라운드 작업을 실행할지 결정합니다.",
  "Shared background policy": "공통 백그라운드 정책",
  "Refresh remote branch status in the background.":
    "백그라운드에서 원격 브랜치 상태를 새로고침합니다.",
  "Provider health interval": "제공자 상태 확인 간격",
  "Refresh provider availability, versions, and auth state. Model catalog updates follow Provider update checks.":
    "제공자의 사용 가능 여부, 버전과 인증 상태를 새로고침합니다. 모델 목록은 제공자 업데이트 확인 시 갱신합니다.",
  "Host power monitor": "호스트 전원 확인",
  "Poll host power state while clients are active.":
    "클라이언트가 활성 상태일 때 호스트의 전원 상태를 확인합니다.",
  "Idle host monitor": "유휴 호스트 확인",
  "Poll host power state when no foreground client is active.":
    "활성 클라이언트가 없을 때 호스트의 전원 상태를 확인합니다.",
  "This shared policy gates background work such as Git refreshes and provider health probes after their individual intervals elapse.":
    "각 작업의 간격이 지난 뒤 Git 새로고침이나 제공자 상태 확인 같은 백그라운드 작업을 실행할지 공통 정책으로 결정합니다.",
  "background activity": "백그라운드 활동",
  "Background activity profile": "백그라운드 활동 프로필",
  "Configure advanced background activity": "백그라운드 활동 고급 설정",
  "Configure background activity": "백그라운드 활동 설정",
  Quit: "종료",
  "is open, so its cookies can’t be read yet. Quit it, then continue.":
    "실행 중이어서 쿠키를 읽을 수 없습니다. 종료한 뒤 계속하세요.",
  "I’ve quit it": "종료했습니다",
  "Full Disk Access": "전체 디스크 접근 권한",
  "Access is still required. Quit and reopen Liverary if you just allowed it, then retry the import.":
    "아직 접근 권한이 필요합니다. 방금 허용했다면 Liverary를 종료하고 다시 연 뒤 가져오기를 다시 시도하세요.",
  "If access doesn't update after you allow it, quit and reopen Liverary, then retry the import.":
    "허용한 뒤에도 접근 권한이 바뀌지 않으면 Liverary를 종료하고 다시 연 뒤 가져오기를 다시 시도하세요.",
  From: "가져올 프로필",
  Into: "저장할 프로필",
  "New profile": "새 프로필",
  "Importing cookies": "쿠키 가져오는 중",
  "This may take a moment.": "잠시 기다려 주세요.",
  "Importing…": "가져오는 중…",
  Checking: "확인 중",
  "Checking Full Disk Access.": "전체 디스크 접근 권한을 확인하고 있습니다.",
  "Checking whether the browser has closed.": "브라우저가 종료되었는지 확인하고 있습니다.",
  "Checking access…": "접근 권한 확인 중…",
  "No cookies found": "쿠키가 없습니다",
  Skipped: "건너뜀",
  Close: "닫기",
  "Try again": "다시 시도",
  "Couldn't prepare the changes. Check Advanced for help.":
    "변경사항을 준비하지 못했습니다. 고급 설정에서 도움말을 확인하세요.",
  "Shortcut saved": "단축키를 저장했습니다",
  "Couldn't save your shortcut. Review the changes and try again.":
    "단축키를 저장하지 못했습니다. 변경사항을 확인하고 다시 시도하세요.",
  Shortcut: "단축키",
  "Press your shortcut. Esc cancels.": "단축키를 누르세요. Esc를 누르면 취소합니다.",
  "Saved, but the shortcut needs attention. Check Advanced for help.":
    "저장했지만 단축키를 확인해야 합니다. 고급 설정에서 도움말을 확인하세요.",
  "Shortcut removed.": "단축키를 삭제했습니다.",
  "Review the change below to remove your shortcut.":
    "아래 변경사항을 확인하고 단축키를 삭제하세요.",
  "Review the change below, then save your shortcut.":
    "아래 변경사항을 확인한 뒤 단축키를 저장하세요.",
  "There's no capture shortcut to remove.": "삭제할 캡처 단축키가 없습니다.",
  "This shortcut is already set up.": "이미 설정된 단축키입니다.",
  "Shortcut changes": "단축키 변경사항",
  "Only these changes will be saved. We'll keep a backup.":
    "표시된 변경사항만 저장하며 백업을 남깁니다.",
  "Saving…": "저장 중…",
  "Save shortcut": "단축키 저장",
  "Remove shortcut": "단축키 삭제",
  "Allow Liverary to read your desktop settings. You'll review any changes here before saving.":
    "Liverary가 데스크톱 설정을 읽도록 허용하세요. 저장하기 전에 여기서 변경사항을 확인할 수 있습니다.",
  "Preparing changes…": "변경사항 준비 중…",
  "Review changes": "변경사항 확인",
  "Connecting to your desktop…": "데스크톱에 연결하는 중…",
  "Restart Liverary to finish connecting your shortcut.":
    "단축키 연결을 완료하려면 Liverary를 다시 시작하세요.",
  Troubleshooting: "문제 해결",
  "Settings file": "설정 파일",
  "Liverary also reads any files included by this file.":
    "이 파일이 포함하는 다른 설정 파일도 읽습니다.",
  "Linked to": "연결 대상",
  ". The link will be kept.": ". 연결은 유지됩니다.",
  "Choose a different file…": "다른 파일 선택…",
  "Remove shortcut…": "단축키 삭제…",
  "Use your desktop's shortcut settings file.": "데스크톱의 단축키 설정 파일을 사용하세요.",
  "A custom --config or NIRI_CONFIG can change its location.":
    "--config 또는 NIRI_CONFIG 설정에 따라 위치가 달라질 수 있습니다.",
  "On Omarchy, use your own bindings file, not its defaults.":
    "Omarchy에서는 기본 파일 대신 사용자 단축키 파일을 사용하세요.",
  "Backup:": "백업:",
  "Manual setup": "수동 설정",
  "Paste this inside binds { … } in your Niri config, then save.":
    "Niri 설정의 binds { … } 안에 붙여 넣고 저장하세요.",
  "Add this binding to your Hyprland config, then save.":
    "Hyprland 설정에 이 단축키를 추가하고 저장하세요.",
  "Change the keys if needed.": "필요하면 키 조합을 바꾸세요.",
  Copied: "복사됨",
  "Copy shortcut": "단축키 복사",
  "Turn capture off in Liverary to stop it. Remove the shortcut from":
    "캡처를 중지하려면 Liverary에서 캡처를 끄세요. 단축키를 삭제할 파일:",
  "to free up the keys.": "에서 삭제하면 키 조합을 다시 사용할 수 있습니다.",
  "I've added the shortcut": "단축키를 추가했습니다",
  "Manage usage": "사용량 관리",
  "Your ChatGPT plan is connected": "ChatGPT 요금제를 연결했습니다",
  "Eligible usage in Liverary uses your ChatGPT plan. Manage your shared usage and any credit settings in ChatGPT.":
    "지원되는 Liverary 사용량에 ChatGPT 요금제가 적용됩니다. 공용 사용량과 크레딧 설정은 ChatGPT에서 관리하세요.",
  Details: "자세히",
  "Diagnostics copied": "진단 정보를 복사했습니다",
  "Could not copy diagnostics": "진단 정보를 복사하지 못했습니다",
  "What to try": "시도할 방법",
  "More info": "추가 정보",
  "Retry now": "지금 다시 시도",
  "Copy diagnostics": "진단 정보 복사",
  "Add direct route": "직접 접속 경로 추가",
  Database: "데이터베이스",
  "Reclaim freed database space": "사용하지 않는 데이터베이스 공간 회수",
  "Old history is cleaned up automatically, but these databases still hold the freed space. Run the command on each machine to return it to disk; it pauses and restarts the background service. Quit the desktop app first if it hosts the environment.":
    "이전 기록은 자동으로 정리되지만 데이터베이스 파일에는 빈 공간이 남습니다. 각 컴퓨터에서 명령을 실행하면 해당 공간을 디스크에 반환하며, 백그라운드 서비스를 일시 중지했다가 다시 시작합니다. 데스크톱 앱이 환경을 호스팅한다면 먼저 앱을 종료하세요.",
  Dismiss: "닫기",
  "Add device host": "기기 호스트 추가",
  "Edit device host": "기기 호스트 편집",
  "Hosts on the same machine are skipped.": "같은 컴퓨터의 호스트는 건너뜁니다.",
  "SSH target": "SSH 접속 대상",
  "user@host or SSH alias": "user@host 또는 SSH 별칭",
  "SSH options": "SSH 옵션",
  "Identity file": "인증 키 파일",
  "SSH config default": "SSH 설정 기본값",
  "Optional. Resolved separately on each environment.":
    "선택 사항입니다. 각 환경에서 개별적으로 경로를 확인합니다.",
  "Test connection": "연결 테스트",
  "Already available locally": "이미 로컬에서 사용 가능",
  Failed: "실패",
  Connected: "연결됨",
  "Show error": "오류 표시",
  "Save host": "호스트 저장",
  "Android list may be incomplete": "Android 목록이 일부 누락될 수 있습니다",
  Starting: "시작 중",
  "Device host not saved": "기기 호스트를 저장하지 못했습니다",
  "Connected or already available locally on each selected environment.":
    "선택한 각 환경에 연결되었거나 이미 로컬에서 사용할 수 있습니다.",
  Edit: "편집",
  More: "더 보기",
  "Simulators and emulators installed on each environment's own machine.":
    "각 환경의 컴퓨터에 설치된 시뮬레이터와 에뮬레이터입니다.",
  "Simulators and emulators installed on this environment's machine.":
    "이 환경의 컴퓨터에 설치된 시뮬레이터와 에뮬레이터입니다.",
  "Testing connection": "연결 테스트 중",
  "Can't connect": "연결할 수 없음",
  "Add source": "소스 추가",
  "Machine over SSH": "SSH로 컴퓨터 연결",
  "EAS Simulator": "EAS 시뮬레이터",
  "Simlock pool (alpha)": "Simlock 풀 (알파)",
  "available on some": "일부 환경에서 사용 가능",
  available: "사용 가능",
  "not available": "사용 불가",
  "Not available": "사용 불가",
  "Not set up on this machine.": "이 컴퓨터에 설정되지 않았습니다.",
  "Copied trace ID": "추적 ID를 복사했습니다",
  "Copy trace ID": "추적 ID 복사",
  "Copy full trace ID": "전체 추적 ID 복사",
  Memory: "메모리",
  Type: "유형",
  Kill: "강제 종료",
  "No live descendant processes found.": "실행 중인 하위 프로세스가 없습니다.",
  Avg: "평균",
  "%, peak": "%, 최대",
  "Process history period": "프로세스 기록 기간",
  Process: "프로세스",
  "CPU Time": "CPU 사용 시간",
  Current: "현재",
  Average: "평균",
  Peak: "최대",
  "Max Mem": "최대 메모리",
  "Could not confirm signal": "신호 전송을 확인하지 못했습니다",
  "Process already exited": "이미 종료된 프로세스입니다",
  "The process is not a child of the Liverary server. It might already have exited.":
    "Liverary 서버의 하위 프로세스가 아닙니다. 이미 종료되었을 수 있습니다.",
  "Connect an environment to see diagnostics.": "진단 정보를 보려면 환경을 연결하세요.",
  "Checking diagnostics access…": "진단 정보 접근 권한 확인 중…",
  "Live Processes": "실행 중인 프로세스",
  "Refresh process diagnostics": "프로세스 진단 새로고침",
  "Child Processes": "하위 프로세스",
  "Total CPU across live child processes of the current server process. The desktop shell and other parent processes are not included.":
    "현재 서버의 실행 중인 하위 프로세스가 사용하는 전체 CPU입니다. 데스크톱 셸과 상위 프로세스는 포함하지 않습니다.",
  "Total resident memory across live child processes of the current server process. The desktop shell and other parent processes are not included.":
    "현재 서버의 실행 중인 하위 프로세스가 사용하는 전체 상주 메모리입니다. 데스크톱 셸과 상위 프로세스는 포함하지 않습니다.",
  "Server PID": "서버 PID",
  "Loading live processes...": "실행 중인 프로세스 불러오는 중…",
  "Resource History": "리소스 기록",
  "Refresh resource history": "리소스 기록 새로고침",
  "Approximate active CPU time for the Liverary server root process and its descendants during the selected window. It grows only while sampled processes use CPU and older samples leave as the window moves.":
    "선택한 기간에 Liverary 서버의 루트 프로세스와 하위 프로세스가 사용한 대략적인 CPU 시간입니다. 수집한 프로세스가 CPU를 사용할 때만 증가하며, 기간이 지나면 오래된 표본은 제외됩니다.",
  Samples: "표본",
  "In-memory process samples retained by the server. The server samples only while diagnostics is open, and this resets when the server restarts.":
    "서버 메모리에 보관된 프로세스 표본입니다. 진단 화면이 열려 있을 때만 수집하며 서버를 다시 시작하면 초기화됩니다.",
  Interval: "간격",
  Processes: "프로세스",
  "Collecting process resource samples...": "프로세스 리소스 표본 수집 중…",
  "No process resource samples found for this window.":
    "이 기간의 프로세스 리소스 표본이 없습니다.",
  "Trace Diagnostics": "추적 진단",
  "Open logs folder": "로그 폴더 열기",
  "Refresh trace diagnostics": "추적 진단 새로고침",
  Spans: "구간",
  "Slow Spans": "느린 구간",
  "Spans at or above the configured slow-span threshold.": "설정한 지연 기준 이상 걸린 구간입니다.",
  "Parse Errors": "분석 오류",
  "Latest Failures": "최근 실패",
  "Loading failures...": "실패 기록 불러오는 중…",
  "No failed spans found.": "실패한 구간이 없습니다.",
  "Most Common Failures": "자주 발생하는 실패",
  "Loading failure groups...": "실패 유형 불러오는 중…",
  "No repeated failures found.": "반복된 실패가 없습니다.",
  "Slowest Spans": "가장 느린 구간",
  "Loading slow spans...": "느린 구간 불러오는 중…",
  "No spans found.": "구간이 없습니다.",
  "Span Logs": "구간 로그",
  Time: "시간",
  Level: "수준",
  Span: "구간",
  Message: "메시지",
  Trace: "추적",
  "Loading recent logs...": "최근 로그 불러오는 중…",
  "No warnings or errors found.": "경고나 오류가 없습니다.",
  "Top Span Names": "자주 실행되는 구간",
  "Loading span names...": "구간 이름 불러오는 중…",
  "Add EAS host": "EAS 호스트 추가",
  "Edit EAS host": "EAS 호스트 편집",
  "The environment's server signs in to Expo and starts the sessions. Without a token here it uses EXPO_TOKEN, then its eas login.":
    "환경의 서버에서 Expo에 로그인하고 세션을 시작합니다. 여기 토큰이 없으면 EXPO_TOKEN을 사용하고, 없으면 eas 로그인을 사용합니다.",
  "Clear access token": "액세스 토큰 지우기",
  "Checking the Expo account…": "Expo 계정 확인 중…",
  "Check the Expo account before choosing a project.":
    "프로젝트를 선택하기 전에 Expo 계정을 확인하세요.",
  "Check account": "계정 확인",
  "EAS project": "EAS 프로젝트",
  "From the thread's project": "대화의 프로젝트에서 가져오기",
  "Sessions bill the project's Expo account. \"From the thread's project\" reads extra.eas.projectId from the project's app config.":
    "세션 요금은 프로젝트의 Expo 계정에 청구됩니다. '대화의 프로젝트에서 가져오기'는 프로젝트 앱 설정의 extra.eas.projectId를 읽습니다.",
  "Expo allows sessions of up to 40 minutes on free accounts and 115 on paid ones, and ends one after the idle minutes without activity, so idle minutes must be smaller than session minutes.":
    "Expo 세션은 무료 계정에서 최대 40분, 유료 계정에서 최대 115분입니다. 설정한 유휴 시간 동안 활동이 없으면 종료되므로 유휴 시간은 세션 시간보다 짧아야 합니다.",
  " Saving restarts this host, which stops its running sessions.":
    " 저장하면 호스트가 다시 시작되어 실행 중인 세션이 종료됩니다.",
  Icon: "아이콘",
  "In use": "사용 중",
  " · found automatically": " · 자동 감지",
  "Remove route": "접속 경로 삭제",
  "Tab size for you and agents. Fill fits the panel; other sizes show the device toolbar.":
    "사용자와 에이전트가 사용할 탭 크기입니다. 패널 채우기는 패널에 맞추고, 다른 크기는 기기 도구 모음을 표시합니다.",
  "default browser viewport": "기본 브라우저 화면 크기",
  "Fill panel": "패널 채우기",
  Responsive: "반응형",
  "Default viewport width": "기본 화면 너비",
  "Default viewport height": "기본 화면 높이",
  Rotate: "회전",
  "Page zoom applied to new browser tabs.": "새 브라우저 탭에 적용할 페이지 확대 비율입니다.",
  "default browser zoom": "기본 브라우저 확대 비율",
  "The color scheme pages are told to prefer. System follows your OS setting.":
    "페이지에 전달할 기본 색상 모드입니다. 시스템을 선택하면 운영체제 설정을 따릅니다.",
  "default browser appearance": "기본 브라우저 화면 모드",
  "Show pressed keys and shortcuts in new recordings. Password fields are excluded.":
    "새 녹화에 누른 키와 단축키를 표시합니다. 비밀번호 필드는 제외합니다.",
  "Highlight mouse presses and held buttons in new recordings.":
    "새 녹화에서 마우스 클릭과 누르고 있는 버튼을 강조합니다.",
  "Maximum recording rate. 30 fps saves CPU and storage; 60 fps is smoother.":
    "최대 녹화 프레임 속도입니다. 30fps는 CPU와 저장 공간을 절약하고, 60fps는 더 부드럽습니다.",
  "browser recording frame rate": "브라우저 녹화 프레임 속도",
  "Where links in the chat and terminal open. Hold ⌘ or Ctrl while clicking a link to open it in your default browser either way.":
    "대화와 터미널의 링크를 열 위치입니다. ⌘ 또는 Ctrl을 누른 채 클릭하면 이 설정과 관계없이 기본 브라우저에서 엽니다.",
  "link target": "링크 열기 위치",
  "What the address bar searches when you type something that isn't a URL.":
    "주소 표시줄에 URL이 아닌 내용을 입력할 때 사용할 검색 엔진입니다.",
  "search engine": "검색 엔진",
  "Use %s where the search terms go.": "검색어가 들어갈 위치에 %s를 넣으세요.",
  "Enter an http or https URL containing %s. Searches use DuckDuckGo until then.":
    "%s가 포함된 http 또는 https URL을 입력하세요. 입력하기 전에는 DuckDuckGo를 사용합니다.",
  "Clicking a pull request link opens it in Liverary. Turn off to open pull request links like any other link, on your git host.":
    "Pull Request 링크를 클릭하면 Liverary에서 엽니다. 끄면 다른 링크처럼 Git 호스트에서 엽니다.",
  "open pull requests in Liverary": "Liverary에서 Pull Request 열기",
  "Open pull requests in Liverary": "Liverary에서 Pull Request 열기",
  "Device settings not saved on all environments": "일부 환경에 기기 설정을 저장하지 못했습니다",
  "Updating…": "업데이트 중…",
  "Check versions": "버전 확인",
  "Open simulators and emulators in the Device panel. Hub:":
    "기기 패널에서 시뮬레이터와 에뮬레이터를 엽니다. 허브:",
  "Device hub": "기기 허브",
  "New agent sessions can open and drive these devices. agent-device:":
    "새 에이전트 세션에서 이 기기를 열고 조작할 수 있습니다. agent-device:",
  "Agent device access": "에이전트 기기 접근",
  "Allow agents in this project to use the shared browser. Applies when the agent session next starts.":
    "이 프로젝트의 에이전트가 공용 브라우저를 사용하도록 허용합니다. 다음 에이전트 세션부터 적용합니다.",
  "Allow agents to use the shared browser. Projects can override it.":
    "에이전트가 공용 브라우저를 사용하도록 허용합니다. 프로젝트에서 재정의할 수 있습니다.",
  "default browser access": "기본 브라우저 접근",
  "Show the floating preview when an agent opens a browser or device unless the agent says otherwise.":
    "에이전트가 별도로 지정하지 않으면 브라우저나 기기를 열 때 떠 있는 미리보기를 표시합니다.",
  "auto-show floating preview": "떠 있는 미리보기 자동 표시",
  "You're not connected to a server yet.": "아직 서버에 연결되지 않았습니다.",
  "Profiles separate cookies and logins. Incognito data is cleared when the app closes.":
    "프로필별로 쿠키와 로그인을 분리합니다. 시크릿 데이터는 앱을 닫으면 삭제됩니다.",
  "Add profile": "프로필 추가",
  "Blank profile": "빈 프로필",
  "You’ve reached the profile limit": "프로필 개수 한도에 도달했습니다",
  "Looking for browsers…": "브라우저 찾는 중…",
  "No supported browsers found": "지원하는 브라우저가 없습니다",
  "Connect to an environment to import cookies": "쿠키를 가져오려면 환경을 연결하세요",
  "Clear cookies and cache": "쿠키와 캐시 지우기",
  "Remove profile and data": "프로필과 데이터 삭제",
  "Connect to an environment to clear profile data": "프로필 데이터를 지우려면 환경을 연결하세요",
  "Checking environments…": "환경 확인 중…",
  "Its cookies and logins are deleted. Desktop tabs already open in this profile stay open until you close them; server browser tabs close now.":
    "이 프로필의 쿠키와 로그인을 삭제합니다. 열려 있는 데스크톱 탭은 직접 닫을 때까지 유지되며 서버 브라우저 탭은 즉시 닫힙니다.",
  "Connect to an environment to remove this profile and its data.":
    "이 프로필과 데이터를 삭제하려면 환경을 연결하세요.",
  "Removing…": "삭제 중…",
  "Remove profile": "프로필 삭제",
  "You are signed out of its sites. Server browser tabs open in this profile close now.":
    "이 프로필의 사이트에서 로그아웃합니다. 열려 있는 서버 브라우저 탭은 즉시 닫힙니다.",
  "Clear data": "데이터 지우기",
  "Could not open System Settings": "시스템 설정을 열지 못했습니다",
  "Open Privacy & Security → Full Disk Access manually.":
    "개인정보 보호 및 보안 → 전체 디스크 접근 권한을 직접 여세요.",
  "Agent access": "에이전트 접근",
  Browsing: "탐색",
  Recordings: "녹화",
  Beta: "베타",
  "Group sidebar threads into project folders. Pinned threads stay on top, and Snoozed and Settled stay below the folders.":
    "사이드바 대화를 프로젝트 폴더로 묶습니다. 고정한 대화는 위에, 미룬 대화와 정리한 대화는 폴더 아래에 표시합니다.",
  "In the boring sidebar, show folder threads on two lines: the title, then the branch, pull request, and agent.":
    "간단한 사이드바의 폴더 안 대화를 두 줄로 표시합니다. 첫 줄은 제목, 다음 줄은 브랜치, Pull Request와 에이전트입니다.",
  ". While it is off, every guest link stops working.": ". 끄면 모든 게스트 링크가 중지됩니다.",
  "Let agents here work on your other machines, and theirs here. Turn it on for each machine, then link them in":
    "이 컴퓨터와 다른 컴퓨터의 에이전트가 서로 작업하도록 허용합니다. 각 컴퓨터에서 켠 뒤 연결하세요:",
  ". While it is off, nothing new starts over a link; tasks already running finish.":
    ". 끄면 연결을 통한 새 작업은 시작하지 않으며 실행 중인 작업은 완료합니다.",
  "Let the Device panel lease simulators and emulators from your own":
    "기기 패널에서 사용자 소유의",
  "pool, added in": "풀에 있는 시뮬레이터와 에뮬레이터를 빌릴 수 있습니다. 추가 위치:",
  ". An alpha that may change or break. Liverary never installs Simlock.":
    ". 변경되거나 작동하지 않을 수 있는 알파 기능입니다. Liverary에서 Simlock을 설치하지는 않습니다.",
  "Simlock device hosts": "Simlock 기기 호스트",
  "What agents here may do there": "이 에이전트가 상대 환경에서 할 수 있는 작업",
  "An agent never gets more access there than its own mode here. Below full access, it can change only threads this link started, not that machine's own threads, projects or settings.":
    "에이전트의 상대 환경 권한은 현재 모드보다 높을 수 없습니다. 전체 접근 미만이면 이 연결에서 시작한 대화만 바꿀 수 있고, 상대 컴퓨터의 기존 대화·프로젝트·설정은 바꿀 수 없습니다.",
  "unlink environment": "환경 연결 해제",
  "link environment": "환경 연결",
  Linked: "연결됨",
  "Not connected": "연결되지 않음",
  "Another address…": "다른 주소…",
  Prefer: "우선 사용",
  Normal: "보통",
  "Less often": "사용 빈도 낮춤",
  "Manual only": "수동으로만",
  "Automatically balance load": "자동 부하 분산",
  "New threads in shared projects start on the machine with the most free CPU and memory, weighted by each machine's preference.":
    "공유 프로젝트의 새 대화를 각 컴퓨터의 우선순위와 사용 가능한 CPU·메모리를 고려해 가장 여유로운 컴퓨터에서 시작합니다.",
  "The license manifest could not load.": "라이선스 목록을 불러오지 못했습니다.",
  "The license manifest took too long to load.": "라이선스 목록을 불러오는 시간이 초과되었습니다.",
  "Project source": "프로젝트 소스",
  "Search open-source licenses": "오픈 소스 라이선스 검색",
  "Search licenses": "라이선스 검색",
  "Open-source notices are unavailable": "오픈 소스 고지사항을 사용할 수 없습니다",
  "Third-party notices": "외부 라이선스 고지사항",
  "No licenses match that search.": "검색 결과와 일치하는 라이선스가 없습니다.",
  "Loading open-source notices…": "오픈 소스 고지사항 불러오는 중…",
  "Replay panel animation preview": "패널 애니메이션 미리보기 다시 재생",
  "Send SIGINT": "SIGINT 보내기",
  "Send SIGKILL": "SIGKILL 보내기",
  Repositories: "저장소",
  "Choose project icon": "프로젝트 아이콘 선택",
  "Could not open image picker": "이미지 선택기를 열지 못했습니다",
  "Search image files…": "이미지 파일 검색…",
  "Choose an icon, emoji, or monogram.": "아이콘, 이모지 또는 글자를 선택하세요.",
  "Icon type": "아이콘 유형",
  Icons: "아이콘",
  Emoji: "이모지",
  Monogram: "글자",
  Color: "색상",
  "Icon color": "아이콘 색상",
  "Search Lucide icons": "Lucide 아이콘 검색",
  "Search all Lucide icons": "모든 Lucide 아이콘 검색",
  "No icons found.": "아이콘이 없습니다.",
  Letters: "글자",
  "One or two letters or numbers.": "글자나 숫자 한두 개를 입력하세요.",
  "Or paste any emoji": "이모지를 붙여 넣을 수도 있습니다",
  "Custom emoji": "사용자 지정 이모지",
  "Paste an emoji": "이모지 붙여넣기",
  "Save icon": "아이콘 저장",
  "Show all environments": "모든 환경 표시",
  "Choose a project to manage its name, icon, checkouts and actions.":
    "이름, 아이콘, 체크아웃과 작업을 관리할 프로젝트를 선택하세요.",
  "Provider sign-in terminal": "제공자 로그인 터미널",
  "Read PRs": "PR 읽기",
  "Read and act": "읽기 및 작업",
  "Machines you trust here can read PR data through each other's source control access. Enable both machines. Read and act may use broader permissions than the machine that owns them. This applies only to this device.":
    "허용한 컴퓨터끼리 서로의 소스 제어 권한으로 PR 데이터를 읽을 수 있습니다. 양쪽 컴퓨터에서 켜세요. '읽기 및 작업'은 권한을 소유한 컴퓨터보다 넓은 권한을 사용할 수 있습니다. 이 기기에만 적용됩니다.",
  "Could not save pull request routing permission":
    "Pull Request 라우팅 권한을 저장하지 못했습니다",
  "Waiting for sample": "표본 대기 중",
  Updated: "업데이트됨",
  process: "프로세스",
  processes: "프로세스",
  Read: "읽기",
  Write: "쓰기",
  "Available when this page runs inside the desktop app.":
    "데스크톱 앱에서 이 화면을 열면 사용할 수 있습니다.",
  "Desktop only": "데스크톱 전용",
  "Resource history period": "리소스 기록 기간",
  "CPU average": "평균 CPU",
  "I/O reads": "I/O 읽기",
  "I/O writes": "I/O 쓰기",
  "CPU avg": "평균 CPU",
  "CPU peak": "최대 CPU",
  Category: "분류",
  "Read/s": "읽기/초",
  "Write/s": "쓰기/초",
  "Read Total": "누적 읽기",
  "Write Total": "누적 쓰기",
  "Waiting for the native process monitor.": "네이티브 프로세스 모니터를 기다리는 중입니다.",
  "Peak CPU": "최대 CPU",
  "Peak Mem": "최대 메모리",
  "No retained process samples in this window.": "이 기간에 보관된 프로세스 표본이 없습니다.",
  Component: "구성요소",
  Operation: "작업",
  "Logical Read": "논리적 읽기",
  "Logical Write": "논리적 쓰기",
  Count: "횟수",
  "No instrumented application I/O has been recorded yet.": "아직 기록된 앱 I/O 계측값이 없습니다.",
  "Could not restart resource monitor": "리소스 모니터를 다시 시작하지 못했습니다",
  "The resource monitor retry failed.": "리소스 모니터 재시도에 실패했습니다.",
  "Resource monitor": "리소스 모니터",
  Native: "네이티브",
  "Refresh resource telemetry": "리소스 계측 새로고침",
  "Refresh telemetry snapshot": "계측 현황 새로고침",
  "Liverary system footprint": "Liverary 시스템 사용량",
  "Live native counters for the server, providers, terminals, desktop processes, and the monitor itself.":
    "서버, 제공자, 터미널, 데스크톱 프로세스와 모니터 자체의 실시간 네이티브 계측값입니다.",
  "Sampling every": "수집 간격",
  "Current CPU": "현재 CPU",
  "Resident memory": "상주 메모리",
  "Process count": "프로세스 수",
  "Read throughput": "읽기 처리량",
  "Write throughput": "쓰기 처리량",
  "CPU speed limit": "CPU 속도 제한",
  "Backend + agents": "백엔드 및 에이전트",
  Desktop: "데스크톱",
  "Monitor overhead": "모니터 자체 사용량",
  "Host & collection": "호스트 및 수집",
  "Retry monitor": "모니터 다시 시도",
  "Host state": "호스트 상태",
  "Power source": "전원 공급",
  "Low power mode": "저전력 모드",
  Idle: "유휴",
  Session: "세션",
  Thermal: "발열",
  "Desktop host signals not connected": "데스크톱 호스트 상태가 연결되지 않았습니다",
  "Power, idle, lock, and thermal state are supplied by the desktop host. Process telemetry remains fully active in this browser session.":
    "전원, 유휴, 잠금과 발열 상태는 데스크톱 호스트에서 제공합니다. 이 브라우저 세션의 프로세스 계측은 계속 작동합니다.",
  "Collection health": "수집 상태",
  "Native process monitor": "네이티브 프로세스 모니터",
  "Electron main process": "Electron 메인 프로세스",
  "Collection time": "수집 시간",
  "Process scan": "프로세스 검색",
  Inaccessible: "접근 불가",
  Sidecar: "보조 프로세스",
  Restarts: "재시작 횟수",
  "Waiting for collector health.": "수집기 상태를 기다리는 중입니다.",
  "Resource timeline": "리소스 시간별 기록",
  "Live process tree": "실시간 프로세스 트리",
  "Identity:": "식별 기준:",
  "PID + start time": "PID 및 시작 시간",
  "Instrumented application I/O": "앱 I/O 계측",
  "Logical bytes by operation": "작업별 논리적 바이트",
  "Native counters identify which process is reading or writing. These application-level counters identify known Liverary operations so process spikes can be correlated with specific persistence and logging paths.":
    "네이티브 계측값으로 읽기·쓰기 중인 프로세스를 확인합니다. 앱 계측값은 Liverary 작업을 구분하므로 프로세스 사용량 급증을 특정 저장·로그 작업과 연결해 볼 수 있습니다.",
  "Trace ID copied": "추적 ID를 복사했습니다",
  "Could not copy trace ID": "추적 ID를 복사하지 못했습니다",
  Routes: "접속 경로",
  Update: "업데이트",
  "Client not supported": "지원하지 않는 클라이언트",
  "Switch off": "끄기",
  "Switch on": "켜기",
  "Hide routes": "접속 경로 숨기기",
  "Copy MCP URL": "MCP URL 복사",
  "Remove from this device…": "이 기기에서 삭제…",
  "Get more tunnels": "터널 추가 확보",
  "The managed tunnel was removed. Agent activity publishing stays on.":
    "관리형 터널을 삭제했습니다. 에이전트 활동 게시는 유지합니다.",
  "Agent activity enabled": "에이전트 활동을 켰습니다",
  "Agent activity disabled": "에이전트 활동을 껐습니다",
  "This environment publishes agent activity to your mobile clients.":
    "이 환경의 에이전트 활동을 모바일 클라이언트에 게시합니다.",
  "This environment will stop publishing agent activity.":
    "이 환경의 에이전트 활동 게시를 중지합니다.",
  "Webhooks held while offline": "오프라인 중 웹훅 보관을 켰습니다",
  "Webhooks no longer held": "웹훅 보관을 껐습니다",
  "Requests to an offline environment now fail. Anything already held is still delivered.":
    "오프라인 환경으로 보낸 요청은 이제 실패합니다. 이미 보관된 요청은 계속 전달합니다.",
  "Sign in to send activity to mobile notifications and Live Activities.":
    "모바일 알림과 실시간 현황으로 활동을 보내려면 로그인하세요.",
  "To edit these settings, pair this connection with both View relay and Manage relay permissions.":
    "이 설정을 편집하려면 릴레이 보기와 릴레이 관리 권한을 모두 허용하여 페어링하세요.",
  "No saved remote environments": "저장된 원격 환경이 없습니다",
  "Click “Add environment” to pair another environment.":
    "'환경 추가'를 눌러 다른 환경을 페어링하세요.",
  "Invalid age limit": "요청 유효 시간이 올바르지 않습니다",
  "Invalid webhook settings": "웹훅 설정이 올바르지 않습니다",
  "Coalesce window must be whole seconds from 10 to 3600.":
    "병합 시간은 10~3600초 사이의 정수여야 합니다.",
  Filters: "필터",
  "Run only when every filter matches. Other requests are logged as filtered. Separate “is one of” values with commas; a value can't contain a comma.":
    "모든 필터와 일치할 때만 실행합니다. 나머지 요청은 필터링됨으로 기록합니다. '다음 중 하나'의 값은 쉼표로 구분하며 값 자체에 쉼표를 넣을 수 없습니다.",
  "Add filter": "필터 추가",
  "New task": "새 예약 작업",
  "Unavailable selection": "사용할 수 없는 선택 항목",
  "No environments available": "사용 가능한 환경이 없습니다",
  "Connect an environment to manage scheduled tasks.": "예약 작업을 관리하려면 환경을 연결하세요.",
  "Task unavailable": "작업을 사용할 수 없습니다",
  "No scheduled tasks": "예약 작업이 없습니다",
  "No tasks match this environment and project selection.":
    "선택한 환경과 프로젝트에 해당하는 작업이 없습니다.",
  "Environment disconnected": "환경 연결이 끊어졌습니다",
  "Could not load scheduled tasks": "예약 작업을 불러오지 못했습니다",
  "Loading scheduled tasks…": "예약 작업 불러오는 중…",
  "scheduled task enabled": "예약 작업 사용 여부",
  "scheduled task run now": "예약 작업 지금 실행",
  "scheduled task delete": "예약 작업 삭제",
  "Could not update scheduled task": "예약 작업을 업데이트하지 못했습니다",
  Paused: "일시 중지됨",
  Listening: "요청 대기 중",
  "Next run": "다음 실행",
  "This status tracks request delivery. Check the conversation for the agent's result.":
    "요청 전달 상태입니다. 에이전트의 작업 결과는 대화에서 확인하세요.",
  "This date and time use this device's time zone.":
    "날짜와 시각은 현재 이 기기의 시간대를 기준으로 입력하세요.",
  "Times and weekdays follow the environment's time zone. Runs more than 10 minutes late are skipped.":
    "시각과 요일은 실행 환경의 시간대를 따릅니다. 예약 시각보다 10분 넘게 지연된 실행은 건너뜁니다.",
  "Not scheduled": "예약되지 않음",
  Deliveries: "요청 기록",
  "Run now": "지금 실행",
  "Deliveries ·": "요청 기록 ·",
  "Recent requests to this task's webhook URL.": "이 작업의 웹훅 URL로 들어온 최근 요청입니다.",
  "Loading delivery…": "요청 기록 불러오는 중…",
  "Signature verified": "서명 확인됨",
  "Scheduled run": "예약된 실행",
  "Request prompt": "요청 프롬프트",
  "Run scheduled when the window closes; no run started yet.":
    "병합 시간이 끝나면 실행하도록 예약했습니다. 아직 시작하지 않았습니다.",
  "No prompt is recorded for this request.": "이 요청에 기록된 프롬프트가 없습니다.",
  "Empty placeholders:": "비어 있는 자리표시자:",
  Headers: "헤더",
  Query: "쿼리",
  "Body (truncated)": "본문 (일부 생략)",
  Body: "본문",
  "(empty)": "(비어 있음)",
  "Loading deliveries…": "요청 기록 불러오는 중…",
  "No requests yet.": "아직 요청이 없습니다.",
  "scheduled task rotate webhook token": "예약 작업 웹훅 토큰 교체",
  "The URL appears after you save.": "저장하면 URL이 표시됩니다.",
  "Could not rotate webhook URL": "웹훅 URL을 교체하지 못했습니다",
  "Webhook URL": "웹훅 URL",
  Copy: "복사",
  "Held for up to 24 hours while this environment is offline. ":
    "이 환경이 오프라인이면 최대 24시간 보관합니다. ",
  "Forwarded live. Requests fail while this environment is offline. ":
    "실시간으로 전달합니다. 이 환경이 오프라인이면 요청이 실패합니다. ",
  "Change in Sharing & access": "공유 및 접근 설정에서 변경",
  Destination: "실행 대상",
  "Each run starts a new thread with the workspace and model below.":
    "실행할 때마다 아래 작업 공간과 모델로 새 대화를 시작합니다.",
  "Each run continues this conversation, in its workspace and with its current model.":
    "실행할 때마다 이 대화의 작업 공간과 현재 모델로 대화를 이어갑니다.",
  "scheduled task upsert": "예약 작업 저장",
  "Edit task": "예약 작업 편집",
  "Reconnect this environment before saving.": "저장하기 전에 이 환경에 다시 연결하세요.",
  "Runs on": "실행 환경",
  "This scheduled task no longer exists.": "이 예약 작업은 더 이상 존재하지 않습니다.",
  "e.g. Check for Sentry issues": "예: Sentry 이슈 확인",
  "Select a project": "프로젝트 선택",
  "Create a new worktree": "새 워크트리 만들기",
  "Use the project checkout": "프로젝트 체크아웃 사용",
  "Use a specific checkout": "특정 체크아웃 사용",
  "Base branch": "기준 브랜치",
  "Checkout path": "체크아웃 경로",
  Prompt: "프롬프트",
  "What should the agent do each time this runs?": "실행할 때마다 에이전트가 할 작업을 입력하세요.",
  "This task uses a legacy interval below one minute. Saving updates it to at least one minute.":
    "이 작업은 이전 방식의 1분 미만 간격을 사용합니다. 저장하면 최소 1분으로 바뀝니다.",
  Schedule: "일정",
  "Schedule type": "일정 유형",
  "At a time": "지정한 시간",
  "Every interval": "일정 간격마다",
  "Each request runs the prompt. Use {{body.path}}, {{headers.name}}, {{query.name}}, {{body}} or {{request}} in the prompt; only what it names reaches the agent.":
    "요청마다 프롬프트를 실행합니다. 프롬프트에서 {{body.path}}, {{headers.name}}, {{query.name}}, {{body}} 또는 {{request}}를 사용하세요. 지정한 내용만 에이전트에 전달됩니다.",
  "Skip requests older than": "다음보다 오래된 요청 건너뛰기",
  "Run every request": "모든 요청 실행",
  "Coalesce key": "병합 키",
  "Coalesce window": "병합 시간",
  "Require signature": "서명 필수",
  "Reject requests without a valid HMAC-SHA256 signature of the body.":
    "본문의 유효한 HMAC-SHA256 서명이 없는 요청을 거부합니다.",
  Header: "헤더",
  Prefix: "접두사",
  Encoding: "인코딩",
  Secret: "비밀 값",
  Unchanged: "변경 없음",
  "Shared secret": "공유 비밀 값",
  "Run at": "실행 시간",
  "Days to run": "실행 요일",
  "Run every": "실행 간격",
  minutes: "분",
  Enabled: "사용",
  "Disabled tasks stay saved but do not run.":
    "꺼진 작업은 저장 상태를 유지하며 실행하지 않습니다.",
  "Save task": "예약 작업 저장",
  "Create task": "예약 작업 만들기",
  "This environment does not support this setting. Update Liverary on it.":
    "이 환경은 이 설정을 지원하지 않습니다. 해당 환경의 Liverary를 업데이트하세요.",
  "The save failed. Try reconnecting and saving again.":
    "저장하지 못했습니다. 다시 연결한 뒤 저장해 보세요.",
  "Add a 1Password provider": "1Password 제공자 추가",
  "Provider variables on": "제공자 변수의 환경:",
  "can read values from it by name. Values are read with the op CLI on that server when a provider starts.":
    "에서 이름으로 값을 읽을 수 있습니다. 제공자가 시작할 때 해당 서버의 op CLI로 값을 읽습니다.",
  Personal: "개인용",
  "The account shorthand, sign-in address without https://, or ID that op account list shows.":
    "계정 별칭, https://를 제외한 로그인 주소 또는 op account list에 표시되는 ID입니다.",
  "Save changes": "변경사항 저장",
  Value: "값",
  "Update Liverary on": "비밀 정보 제공자를 관리하려면 Liverary를 업데이트하세요:",
  "to manage its secret providers.": "환경의 비밀 정보 제공자를 관리할 수 있습니다.",
  "Connect an environment to manage the secret providers its provider variables read from.":
    "제공자 변수가 값을 읽는 비밀 정보 제공자를 관리하려면 환경을 연결하세요.",
  "No secret providers configured.": "설정된 비밀 정보 제공자가 없습니다.",
  "Add a 1Password account, then pick it as the source of a provider variable.":
    "1Password 계정을 추가한 뒤 제공자 변수의 소스로 선택하세요.",
  "Provider variables that read from": "다음 제공자에서 값을 읽는 변수는",
  "stop resolving until a provider with the same name is added again. The secrets themselves are untouched.":
    "같은 이름의 제공자를 다시 추가할 때까지 값을 읽지 못합니다. 비밀 값 자체는 바뀌지 않습니다.",
  "Remove provider": "제공자 삭제",
  "These permissions apply to your active route. Other routes may have different permissions.":
    "현재 접속 경로에 적용되는 권한입니다. 다른 경로의 권한은 다를 수 있습니다.",
  "These permissions apply to this client’s current connection.":
    "이 클라이언트의 현재 연결에 적용되는 권한입니다.",
  Allowed: "허용됨",
  "Not granted": "허용되지 않음",
  "Terminal font preview": "터미널 글꼴 미리보기",
  "Red & green": "빨강 및 초록",
  "Add Simlock host": "Simlock 호스트 추가",
  "Edit Simlock host": "Simlock 호스트 편집",
  "Each selected environment's server leases devices from your Simlock gateway with its own agent token, and releases them when they close.":
    "선택한 각 환경의 서버가 자체 에이전트 토큰으로 Simlock 게이트웨이에서 기기를 빌리고, 닫을 때 반환합니다.",
  "The environment's server leases devices from your Simlock gateway and releases them when they close.":
    "환경의 서버가 Simlock 게이트웨이에서 기기를 빌리고, 닫을 때 반환합니다.",
  "Gateway URL": "게이트웨이 URL",
  "Agent token": "에이전트 토큰",
  "Leases, drives, and streams devices. Create one":
    "기기를 빌리고 조작하며 화면을 전송합니다. 토큰 생성 단위:",
  " per environment": " 환경마다 하나",
  with: "생성 명령:",
  ", or leave it blank to add it later. A blank token uses the machine's":
    ". 나중에 추가하려면 비워 두세요. 토큰이 비어 있으면 컴퓨터의",
  "when its": "값을 사용합니다. 다음 값이",
  "is this gateway.": "이 게이트웨이여야 합니다.",
  "A lease ends after the lease minutes even while in use.":
    "사용 중이어도 대여 시간이 지나면 종료됩니다.",
  " Saving restarts this host, which releases its devices.":
    " 저장하면 호스트가 다시 시작되어 기기를 반환합니다.",
  "Clear agent token": "에이전트 토큰 지우기",
  "Could not check this shortcut.": "이 단축키를 확인하지 못했습니다.",
  "Updating capture settings…": "캡처 설정 업데이트 중…",
  "Enable snapshots": "스냅샷 사용",
  "Include text and controls when the app makes them available.":
    "앱에서 제공하면 텍스트와 컨트롤을 포함합니다.",
  "Include app text in snapshots": "스냅샷에 앱 텍스트 포함",
  "Choose a window to capture from any app.": "앱에서 캡처할 창을 선택합니다.",
  "Capture the window you're using without switching apps.":
    "앱을 전환하지 않고 사용 중인 창을 캡처합니다.",
  "Change shortcut": "단축키 변경",
  "Shortcut permissions": "단축키 권한",
  "Choose the sound played when capture starts.": "캡처를 시작할 때 재생할 소리를 선택합니다.",
  "Snapshot sound: ": "스냅샷 소리: ",
  Whoosh: "휙",
  "(Default)": "(기본값)",
  Click: "클릭",
  "Play Whoosh": "휙 소리 재생",
  "Play Click": "클릭 소리 재생",
  "Show a gentle cue on the captured window.": "캡처한 창에 은은한 표시를 띄웁니다.",
  "Flash captured window": "캡처한 창 깜박임",
  "Animate captured windows into your draft.":
    "캡처한 창이 초안으로 들어오는 애니메이션을 표시합니다.",
  "Animate snapshots": "스냅샷 애니메이션",
  Access: "접근 권한",
  "Install the extension": "확장 프로그램 설치",
  "The Liverary GNOME extension lets you capture other windows and bring them into your draft. Sign out once after installing.":
    "Liverary GNOME 확장 프로그램으로 다른 창을 캡처해 초안에 넣을 수 있습니다. 설치 후 한 번 로그아웃하세요.",
  "Extension installed": "확장 프로그램을 설치했습니다",
  "Save your work, then sign out and back in. Your setup will be waiting here.":
    "작업을 저장한 뒤 로그아웃하고 다시 로그인하세요. 설정은 여기에 유지됩니다.",
  "Update the extension": "확장 프로그램 업데이트",
  "Install the update, then sign out and back in.":
    "업데이트를 설치한 뒤 로그아웃하고 다시 로그인하세요.",
  "Allow GNOME extensions": "GNOME 확장 프로그램 허용",
  "Open GNOME Extensions and turn on extensions, then check again.":
    "GNOME 확장 프로그램 앱에서 확장 프로그램을 켠 뒤 다시 확인하세요.",
  "Enable the extension": "확장 프로그램 켜기",
  "Enable Liverary SnapShots to start capturing windows.":
    "창 캡처를 시작하려면 Liverary SnapShots를 켜세요.",
  "Capture is ready": "캡처 준비가 되었습니다",
  "Next, choose your shortcut.": "이제 단축키를 선택하세요.",
  "Automatic capture isn't available": "자동 캡처를 사용할 수 없습니다",
  "Use Take snapshot from the command palette to choose a window.":
    "명령 팔레트의 스냅샷 찍기에서 창을 선택하세요.",
  "Couldn't set up the extension": "확장 프로그램을 설정하지 못했습니다",
  "Check Liverary SnapShots in GNOME Extensions, then try again.":
    "GNOME 확장 프로그램 앱에서 Liverary SnapShots를 확인한 뒤 다시 시도하세요.",
  "Let's try that again": "다시 시도해 보세요",
  "Couldn't check snapshots. Try again to continue.":
    "스냅샷을 확인하지 못했습니다. 계속하려면 다시 시도하세요.",
  "Check capture access": "캡처 접근 권한 확인",
  "The extension isn't ready yet. Try again in a moment.":
    "확장 프로그램이 아직 준비되지 않았습니다. 잠시 후 다시 시도하세요.",
  "Let's fix capture access": "캡처 접근 권한 해결",
  "Try reinstalling the capture helper, then check again.":
    "캡처 도우미를 다시 설치한 뒤 확인하세요.",
  "Update the capture helper": "캡처 도우미 업데이트",
  "Allow snapshots": "스냅샷 허용",
  "Liverary's capture helper lets you capture other apps and return to your draft. It's included with Liverary.":
    "Liverary 캡처 도우미로 다른 앱을 캡처하고 초안으로 돌아올 수 있습니다. Liverary에 포함되어 있습니다.",
  "Choose a window each time": "매번 창 선택",
  "Your desktop doesn't support automatic capture. You'll choose the window to capture instead.":
    "이 데스크톱은 자동 캡처를 지원하지 않습니다. 캡처할 창을 직접 선택합니다.",
  "Your desktop may ask for permission when you first capture.":
    "처음 캡처할 때 데스크톱에서 권한을 요청할 수 있습니다.",
  "Test a snapshot of the current window. If macOS asks to bypass its window picker, choose Allow. The test image is discarded.":
    "현재 창의 스냅샷을 테스트합니다. macOS에서 창 선택기를 건너뛸지 물으면 허용을 선택하세요. 테스트 이미지는 저장하지 않습니다.",
  "Allow each permission, then continue.": "각 권한을 허용한 뒤 계속하세요.",
  "Allow access when prompted to start capturing windows.":
    "창 캡처를 시작하려면 요청하는 접근 권한을 허용하세요.",
  "Set up snapshots": "스냅샷 설정",
  "Screen Recording": "화면 기록",
  "Capture the window you're using.": "사용 중인 창을 캡처합니다.",
  Accessibility: "손쉬운 사용",
  "Include text and controls from the captured app.": "캡처한 앱의 텍스트와 컨트롤을 포함합니다.",
  "Optional. Include text and controls from the captured app.":
    "선택 사항입니다. 캡처한 앱의 텍스트와 컨트롤을 포함합니다.",
  "Reinstall helper": "도우미 다시 설치",
  "Capture needs attention. Go back to check access.":
    "캡처 설정을 확인해야 합니다. 이전으로 돌아가 접근 권한을 확인하세요.",
  "Couldn't finish this step. Try again or check Advanced for help.":
    "이 단계를 완료하지 못했습니다. 다시 시도하거나 고급 설정에서 도움말을 확인하세요.",
  "Included with Liverary. No download needed.":
    "Liverary에 포함되어 있어 다운로드가 필요하지 않습니다.",
  "Disable extension": "확장 프로그램 끄기",
  "Remove capture helper": "캡처 도우미 삭제",
  "Installing…": "설치 중…",
  "Check again": "다시 확인",
  "Update helper": "도우미 업데이트",
  "Install helper": "도우미 설치",
  "Enabling…": "켜는 중…",
  "Working…": "처리 중…",
  "Update extension": "확장 프로그램 업데이트",
  "Install extension": "확장 프로그램 설치",
  "Enable extension": "확장 프로그램 켜기",
  "Test capture and continue": "캡처 테스트 후 계속",
  "Allow capture": "캡처 허용",
  "Save and finish": "저장 후 완료",
  "Choices in every snooze menu, listed soonest first. Weekdays mean the next one after today.":
    "모든 미루기 메뉴에 표시할 항목을 가까운 시간순으로 정렬합니다. 요일은 오늘 이후에 처음 오는 해당 요일을 뜻합니다.",
  "snooze options": "미루기 옵션",
  "Menus offer only Custom…": "메뉴에 사용자 지정만 표시",
  "Add option": "옵션 추가",
  "Up to": "최대",
  options: "개 옵션",
  at: "시간",
  Decrease: "줄이기",
  Amount: "값",
  Increase: "늘리기",
  Unit: "단위",
  "Hidden account": "숨겨진 계정",
  "Sign in with": "로그인 명령:",
  "on the server host, then rescan to choose accounts here.":
    "서버 호스트에서 로그인한 뒤 다시 검색하면 여기서 계정을 선택할 수 있습니다.",
  "Choose which": "선택 대상:",
  "login each": "로그인 계정과 각",
  "host uses, or turn a host off.": "호스트의 사용 여부를 설정합니다.",
  Active: "활성",
  account: "계정",
  "The chosen login is no longer signed in, so the active":
    "선택한 계정의 로그인이 해제되어 현재 활성",
  "login is used.": "로그인을 사용합니다.",
  "Use active login": "활성 로그인 사용",
  "can't be used:": "사용할 수 없음:",
  "is set on the server, so it overrides the account chosen here until it is unset.":
    "서버에 설정되어 있어 해제할 때까지 여기서 선택한 계정보다 우선합니다.",
  "Sign in with GitHub": "GitHub로 로그인",
  "Copy code & open GitHub": "코드 복사 후 GitHub 열기",
  "Waiting for approval · code expires at": "승인 대기 중 · 코드 만료 시간",
  "Reaches repositories in accounts and organizations that installed the app.":
    "앱을 설치한 계정과 조직의 저장소에 접근할 수 있습니다.",
  "Install on an organization": "조직에 설치",
  "Manage on GitHub": "GitHub에서 관리",
  "Status unknown": "상태 알 수 없음",
  "Support for": "지원 예정:",
  "is coming soon.": "곧 지원됩니다.",
  "Not available on this server:": "이 서버에서 사용할 수 없음:",
  as: "로그인 계정:",
  "Available.": "사용할 수 있습니다.",
  "is not authenticated on this server. Sign in or configure credentials using the":
    "이 서버에 인증되지 않았습니다. 서버 호스트에서 다음 도구로 로그인하거나 인증 정보를 설정하세요:",
  "tool on the server host to enable change request features.":
    "변경 요청 기능을 사용할 수 있습니다.",
  "Could not verify": "확인하지 못했습니다:",
  "Coming Soon": "지원 예정",
  "Server environment": "서버 환경",
  "Could not scan the server environment": "서버 환경을 검색하지 못했습니다",
  "Nothing detected yet": "아직 감지된 항목이 없습니다",
  "Install Git on the server, add optional hosting integrations or credentials your workspace needs, then rescan.":
    "서버에 Git을 설치하고 작업 공간에 필요한 호스팅 연동이나 인증 정보를 추가한 뒤 다시 검색하세요.",
  Scan: "검색",
  "Or use your own credentials": "직접 준비한 인증 정보 사용",
  "Rescan server environment": "서버 환경 다시 검색",
  "Rescan Git and hosting integrations": "Git 및 호스팅 연동 다시 검색",
  "Connect an environment to inspect its version control tools and hosting integrations.":
    "버전 제어 도구와 호스팅 연동을 확인하려면 환경을 연결하세요.",
  "Source control providers": "소스 제어 제공자",
  "A token saved here is used before": "여기에 저장한 토큰은",
  "and the": "및",
  "login, so": "로그인보다 우선합니다.",
  "works without the": "은(는) 다음 도구에 로그인하지 않아도 사용할 수 있습니다:",
  ". Give it": ". 필요한 권한:",
  "Create a token": "토큰 만들기",
  "In each project, matches recent change descriptions and change request titles.":
    "각 프로젝트의 최근 변경 설명과 변경 요청 제목 형식을 따릅니다.",
  "Use Conventional Commit prefixes and keep change request text concise.":
    "Conventional Commit 접두사를 사용하고 변경 요청 내용을 간결하게 작성합니다.",
  "Use your instructions for change descriptions and change requests in every project.":
    "모든 프로젝트의 변경 설명과 변경 요청에 사용자 지침을 적용합니다.",
  "Writing & review": "작성 및 검토",
  "source control writing style": "소스 제어 작성 스타일",
  "Custom source control instructions for all selected environments":
    "선택한 모든 환경의 사용자 지정 소스 제어 지침",
  "Write the instructions each selected environment should use.":
    "선택한 각 환경에서 사용할 지침을 입력하세요.",
  "Apply instructions to all": "모두에 지침 적용",
  "Write custom instructions for all": "모두에 적용할 사용자 지정 지침 작성",
  "Keep titles concise. Use short bullet points in descriptions.":
    "제목은 간결하게, 설명은 짧은 글머리표로 작성하세요.",
  "Custom source control writing instructions": "사용자 지정 소스 제어 작성 지침",
  "Review guides": "검토 가이드",
  "Model that reads a pull request to write its review guide. It reads the change itself over many steps, so a stronger model helps. Off uses the source control writer model.":
    "Pull Request를 읽고 검토 가이드를 작성할 모델입니다. 여러 단계에 걸쳐 변경사항을 읽으므로 성능이 좋은 모델이 유리합니다. 끄면 소스 제어 작성 모델을 사용합니다.",
  "Connect an environment to choose its review guide model.":
    "검토 가이드 모델을 선택하려면 환경을 연결하세요.",
  "Review guide model not saved": "검토 가이드 모델을 저장하지 못했습니다",
  "Use a separate review guide model": "별도 검토 가이드 모델 사용",
  "Your preferences for review guides: what to show first, dwell on, or skip. The guide's format and coverage stay the same.":
    "검토 가이드에서 먼저 볼 내용, 자세히 볼 내용과 건너뛸 내용을 지정합니다. 가이드의 형식과 검토 범위는 유지합니다.",
  "review guide instructions": "검토 가이드 지침",
  "Show service interfaces before implementations. Skip test files unless they change behavior. Keep summaries to two sentences.":
    "서비스 인터페이스를 구현보다 먼저 보여 주세요. 동작을 바꾸는 경우가 아니면 테스트 파일은 건너뛰세요. 요약은 두 문장 이내로 작성하세요.",
  "Use the repository's template for change request descriptions when available.":
    "저장소에 변경 요청 설명 템플릿이 있으면 사용합니다.",
  "change request templates": "변경 요청 템플릿",
  "Connect an environment to choose its source control writer model.":
    "소스 제어 작성 모델을 선택하려면 환경을 연결하세요.",
  "Source control writer model not saved": "소스 제어 작성 모델을 저장하지 못했습니다",
  "Use a separate source control writer model": "별도 소스 제어 작성 모델 사용",
  Traces: "추적",
  Metrics: "메트릭",
  Logs: "로그",
  "Not checked": "확인하지 않음",
  "Timed out": "시간 초과",
  Unreachable: "접속 불가",
  "Choose one environment to configure its telemetry exports.":
    "계측 내보내기를 설정할 환경 하나를 선택하세요.",
  "Send traces, metrics, and logs to an OTLP HTTP receiver. Restart the server to apply. Environment variables override these settings.":
    "추적, 메트릭과 로그를 OTLP HTTP 수신기로 보냅니다. 적용하려면 서버를 다시 시작하세요. 환경 변수가 이 설정보다 우선합니다.",
  "This connection lacks permission to change settings on":
    "이 연결에는 다음 환경의 설정을 바꿀 권한이 없습니다:",
  endpoint: "수신 주소",
  "Enter an HTTP or HTTPS endpoint, or leave empty to disable export.":
    "HTTP 또는 HTTPS 수신 주소를 입력하세요. 비워 두면 내보내기를 끕니다.",
  Test: "테스트",
  "Running:": "실행 중:",
  from: "출처:",
  Discard: "변경 취소",
  "Choose a color": "색상 선택",
  "Could not save your theme": "테마를 저장하지 못했습니다",
  "Browser storage is unavailable, so the change was not kept.":
    "브라우저 저장소를 사용할 수 없어 변경사항을 저장하지 못했습니다.",
  "Your changes are now active.": "변경사항을 적용했습니다.",
  "Your changes are saved.": "변경사항을 저장했습니다.",
  Foundation: "기본",
  Background: "배경",
  Surface: "표면",
  "Raised surface": "떠 있는 표면",
  Overlay: "덮개",
  Text: "텍스트",
  "Muted text": "보조 텍스트",
  Border: "테두리",
  Input: "입력",
  "Brand & content": "브랜드 및 콘텐츠",
  "Subtle surface": "은은한 표면",
  "Highlight surface": "강조 표면",
  Accent: "강조 색상",
  Action: "작업",
  "Message surface": "메시지 배경",
  "Code surface": "코드 배경",
  "Search matches": "검색 결과",
  "Current match": "현재 검색 결과",
  Context: "영역",
  "Sidebar background": "사이드바 배경",
  "Sidebar controls": "사이드바 컨트롤",
  "Sidebar selection": "사이드바 선택 항목",
  "Terminal background": "터미널 배경",
  Error: "오류",
  Warning: "경고",
  "Theme name": "테마 이름",
  "e.g. Aurora": "예: 오로라",
  "Theme appearance": "테마 화면 모드",
  Colors: "색상",
  "Two colors, rest derived": "두 색상을 선택하면 나머지는 자동 생성",
  "Filter colors": "색상 필터",
  "Use advanced theme colors": "고급 테마 색상 사용",
  "No matches.": "일치하는 항목이 없습니다.",
  "Select an element · Esc to cancel": "요소 선택 · Esc로 취소",
  "Select a color below": "아래에서 색상을 선택하세요",
  "Cancel inspecting app colors": "앱 색상 확인 취소",
  "Inspect app colors": "앱 색상 확인",
  Inspect: "확인",
  "Cancel and clear the selection": "취소하고 선택 해제",
  "Pick a color from the app": "앱에서 색상 선택",
  "Expand the theme editor": "테마 편집기 펼치기",
  "Minimize the theme editor": "테마 편집기 최소화",
  "Close the theme editor": "테마 편집기 닫기",
  "Theme JSON": "테마 JSON",
  "Add a theme": "테마 추가",
  "or import a file": "또는 파일 가져오기",
  "Reading…": "읽는 중…",
  "Already installed": "이미 설치됨",
  "Update existing": "기존 항목 업데이트",
  "Keep both": "둘 다 유지",
  "Theme file": "테마 파일",
  "Drop Liverary or VS Code .json files": "Liverary 또는 VS Code의 .json 파일을 놓으세요",
  "Most downloaded": "다운로드 많은 순",
  "Best rated": "평점 높은 순",
  Newest: "최신순",
  "Most relevant": "관련성 높은 순",
  "Search community themes": "커뮤니티 테마 검색",
  "Find open-source themes from Open VSX.": "Open VSX에서 오픈 소스 테마를 찾습니다.",
  "Search Open VSX themes": "Open VSX 테마 검색",
  "Search themes...": "테마 검색…",
  Popular: "인기",
  Sort: "정렬",
  "Sort themes": "테마 정렬",
  "Searching themes...": "테마 검색 중…",
  "No supported open-source themes found": "지원하는 오픈 소스 테마가 없습니다",
  downloads: "다운로드",
  "A community color theme for your editor.": "편집기용 커뮤니티 색상 테마입니다.",
  "This replaces its installed variants, including any local edits. Variants no longer in the extension will be removed.":
    "직접 수정한 내용을 포함하여 설치된 변형을 교체합니다. 확장 프로그램에서 삭제된 변형은 제거됩니다.",
  "Update theme": "테마 업데이트",
  "Choose what the thread details card shows. You can also right-click the card.":
    "대화 세부 정보 카드에 표시할 항목을 선택합니다. 카드를 마우스 오른쪽 버튼으로 눌러 설정할 수도 있습니다.",
  "thread details": "대화 세부 정보",
  "Appended to the prompt for new and regenerated thread titles.":
    "대화 제목을 새로 만들거나 다시 생성하는 프롬프트에 추가합니다.",
  "thread title instructions": "대화 제목 지침",
  "Keep titles to a few words. Lead with the main subject.":
    "제목을 짧게 작성하고 핵심 주제를 먼저 쓰세요.",
  "update Cursor account usage": "Cursor 계정 사용량 업데이트",
  "Read your existing Cursor CLI login from macOS Keychain to show account history and monthly limits. macOS may ask you to allow access.":
    "macOS 키체인에서 기존 Cursor CLI 로그인 정보를 읽어 계정 기록과 월간 한도를 표시합니다. macOS에서 접근 허용을 요청할 수 있습니다.",
  "No hubs configured.": "설정된 허브가 없습니다.",
  "CLI Proxy": "CLI 프록시",
  " · Disabled": " · 꺼짐",
  "The hub's management key is deleted from this server. Its accounts leave the Limits view; the hub itself is untouched. Add it again with the URL and key to bring them back.":
    "이 서버에서 허브의 관리 키를 삭제합니다. 사용 한도 화면에서 허브 계정이 사라지며 허브 자체는 바뀌지 않습니다. URL과 키로 다시 추가하면 복원됩니다.",
  "Remove hub": "허브 삭제",
  "Failed to save project actions": "프로젝트 작업을 저장하지 못했습니다",
  "Actions not saved": "작업을 저장하지 못했습니다",
  "This connection cannot change environment settings.":
    "이 연결에서는 환경 설정을 바꿀 수 없습니다.",
  "Setting not saved": "설정을 저장하지 못했습니다",
  "This connection lacks permission to change these settings.":
    "이 연결에는 이 설정을 바꿀 권한이 없습니다.",
  "Setting saved on some environments": "일부 환경에만 설정을 저장했습니다",
  "Change snapshot shortcut": "스냅샷 단축키 변경",
  "Press shortcut…": "단축키를 누르세요…",
  "Choose shortcut": "단축키 선택",
  "Connect an environment to set up its providers.": "제공자를 설정하려면 환경을 연결하세요.",
  "Restore device defaults": "기기 기본값 복원",
  Reconnect: "다시 연결",
  "Folder where new worktrees are created, on any drive, such as D:\\worktrees or ~/worktrees. Existing worktrees stay where they are. Leave empty to use the Liverary home folder.":
    "새 워크트리를 만들 폴더입니다. D:\\worktrees 또는 ~/worktrees처럼 원하는 드라이브에 지정할 수 있습니다. 기존 워크트리는 이동하지 않습니다. 비워 두면 Liverary 홈 폴더를 사용합니다.",
  days: "일",
  "Any local files": "로컬 파일이 있는 경우",
  "Uncommitted changes": "커밋하지 않은 변경사항",
  "Edited tracked files": "수정한 추적 파일",
  "Rotated logs": "교체된 로그",
  "Browser artifacts": "브라우저 생성 파일",
  Machine: "컴퓨터",
  Folder: "폴더",
  Thread: "대화",
  "Could not load the last run.": "마지막 실행 결과를 불러오지 못했습니다.",
  "Loading last run…": "마지막 실행 결과 불러오는 중…",
  "Cleanup hasn't run yet.": "아직 정리를 실행하지 않았습니다.",
  Cleanup: "정리",
  "Turn on a cleanup rule to use this.": "사용하려면 정리 규칙을 하나 이상 켜세요.",
  "Deleting…": "삭제 중…",
  "Last run": "마지막 실행",
  "Update the selected environments to use storage cleanup, or choose a machine that supports it.":
    "저장 공간 정리를 사용하려면 선택한 환경을 업데이트하거나 이 기능을 지원하는 컴퓨터를 선택하세요.",
  "Mixed across selected machines": "선택한 컴퓨터마다 다름",
  "Update the selected machines to configure project worktree cleanup.":
    "프로젝트의 워크트리 정리를 설정하려면 선택한 컴퓨터를 업데이트하세요.",
  "Keep this project's worktrees until you delete them manually.":
    "직접 삭제할 때까지 이 프로젝트의 워크트리를 유지합니다.",
  "Use these rules for this project.": "이 프로젝트에 아래 규칙을 적용합니다.",
  "Use each machine's worktree cleanup settings.": "각 컴퓨터의 워크트리 정리 설정을 사용합니다.",
  "Delete worktrees with deleted threads": "삭제된 대화의 워크트리 삭제",
  "Remove unused worktrees when active or archived threads are deleted. Worktrees with local changes are kept.":
    "활성 대화나 보관된 대화를 삭제하면 사용하지 않는 워크트리도 삭제합니다. 로컬 변경사항이 있는 워크트리는 유지합니다.",
  "Delete merged worktrees": "병합된 워크트리 삭제",
  "Remove worktrees whose pull request is merged and whose commits are included in the default branch.":
    "Pull Request가 병합되고 커밋이 기본 브랜치에 포함된 워크트리를 삭제합니다.",
  "Delete inactive worktrees": "비활성 워크트리 삭제",
  "Remove worktrees after their threads have been inactive for this many days. Branches and thread history are kept.":
    "대화가 지정한 일수 동안 비활성 상태이면 워크트리를 삭제합니다. 브랜치와 대화 기록은 유지합니다.",
  "Offline machines will not get this setting": "오프라인 컴퓨터에는 이 설정이 적용되지 않습니다",
  "Remove worktrees this many days after their thread settles. Set 0 days to remove them at the next cleanup. Branches and thread history are kept.":
    "대화가 정리된 뒤 지정한 일수가 지나면 워크트리를 삭제합니다. 0일로 설정하면 다음 정리 때 삭제합니다. 브랜치와 대화 기록은 유지합니다.",
  "Delete unchanged worktrees": "변경사항이 없는 워크트리 삭제",
  "Remove worktrees with no commits beyond the default branch.":
    "기본 브랜치 이후의 추가 커밋이 없는 워크트리를 삭제합니다.",
  "Includes ignored files, except node_modules.": "node_modules를 제외한 무시된 파일도 포함합니다.",
  "Deletes untracked and ignored files, including .env.":
    ".env를 포함한 추적되지 않은 파일과 무시된 파일을 삭제합니다.",
  "Keeps edits and untracked files. Deletes ignored files, including .env.":
    "수정한 파일과 추적되지 않은 파일은 유지합니다. .env를 포함한 무시된 파일은 삭제합니다.",
  "Delete saved browser captures after this many days. Older capture links will no longer open.":
    "지정한 일수가 지난 브라우저 캡처를 삭제합니다. 삭제된 캡처의 링크는 더 이상 열리지 않습니다.",
  "Delete inactive rotated log files after this many days. Current logs are kept.":
    "지정한 일수 동안 사용하지 않은 교체 로그 파일을 삭제합니다. 현재 사용 중인 로그는 유지합니다.",
  "Applying settings for": "설정 적용 대상:",
  "Environment scope": "적용 환경",
  "Project scope": "적용 프로젝트",
  Offline: "오프라인",
  "No matches found.": "일치하는 항목이 없습니다.",
  "Unavailable environment": "사용할 수 없는 환경",
  "No environments": "환경 없음",
  "All environments": "모든 환경",
  "Search environments": "환경 검색",
  "Unavailable project": "사용할 수 없는 프로젝트",
  "All projects": "모든 프로젝트",
  "Search projects": "프로젝트 검색",
  Archived: "보관됨",
  "Open all environments": "모든 환경 열기",
  Creation: "생성",
  Branches: "브랜치",
  "Uses the latest commit of the base branch’s tracked remote branch, even if its name differs. Otherwise uses the same-named branch on origin. Uses your local branch if that remote branch is missing.":
    "이름이 달라도 기준 브랜치가 추적하는 원격 브랜치의 최신 커밋을 사용합니다. 추적 대상이 없으면 origin의 같은 이름 브랜치를 사용하며, 해당 원격 브랜치가 없으면 로컬 브랜치를 사용합니다.",
  "Start new worktrees from remote by default": "기본적으로 원격 브랜치에서 새 워크트리 시작",
  "Static prefix": "고정 접두사",
  "Semantic prefix": "작업 유형별 접두사",
  "Choose how new worktree branches are named from your first message.":
    "첫 메시지를 바탕으로 새 워크트리 브랜치의 이름을 정하는 방식을 선택합니다.",
  "The model chooses a prefix that describes the work, such as feat/add-search, fix/login-timeout, or refactor/auth.":
    "모델이 작업에 맞는 접두사를 선택합니다. 예: feat/add-search, fix/login-timeout, refactor/auth.",
  "Branch prefix": "브랜치 접두사",
  "No prefix": "접두사 없음",
  "Branch naming instructions": "브랜치 이름 지정 지침",
  "Appended to the naming prompt. The model returns the complete branch name; no prefix or suffix is added.":
    "이름 지정 프롬프트에 추가합니다. 모델이 반환한 전체 브랜치 이름에 접두사나 접미사를 덧붙이지 않습니다.",
  "Mixed. Enter instructions to apply to all selected targets.":
    "설정값이 서로 다릅니다. 선택한 모든 대상에 적용할 지침을 입력하세요.",
  "Use julius/ followed by the issue ID and a short description.":
    "julius/ 뒤에 이슈 ID와 짧은 설명을 붙이세요.",
  Recursive: "하위 모듈까지 재귀적으로",
  "Top level only": "최상위만",
  Skip: "건너뛰기",
  "Automatic worktree cleanup": "워크트리 자동 정리",
  "Delete settled worktrees": "정리된 대화의 워크트리 삭제",
  "Delete old browser artifacts": "오래된 브라우저 생성 파일 삭제",
  "Delete old rotated logs": "오래된 교체 로그 삭제",
  "Custom search URL": "사용자 지정 검색 URL",
  "Native sessions": "네이티브 세션",
  "Early Access": "미리 체험",
  "Kiro API key": "Kiro API 키",
  "Cursor API key": "Cursor API 키",
  "Paste API key": "API 키 붙여넣기",
  "Optional. Signs in without `kiro-cli login` (Kiro Pro and above).":
    "선택 사항입니다. kiro-cli login 없이 로그인합니다(Kiro Pro 이상).",
  "Optional. Overrides browser sign-in for this provider.":
    "선택 사항입니다. 이 제공자의 브라우저 로그인보다 우선합니다.",
  "Access token": "액세스 토큰",
  "Atlassian account email": "Atlassian 계정 이메일",
  "With an API token instead of an access token.":
    "액세스 토큰 대신 API 토큰을 사용할 때 입력합니다.",
  "API token": "API 토큰",
  "Scoped to one repository, project, or workspace. Create it in that item's Bitbucket settings.":
    "저장소, 프로젝트 또는 작업 공간 하나로 범위가 제한됩니다. 해당 항목의 Bitbucket 설정에서 만드세요.",
  "Reaches every repository your Atlassian account can. Give it read and write access to repositories and pull requests, and read:user:bitbucket.":
    "Atlassian 계정이 접근할 수 있는 모든 저장소에 적용됩니다. 저장소와 Pull Request의 읽기·쓰기 권한 및 read:user:bitbucket 권한을 부여하세요.",
  Token: "토큰",
  "A git.cafe token, used before CAFE_TOKEN and the cafe login, so GitCafe works without the CLI signed in.":
    "CAFE_TOKEN과 cafe 로그인보다 우선하는 git.cafe 토큰입니다. CLI에 로그인하지 않아도 GitCafe를 사용할 수 있습니다.",
  "API key": "API 키",
  Optional: "선택 사항",
  "When you return": "돌아왔을 때",
  "Before the cache expires (beta)": "캐시 만료 전 (베타)",
  "Path to the Kiro CLI binary.": "Kiro CLI 실행 파일 경로입니다.",
  "Claude Desktop is preferred by default. Select an installed CLI or enter its full path.":
    "기본값은 Claude 데스크톱의 CLI입니다. 설치된 CLI를 선택하거나 실행 파일의 전체 경로를 입력하세요.",
  "CLAUDE_CONFIG_DIR path": "CLAUDE_CONFIG_DIR 경로",
  "Custom Claude home and config directory. Keeps .claude.json and .claude separate.":
    "사용자 지정 Claude 홈 및 설정 디렉터리입니다. .claude.json과 .claude를 별도로 보관합니다.",
  "e.g. --chrome": "예: --chrome",
  "Auto-compact after": "자동 압축 기준",
  "Compact after 100,000 to 1,000,000 tokens. Leave empty to use Claude's default.":
    "100,000~1,000,000토큰 사이의 압축 기준을 지정합니다. 비워 두면 Claude의 기본값을 사용합니다.",
  "e.g. 300000": "예: 300000",
  "When to compact an idle thread over 200,000 tokens: after you return, just before its prompt cache expires, or never. Overrides the default in Providers > Advanced.":
    "200,000토큰을 초과한 유휴 대화를 압축할 시점입니다. 돌아왔을 때, 프롬프트 캐시 만료 직전 또는 사용 안 함을 선택할 수 있습니다. AI 제공자 > 고급의 기본값보다 우선합니다.",
  "Use default": "기본값 사용",
  "Google account": "Google 계정",
  "Gemini API key": "Gemini API 키",
  "Google accounts use your subscription; API keys and Agent Platform bill usage.":
    "Google 계정은 구독을 사용하며, API 키와 Agent Platform은 사용량에 따라 청구됩니다.",
  "Gemini or Vertex AI express key. Stored separately on the host.":
    "Gemini 또는 Vertex AI Express 키입니다. 호스트에 별도로 저장합니다.",
  "GCP project": "GCP 프로젝트",
  "Required for Gemini Enterprise. Agent Platform uses it when no API key is set.":
    "Gemini Enterprise에 필요합니다. Agent Platform에서는 API 키가 설정되지 않았을 때 사용합니다.",
  "GCP location": "GCP 리전",
  "Region for Gemini Enterprise or Agent Platform.":
    "Gemini Enterprise 또는 Agent Platform에서 사용할 리전입니다.",
  "Custom ACP executable. Leave empty to select automatically.":
    "사용자 지정 ACP 실행 파일입니다. 비워 두면 자동으로 선택합니다.",
  "Path to the Pi coding agent binary.": "Pi 코딩 에이전트 실행 파일 경로입니다.",
  "Additional CLI arguments passed to pi --mode rpc on session start.":
    "세션 시작 시 pi --mode rpc에 전달할 추가 CLI 인수입니다.",
  "Path to the fx binary. All fx instances on this machine share its fx login.":
    "fx 실행 파일 경로입니다. 이 컴퓨터의 모든 fx 인스턴스가 해당 fx 로그인을 공유합니다.",
  "Path to the Muse Code binary on this environment. Sign in with muse login on that host.":
    "이 환경의 Muse Code 실행 파일 경로입니다. 해당 호스트에서 muse login으로 로그인하세요.",
  "Path to the Grok CLI binary.": "Grok CLI 실행 파일 경로입니다.",
  "ACP source": "ACP 소스",
  "Local command": "로컬 명령",
  "Registry agent ID": "레지스트리 에이전트 ID",
  "Agent identifier from the official ACP Registry, for example 'devin'.":
    "공식 ACP Registry의 에이전트 식별자입니다. 예: 'devin'.",
  "Executable override": "실행 파일 재정의",
  "Executable on this environment. For registry agents, this overrides the distribution executable while keeping its arguments and environment.":
    "이 환경의 실행 파일입니다. 레지스트리 에이전트에서는 인수와 환경을 유지하면서 배포 실행 파일만 재정의합니다.",
  "Registry default": "레지스트리 기본값",
  "Authentication method": "인증 방식",
  "Optional ACP authentication method ID. By default, the first agent-managed method is selected.":
    "선택 사항인 ACP 인증 방식 ID입니다. 기본적으로 에이전트가 관리하는 첫 번째 방식을 선택합니다.",
  "Path to the OpenCode binary.": "OpenCode 실행 파일 경로입니다.",
  "Server URL": "서버 URL",
  "Leave blank to let Liverary spawn the server when needed.":
    "비워 두면 필요할 때 Liverary가 서버를 시작합니다.",
  "Server password": "서버 비밀번호",
  "Stored separately on the host.": "호스트에 별도로 저장합니다.",
  "For example, liverary or liverary/ produces liverary/add-search. Leave empty for no prefix.":
    "예를 들어 liverary 또는 liverary/를 입력하면 liverary/add-search가 됩니다. 접두사를 사용하지 않으려면 비워 두세요.",
  Executable: "실행 파일",
  "Codex Desktop is preferred by default. Select an installed CLI or enter its full path.":
    "기본값은 Codex 데스크톱의 CLI입니다. 설치된 CLI를 선택하거나 실행 파일의 전체 경로를 입력하세요.",
  "Standalone CLI": "별도 CLI 설치",
  "Desktop app (automatic)": "데스크톱 앱 (자동)",
  "Automatic selection": "자동 선택",
  "Terminal search path (PATH)": "터미널 검색 경로 (PATH)",
  "Show install command": "설치 명령 보기",
  "Run this command in the environment's terminal. Enter the installed CLI's full path or restart Liverary in that environment to select it from the list.":
    "이 환경의 터미널에서 명령을 실행하세요. 설치 후 전체 경로를 입력하거나 이 환경의 Liverary를 다시 시작해 목록에서 선택하세요.",
  "Custom Codex home and config directory.": "사용자 지정 Codex 홈 및 설정 폴더입니다.",
  "Account-specific Codex home. Keeps auth.json separate while sharing state from CODEX_HOME.":
    "계정별 Codex 홈입니다. CODEX_HOME의 상태를 공유하면서 auth.json은 별도로 보관합니다.",
  "Launch arguments": "실행 인수",
  "Additional CLI arguments passed to codex app-server on session start.":
    "세션을 시작할 때 codex app-server에 전달할 추가 CLI 인수입니다.",
  "Additional CLI arguments passed on session start.":
    "세션을 시작할 때 전달할 추가 CLI 인수입니다.",
  "MCP URL copied": "MCP URL을 복사했습니다",
  "Could not copy MCP URL": "MCP URL을 복사하지 못했습니다",
  "Management key": "관리 키",
  "Create link": "링크 만들기",
  "An error occurred.": "오류가 발생했습니다.",
  "Model for source control text and branch or bookmark names. When disabled, use the text generation model configured for this environment.":
    "소스 제어 문구와 브랜치 또는 북마크 이름에 사용할 모델입니다. 끄면 이 환경에 설정된 텍스트 생성 모델을 사용합니다.",
  "Add a Guide tab to pull requests. An agent explains the changes and points out decisions that need review.":
    "Pull Request에 가이드 탭을 추가합니다. 에이전트가 변경 내용을 설명하고 검토가 필요한 결정을 알려줍니다.",
  "Signed in, but the token saved below is used while it can be read.":
    "로그인되어 있지만 아래 저장된 토큰을 읽을 수 있는 동안에는 해당 토큰을 사용합니다.",
  "That time does not exist in your time zone.": "현재 시간대에 존재하지 않는 시간입니다.",
  "Pick a date and time.": "날짜와 시간을 선택하세요.",
  "Pick a time.": "시간을 선택하세요.",
  "Invalid run time": "올바르지 않은 실행 시간",
  "Run on": "실행 일시",
  "Coalescing runs the latest payload once when the window from the first delivery closes. Empty keys run normally.":
    "첫 수신부터 묶음 대기 시간이 끝나면 최신 페이로드를 한 번 실행합니다. 키가 비어 있으면 일반 요청으로 실행합니다.",
  "Requests with the same key run only once within 7 days.":
    "동일한 키를 가진 요청은 7일 이내에 한 번만 실행합니다.",
  "Duplicate request key": "중복 요청 키",
  "On webhook": "웹훅 수신 시",
  Once: "한 번",
  "Run a prompt automatically on an interval, at a fixed time, once at a set date, or when a webhook arrives.":
    "일정 간격, 고정 시간, 지정한 날짜에 한 번 또는 웹훅 수신 시 프롬프트를 자동으로 실행합니다.",
  "This environment runs an older T3 Code. Update it to schedule a one-time task, or pick another schedule.":
    "이 환경은 이전 버전의 Liverary를 사용합니다. 일회성 작업을 예약하려면 업데이트하거나 다른 예약 방식을 선택하세요.",
  "Once is not available here": "이 환경에서는 일회성 예약을 사용할 수 없습니다",
  "This task was deleted or belongs to a different project. Check your project filter.":
    "이 작업은 삭제되었거나 다른 프로젝트에 속해 있습니다. 프로젝트 필터를 확인하세요.",
  " It will also be turned off.": " 제공자도 비활성화됩니다.",
  "Expo access token": "Expo 액세스 토큰",
  "Give the host a label and limits within the ranges shown.":
    "호스트 이름과 표시된 범위 내의 한도를 입력하세요.",
  "Idle minutes must be smaller than session minutes.": "유휴 시간은 세션 시간보다 짧아야 합니다.",
  "Enter a valid secret reference.": "올바른 비밀 값 참조를 입력하세요.",
  "idle host power interval": "유휴 호스트 전원 확인 주기",
  "active host power interval": "활성 호스트 전원 확인 주기",
  "provider health interval": "제공자 상태 확인 주기",
  "Grouping rule decides how each checkout joins project groups in the sidebar. Changing it can move a checkout to a different project.":
    "그룹화 규칙은 각 체크아웃을 사이드바의 프로젝트 그룹에 묶는 방식을 결정합니다. 규칙을 바꾸면 체크아웃이 다른 프로젝트로 이동할 수 있습니다.",
  "Use global default": "전체 기본값 사용",
  "Could not save grouping rule": "그룹화 규칙을 저장하지 못했습니다",
  "Get help": "도움 받기",
  Organization: "조직",
  "Snooze threads until their usage limits reset. Enable auto-resume to continue the agent after the reset.":
    "사용 한도가 초기화될 때까지 대화를 미룹니다. 초기화 후 에이전트를 계속 실행하려면 자동 재개를 켜세요.",
  "Automatically resume threads when their usage limits reset. You can cancel auto-resume in each thread.":
    "사용 한도가 초기화되면 대화를 자동으로 재개합니다. 각 대화에서 자동 재개를 취소할 수 있습니다.",
  "Open pull requests and changes panels proactively": "Pull Request와 변경 사항 패널 자동 열기",
  " Enter a new value to rename a saved one or make it plain text.":
    " 저장된 값의 이름을 바꾸거나 일반 텍스트로 전환하려면 새 값을 입력하세요.",
  "Checking credentials and loading models…": "인증 정보 확인 및 모델 불러오는 중…",
  "Connecting…": "연결 중…",
  "Automatic (mixed)": "자동 (혼합)",
  "Only built-in themes show artwork.": "기본 제공 테마에서만 배경 그림을 표시합니다.",
  "Only built-in themes show artwork, so this theme shows the version pill.":
    "기본 제공 테마에서만 배경 그림을 표시하므로, 이 테마에서는 버전 배지를 표시합니다.",
  ", which is not available in this build. Its configuration is preserved.":
    "(이 빌드에서 사용할 수 없습니다. 설정은 유지됩니다.)",
  "12-hour": "12시간제",
  "24-hour": "24시간제",
  "API keys, base URLs, and other per-instance CLI settings.":
    "이 인스턴스에서 사용할 API 키, 기본 URL 및 CLI 설정입니다.",
  About: "앱 정보",
  "Accent color": "강조 색상",
  "Accent color hue": "강조 색상 색조",
  Account: "계정",
  Actions: "작업",
  Add: "추가",
  "Add an account or configure a provider on": "계정을 추가하거나 AI 제공자를 설정할 환경:",
  "Add argument": "인수 추가",
  "Add choice": "선택 항목 추가",
  "Add color": "색상 추가",
  "Add custom model": "사용자 지정 모델 추가",
  "Add instance": "인스턴스 추가",
  "Add keybinding": "단축키 추가",
  "Add project base directory": "프로젝트 추가 시작 폴더",
  "Add project starts in": "프로젝트 추가 시작 위치",
  "Add provider": "AI 제공자 추가",
  "Add secret provider": "비밀 정보 제공자 추가",
  "Add theme": "테마 추가",
  "Add to favorites": "즐겨찾기에 추가",
  "Add variable": "환경 변수 추가",
  "Adjust the contrast of colors and borders across the interface.":
    "화면 전체의 색상과 테두리 대비를 조절합니다.",
  Advanced: "고급 설정",
  "Agent browser access": "에이전트 브라우저 접근",
  Agents: "에이전트",
  "Agents can use devices": "에이전트의 기기 사용 허용",
  All: "전체",
  "All selected connected environments must support restart continuation.":
    "선택한 모든 연결 환경에서 재시작 후 재개 기능을 지원해야 합니다.",
  "Allow notifications in your browser or system settings, then choose this option again. Sound only is still available.":
    "브라우저 또는 시스템 설정에서 알림을 허용한 뒤 다시 선택하세요. 소리만 재생하는 옵션은 계속 사용할 수 있습니다.",
  "Also include skills in the / command menu. Skills always appear when you type $.":
    "/ 명령 메뉴에도 스킬을 표시합니다. $를 입력하면 항상 스킬이 표시됩니다.",
  Always: "항상",
  "Antigravity download": "Antigravity 다운로드",
  "Antigravity setup": "Antigravity 설정",
  "Any new activity un-settles a thread automatically.":
    "새 활동이 생기면 대화가 자동으로 다시 활성화됩니다.",
  App: "앱",
  Appearance: "화면",
  "Appearance mode": "화면 모드",
  Archive: "보관함",
  "Archive confirmation": "보관 확인",
  "Archived threads": "보관된 대화",
  Arguments: "실행 인수",
  "Artifacts and logs": "생성 파일 및 로그",
  Artwork: "장식 이미지",
  "Ask before deleting a thread and its chat history.":
    "대화와 메시지 기록을 삭제하기 전에 확인합니다.",
  "Ask before unpinning a thread from the pinned section.":
    "고정한 대화를 해제하기 전에 확인합니다.",
  Authenticated: "인증됨",
  "Authenticated as": "인증한 계정",
  "Authentication request expired": "인증 요청이 만료되었습니다",
  "Auto-settle": "자동 정리",
  "Auto-settle inactive threads": "비활성 대화 자동 정리",
  "Auto-settle merged threads": "병합된 대화 자동 정리",
  "Auto-show floating preview": "플로팅 미리 보기 자동 표시",
  Automatic: "자동",
  "Automatic installation unavailable. Set a binary path or use another environment.":
    "자동 설치를 사용할 수 없습니다. 실행 파일 경로를 지정하거나 다른 실행 환경을 사용하세요.",
  "Automatic updates are not available in this build.":
    "이 빌드에서는 자동 업데이트를 사용할 수 없습니다.",
  "Automatically pull": "자동으로 가져오기",
  "Automatically resume interrupted threads after an update, crash, or machine restart on the selected environments.":
    "선택한 환경에서 업데이트, 오류 또는 컴퓨터 재시작으로 중단된 대화를 자동으로 재개합니다.",
  Available: "사용 가능",
  Back: "뒤로",
  "Background activity": "백그라운드 작업",
  "Background policy details": "백그라운드 정책 설명",
  Balanced: "균형",
  Bars: "막대",
  "Battery saver": "절전",
  "Binary path": "실행 파일 경로",
  "Blue & orange": "파랑 및 주황",
  "Boring sidebar (group by project)": "프로젝트별 사이드바",
  Browser: "브라우저",
  "Browser profiles": "브라우저 프로필",
  "Browser recording frame rate": "브라우저 녹화 프레임 속도",
  "Built-in default": "기본값",
  "CLI not detected on PATH.": "PATH에서 CLI를 찾지 못했습니다.",
  "CODEX_HOME path": "CODEX_HOME 경로",
  Cancel: "취소",
  "Cancel installation": "설치 취소",
  "Cancel new keybinding": "새 단축키 취소",
  "Cancel sign-in": "로그인 취소",
  "Cancelling installation": "설치 취소 중",
  "Capture animations": "캡처 애니메이션",
  "Capture flash": "캡처 플래시",
  "Capture shortcut": "캡처 단축키",
  "Capture sound": "캡처 소리",
  "Change accent color": "강조 색상 변경",
  "Change account": "계정 변경",
  Chat: "대화",
  "Chat width": "대화 너비",
  "ChatGPT account": "ChatGPT 계정",
  "Check for Updates": "업데이트 확인",
  "Check installed provider CLIs for newer available versions and fetch model catalog updates. When off, new models may not appear.":
    "설치된 AI 제공자 CLI의 새 버전을 확인하고 모델 목록을 업데이트합니다. 끄면 새 모델이 표시되지 않을 수 있습니다.",
  "Check provider versions": "AI 제공자 버전 확인",
  Checked: "확인함",
  "Checked unavailable": "확인 시각 없음",
  "Checking Codex.": "Codex를 확인하는 중입니다.",
  "Checking provider status": "AI 제공자 상태 확인 중",
  "Checking the Antigravity runtime.": "Antigravity 런타임을 확인하는 중입니다.",
  "Checking the downloaded runtime.": "다운로드한 런타임을 확인하는 중입니다.",
  "Checking what this session is allowed to change.":
    "이 세션에서 변경할 수 있는 항목을 확인하는 중입니다.",
  "Checking your account…": "계정을 확인하는 중…",
  "Checking...": "확인 중…",
  "Checking…": "확인 중…",
  "Choice label": "선택 표시 이름",
  "Choice value": "선택값",
  Choices: "선택 항목",
  "Choose colors for additions and deletions, including change counts.":
    "추가·삭제된 내용과 변경 개수를 표시할 색상을 선택합니다.",
  "Choose how development environments are identified.":
    "개발 환경을 구분해서 표시하는 방식을 선택합니다.",
  "Choose when Enter sends a prompt or inserts a new line":
    "Enter로 메시지를 보내거나 줄을 바꾸는 방식을 선택합니다",
  "Clear color": "색상 지우기",
  "Clear settings search": "설정 검색 지우기",
  "Click to hide email": "클릭하여 이메일 숨기기",
  "Click to reveal email": "클릭하여 이메일 표시",
  Code: "코드",
  "Code and terminal need a fixed-width font, so the current font was kept.":
    "코드와 터미널에는 고정폭 글꼴이 필요하므로 현재 글꼴을 유지했습니다.",
  "Code blocks, diffs, and file previews.": "코드 블록, 변경 내역 및 파일 미리 보기에 적용합니다.",
  "Code blocks, diffs, file previews, and the terminal.":
    "코드 블록, 변경 내역, 파일 미리 보기 및 터미널에 적용합니다.",
  "Code font": "코드 글꼴",
  "Code font size": "코드 글꼴 크기",
  Collapsed: "접힘",
  "Color scheme": "화면 모드",
  "Colors & themes": "색상 및 테마",
  "Combine matching repositories across environments.":
    "서로 다른 실행 환경의 같은 저장소를 묶습니다.",
  Comfortable: "기본 너비",
  "Comfortable (default)": "기본 너비 (기본)",
  Command: "명령",
  "Compact idle threads": "대기 중 대화 압축",
  "Complete sign-in in the terminal below.": "아래 터미널에서 로그인을 완료하세요.",
  "Complete sign-in in your browser.": "브라우저에서 로그인을 완료하세요.",
  Composer: "입력창",
  "Composer context": "입력창 작업 정보",
  Condition: "조건",
  "Configure manually": "직접 설정",
  "Confirm thread archiving": "대화 보관 확인",
  "Confirm thread deletion": "대화 삭제 확인",
  "Confirm thread unpinning": "대화 고정 해제 확인",
  Confirmations: "확인 메시지",
  Connect: "연결",
  "Connect an environment to change keybindings.": "단축키를 변경하려면 환경에 연결하세요.",
  "Connect an environment to choose its text generation model.":
    "실행 환경을 연결하면 텍스트 생성 모델을 선택할 수 있습니다.",
  "Connect an execution environment before configuring providers.":
    "AI 제공자를 설정하려면 먼저 실행 환경을 연결하세요.",
  Connections: "연결",
  "Context window indicator": "컨텍스트 용량 표시",
  "Context window indicator (legacy)": "컨텍스트 사용량 표시 (이전 방식)",
  Continue: "계속",
  "Continue authentication": "인증 계속",
  "Continue threads after restarts": "재시작 후 대화 재개",
  "Continue to sign-in": "로그인으로 계속",
  Contrast: "대비",
  "Conventional Commits": "Conventional Commits",
  "Copy command": "명령 복사",
  "Copy from…": "다음에서 복사…",
  "Copy options from a built-in model": "기본 제공 모델의 옵션 복사",
  "Copy sign-in link": "로그인 링크 복사",
  "Copy update command": "업데이트 명령 복사",
  "Copy version": "버전 복사",
  "Could not add provider instance": "AI 제공자를 추가하지 못했습니다",
  "Could not check for updates": "업데이트를 확인하지 못했습니다",
  "Could not confirm update": "업데이트 확인에 실패했습니다",
  "Could not connect to this device": "이 기기에 연결하지 못했습니다",
  "Could not continue authentication": "인증을 계속하지 못했습니다",
  "Could not copy the sign-in link.": "로그인 링크를 복사하지 못했습니다.",
  "Could not copy version": "버전 정보를 복사하지 못했습니다",
  "Could not delete provider instance": "AI 제공자를 삭제하지 못했습니다",
  "Could not download update": "업데이트를 다운로드하지 못했습니다",
  "Could not finish sign-in on this computer. Try again or paste the redirect URL below.":
    "이 컴퓨터에서 로그인을 완료하지 못했습니다. 다시 시도하거나 아래에 리디렉션 URL을 붙여넣으세요.",
  "Could not install t3": "Liverary CLI 명령을 설치하지 못했습니다",
  "Could not install update": "업데이트를 설치하지 못했습니다",
  "Could not open the sign-in page. Copy the link and open it in your browser.":
    "로그인 페이지를 열지 못했습니다. 링크를 복사해 브라우저에서 여세요.",
  "Could not read runtime path": "실행 파일 경로를 불러오지 못했습니다",
  "Could not read setup status. Reconnect and try again.":
    "설정 상태를 읽지 못했습니다. 다시 연결한 후 시도하세요.",
  "Could not remove t3": "Liverary CLI 명령을 삭제하지 못했습니다",
  "Could not reset provider instance": "AI 제공자를 초기화하지 못했습니다",
  "Could not send input to the provider sign-in terminal.":
    "AI 제공자 로그인 터미널에 입력을 보내지 못했습니다.",
  "Could not update provider instance": "AI 제공자 설정을 저장하지 못했습니다",
  "Couldn't change this setting.": "이 설정을 변경하지 못했습니다.",
  "Couldn’t remove theme": "테마를 삭제하지 못했습니다",
  "Couldn’t restore theme settings": "테마 설정을 복원하지 못했습니다",
  "Couldn’t save theme selection": "테마 선택을 저장하지 못했습니다",
  "Create theme": "테마 만들기",
  "Created at": "생성 시각",
  "Current version of the application.": "현재 설치된 앱 버전입니다.",
  "Cursor account": "Cursor 계정",
  "Cursor account usage": "Cursor 계정 사용량",
  Custom: "사용자 지정",
  "Custom hex accent color": "강조 색상의 HEX 값",
  "Custom instructions": "사용자 지정 지침",
  "Custom models are always shown in the picker":
    "사용자 지정 모델은 모델 선택 목록에 항상 표시됩니다",
  "Custom option": "사용자 지정 옵션",
  "Custom…": "사용자 지정…",
  Dark: "어둡게",
  "Days of inactivity before auto-settle": "자동 정리 전 비활성 일수",
  "Decrease provider health check interval": "AI 제공자 상태 확인 간격 줄이기",
  Default: "기본값",
  "Default automatic pull": "기본 자동 가져오기",
  "Default browser appearance": "기본 브라우저 화면 모드",
  "Default browser profile": "기본 브라우저 프로필",
  "Default browser viewport": "기본 브라우저 화면 크기",
  "Default browser zoom": "기본 브라우저 확대 비율",
  "Default choice": "기본 선택",
  "Default diff file state": "변경 파일 기본 펼침 상태",
  "Default merge method": "기본 병합 방식",
  "Default model": "기본 모델",
  "Default model for new threads, selected automatically. Projects can override it.":
    "새 대화에 사용할 기본 모델을 자동으로 선택합니다. 프로젝트마다 바꿀 수 있습니다.",
  "Default model for new threads. Projects can override it.":
    "새 대화에 사용할 기본 모델입니다. 프로젝트마다 바꿀 수 있습니다.",
  "Default model not saved": "기본 모델을 저장하지 못했습니다",
  "Default permissions": "기본 권한",
  "Default permissions for new threads. Projects can override them.":
    "새 대화의 기본 권한입니다. 프로젝트마다 바꿀 수 있습니다.",
  "Default pull request merge method": "기본 PR 병합 방식",
  "Default workspace": "기본 작업 공간",
  "Delete confirmation": "삭제 확인",
  "Delete now": "지금 삭제",
  "Dev artwork": "개발 환경 장식 이미지",
  Device: "기기",
  "Device sources": "기기 연결 소스",
  "Device that runs this provider.": "이 AI 제공자를 실행하는 기기입니다.",
  "Device unavailable": "기기를 사용할 수 없습니다",
  Devices: "기기",
  Diagnostics: "진단",
  "Diff colors": "변경 내역 색상",
  "Diff layout": "변경 내역 배치",
  "Diff whitespace changes": "공백 변경 사항 표시",
  Diffs: "변경 내역",
  "Diffs & pull requests": "변경 내역 및 PR",
  Direct: "즉시 종료",
  "Disable all": "모두 숨기기",
  Disabled: "사용 안 함",
  Disconnect: "연결 해제",
  "Discovering sign-in methods…": "로그인 방식을 확인하는 중…",
  Display: "표시",
  "Display name": "표시 이름",
  Docs: "도움말",
  Done: "완료",
  "Double press": "두 번 누르기",
  Download: "다운로드",
  "Download failed.": "다운로드하지 못했습니다.",
  "Downloading…": "다운로드 중…",
  Driver: "드라이버",
  "Duplicate theme": "테마 복제",
  "Each paragraph or code block appears as soon as it is complete.":
    "각 문단이나 코드 블록이 완성되는 대로 표시합니다.",
  "Edit name and options": "이름 및 옵션 편집",
  "Edit theme": "테마 편집",
  "Effort display": "추론 강도 표시",
  Empty: "비어 있음",
  "Enable Antigravity": "Antigravity 사용",
  "Enable all": "모두 표시",
  "Enter a model slug.": "모델 식별자를 입력하세요.",
  "Enter an official registry ID and any local executable or auth override.":
    "공식 레지스트리 ID와 필요한 로컬 실행 파일 또는 인증 설정을 입력하세요.",
  "Enter code": "코드 입력",
  "Enter manually": "직접 입력",
  "Enter your credentials below.": "아래에 인증 정보를 입력하세요.",
  Environment: "실행 환경",
  "Environment icon": "실행 환경 아이콘",
  "Environment identification": "실행 환경 구분 표시",
  "Environment-wide setting. Select an environment to change it.":
    "환경 전체에 적용되는 설정입니다. 변경할 환경을 선택하세요.",
  Environments: "실행 환경",
  "Everything outside code blocks and the terminal.":
    "코드 블록과 터미널을 제외한 화면에 적용합니다.",
  "Executable is required.": "실행 파일을 입력하세요.",
  "Executable name or path on this environment.": "이 실행 환경의 실행 파일 이름 또는 경로입니다.",
  Expanded: "펼침",
  "Export theme file": "테마 파일 내보내기",
  "Extracting Antigravity.": "Antigravity 압축을 푸는 중입니다.",
  "Failed to refresh providers": "AI 제공자 정보를 새로 고치지 못했습니다",
  "Fallback model": "대체 모델",
  "Fallback model not saved": "대체 모델을 저장하지 못했습니다",
  "Fast mode": "빠른 모드",
  "Filter models": "모델 검색",
  "Finish signing in in your browser.": "브라우저에서 로그인을 완료하세요.",
  "Finishing sign-in...": "로그인을 마무리하는 중…",
  "Fix the expression above to continue editing visually.":
    "시각적 편집을 계속하려면 위의 조건식을 수정하세요.",
  "Fold working and monitoring threads into a Working section. They return to the top of the inbox when they need you. The boring sidebar in Labs has no Working section.":
    "작업 중이거나 모니터링 중인 대화를 진행 중 영역에 모읍니다. 입력이 필요하면 받은 대화함 위쪽으로 돌아옵니다. 실험실의 프로젝트별 사이드바에는 이 영역이 없습니다.",
  "Follow change request templates": "변경 요청 템플릿 사용",
  "Follow system": "시스템 설정 따르기",
  "Follow the system appearance": "시스템 화면 모드 따르기",
  "Follow-up behavior": "추가 메시지 처리",
  "Follow-ups": "추가 메시지",
  "Font smoothing": "글꼴 다듬기",
  Full: "전체 너비",
  General: "일반",
  "Git fetch interval": "Git 가져오기 간격",
  "Glass opacity": "배경 불투명도",
  Group: "그룹",
  "Guest links": "게스트 링크",
  "Stop all active guest links in the selected environments.":
    "선택한 환경에서 활성 게스트 접속을 모두 종료합니다.",
  "Stop all guest sharing": "게스트 공유 모두 종료",
  "Having trouble signing in?": "로그인이 잘되지 않나요?",
  "Health check interval": "상태 확인 간격",
  "Hidden from picker": "선택 목록에서 숨김",
  "Hide whitespace changes": "공백 변경 숨기기",
  "Hide whitespace changes by default": "공백 변경을 기본으로 숨기기",
  "Higher values make menus, dialogs, and the composer more solid.":
    "값이 높을수록 메뉴, 대화상자 및 입력창의 배경이 불투명해집니다.",
  Hold: "길게 누르기",
  "Hold mode also quits on two quick presses.":
    "길게 누르기 모드에서도 빠르게 두 번 누르면 종료합니다.",
  "Hold webhooks while offline": "오프라인 동안 웹훅 보관",
  "How new worktrees in this project populate git submodules.":
    "이 프로젝트의 새 워크트리에 Git 서브모듈을 가져오는 방식입니다.",
  "How new worktrees populate git submodules. Projects and their liverary.json can override it.":
    "새 워크트리에 Git 서브모듈을 가져오는 방식입니다. 프로젝트 설정과 liverary.json에서 바꿀 수 있습니다.",
  "T3 usage analytics are off by default. AI requests go to your selected service. OTLP diagnostic exports run only when explicitly configured.":
    "사용 분석은 기본적으로 꺼져 있습니다. AI 요청은 선택한 서비스로 전송되며, OTLP 진단 내보내기는 직접 설정할 때만 동작합니다.",
  "If sign-in doesn't return to T3 Code, paste the URL from the final localhost page.":
    "로그인 후 앱으로 돌아오지 않으면 마지막 localhost 페이지의 URL을 붙여 넣으세요.",
  "If the final localhost page does not load, paste its full URL here.":
    "마지막 localhost 페이지가 열리지 않으면 전체 URL을 여기에 붙여 넣으세요.",
  "In-app notifications": "앱 내 알림",
  "Inactivity does not settle threads with a pull request. Merge and close still do.":
    "PR이 있는 대화는 비활성 상태여도 정리하지 않습니다. PR이 병합되거나 닫히면 정리합니다.",
  "Include app text": "앱 텍스트 포함",
  Incompatible: "호환되지 않음",
  "Increase provider health check interval": "AI 제공자 상태 확인 간격 늘리기",
  Inherit: "상속",
  "Inherited from the project's configuration file": "프로젝트 설정 파일에서 상속됨",
  Inherits: "상속됨",
  "Inspect processes, resource use, and logs on one environment at a time.":
    "한 번에 하나의 실행 환경에서 프로세스, 리소스 사용량 및 로그를 확인합니다.",
  "Inspect processes, resource use, and logs on this environment.":
    "이 실행 환경의 프로세스, 리소스 사용량 및 로그를 확인합니다.",
  Install: "설치",
  "Install Antigravity": "Antigravity 설치",
  "Install and manage Antigravity.": "Antigravity를 설치하고 관리합니다.",
  "Install failed.": "설치하지 못했습니다.",
  "Install managed runtime": "관리형 실행 파일 설치",
  "Installed · Sign-in not checked": "설치됨 · 로그인 확인 안 됨",
  "Instance ID": "인스턴스 ID",
  "Instance ID is required.": "인스턴스 ID를 입력하세요.",
  "Instance ID must be 64 characters or fewer.": "인스턴스 ID는 64자 이하여야 합니다.",
  "Instance ID must start with a letter and use only letters, digits, '-', or '_'.":
    "인스턴스 ID는 영문자로 시작해야 하며 영문자, 숫자, '-', '_'만 사용할 수 있습니다.",
  "Instance label": "인스턴스 표시 이름",
  Interface: "화면 구성",
  "Interface font": "화면 글꼴",
  "Interface font size": "화면 글꼴 크기",
  "It’s now active.": "테마가 적용되었습니다.",
  "Keep agent credits": "에이전트 작성 표시 유지",
  "Keep branch and worktree controls below the composer after a thread starts.":
    "대화를 시작한 뒤에도 입력창 아래에 브랜치와 워크트리 조작 버튼을 표시합니다.",
  "Keep composer context visible in active threads": "진행 중 대화에 입력창 작업 정보 표시",
  "Keep threads with a PR": "PR이 있는 대화 유지",
  "Keep worktrees with local changes": "로컬 변경사항이 있는 워크트리 유지",
  "Keeps the default branch current when the checkout has no local changes or commits. Projects can override it.":
    "체크아웃에 로컬 변경사항이나 커밋이 없을 때 기본 브랜치를 최신으로 유지합니다. 프로젝트마다 바꿀 수 있습니다.",
  "Keeps this project's default branch current when the checkout has no local changes or commits.":
    "체크아웃에 로컬 변경사항이나 커밋이 없을 때 이 프로젝트의 기본 브랜치를 최신으로 유지합니다.",
  Keybindings: "단축키",
  "Known broken version": "알려진 오류가 있는 버전",
  Label: "표시 이름",
  Labs: "실험실",
  "Last selected": "최근 선택",
  "Last user message": "최근 사용자 메시지",
  Latest: "최신 버전",
  'Leave empty to use "~/" when the Add Project browser opens.':
    '비워 두면 프로젝트 추가 창을 열 때 "~/"에서 시작합니다.',
  Legacy: "이전 기능",
  Legal: "법적 고지",
  "Letters, digits, '-', or '_'.": "영문, 숫자, '-' 또는 '_'를 사용할 수 있습니다.",
  Light: "밝게",
  "Light and dark theme variants": "밝은 모드 및 어두운 모드 테마",
  "Limited permissions": "권한 제한",
  "Limited support": "일부 기능만 지원",
  "Linked environments": "연결된 실행 환경",
  "Load balancing": "부하 분산",
  "Loading devices": "기기를 불러오는 중",
  "Loading provider settings": "AI 제공자 설정 불러오는 중",
  "Loading sign-in terminal…": "로그인 터미널을 여는 중…",
  "Local ACP": "로컬 ACP",
  "Local ACP command": "로컬 ACP 명령",
  "Local device": "로컬 기기",
  "Local environment": "로컬 실행 환경",
  "Local simulators": "로컬 시뮬레이터",
  Maintenance: "유지 관리",
  "Managed binary cleanup failed.": "앱에서 관리하는 실행 파일을 정리하지 못했습니다.",
  "Managed by T3 Code": "앱에서 관리",
  Manual: "수동",
  Mixed: "여러 값",
  "Mixed across selected environments": "선택한 환경마다 다름",
  Model: "모델",
  "Model for new threads in this project.": "이 프로젝트의 새 대화에 사용할 모델입니다.",
  "Model preferences and custom models are saved on the selected environment and shared across connected devices.":
    "모델 기본 설정과 사용자 지정 모델은 선택한 실행 환경에 저장되며 연결된 기기에서 함께 사용합니다.",
  Models: "모델",
  "Monospace font": "고정폭 글꼴",
  "More providers": "다른 AI 제공자",
  "Move down": "아래로 이동",
  "Move up": "위로 이동",
  "Needs attention": "확인 필요",
  "Negate group": "그룹 조건 반전",
  "Network access": "네트워크 접근",
  Never: "사용 안 함",
  "New keybinding": "새 단축키",
  "New projects": "새 프로젝트",
  "New thread mode": "새 대화 모드",
  "New threads": "새 대화",
  "New worktrees start from remote": "원격 브랜치를 기준으로 새 작업 트리 만들기",
  Next: "다음",
  "No connected devices": "연결된 기기 없음",
  "No custom options. The composer uses the provider's default options.":
    "사용자 지정 옵션이 없습니다. 입력창에서 AI 제공자의 기본 옵션을 사용합니다.",
  "No fonts found.": "글꼴을 찾지 못했습니다.",
  "No in-app sign-in advertised. Follow the provider's docs to finish setup.":
    "앱 내 로그인이 지원되지 않습니다. AI 제공자의 문서에 따라 설정을 완료하세요.",
  "No keybindings match your search.": "검색과 일치하는 단축키가 없습니다.",
  "No models match.": "일치하는 모델이 없습니다.",
  "No models reported for this provider yet.": "이 AI 제공자의 모델 정보가 아직 없습니다.",
  "No providers available": "사용할 수 있는 AI 제공자 없음",
  "No providers configured.": "설정된 AI 제공자가 없습니다.",
  "No reasoning": "추론 없음",
  "No settings found": "검색 결과가 없습니다",
  "No text generation providers available.": "사용할 수 있는 텍스트 생성 제공자가 없습니다.",
  None: "없음",
  Not: "반대",
  "Not authenticated": "인증되지 않음",
  "Not found": "찾을 수 없음",
  "Not installed": "설치되지 않음",
  "Not installed.": "설치되지 않았습니다.",
  "Not set": "설정되지 않음",
  "Not used": "사용하지 않음",
  "Notices for dependencies, assets, and optional tools used by T3 Code.":
    "이 앱에서 사용하는 라이브러리, 리소스 및 선택 도구의 라이선스입니다.",
  Notifications: "알림",
  "Notifications are unavailable in this browser. Sound only is still available.":
    "이 브라우저에서는 알림을 사용할 수 없습니다. 소리만 재생하는 옵션은 계속 사용할 수 있습니다.",
  "Notifications need a supported browser over HTTPS, or the desktop app. Sound only is still available.":
    "알림은 HTTPS를 사용하는 지원 브라우저 또는 데스크톱 앱에서 사용할 수 있습니다. 소리만 재생하는 옵션은 계속 사용할 수 있습니다.",
  Off: "꺼짐",
  On: "켜짐",
  "One literal argument per row, in launch order.": "실행 순서대로 한 줄에 인수 하나씩 입력합니다.",
  "Only the box you write prompts in. Mono works well here.":
    "메시지를 작성하는 입력창에만 적용합니다. 고정폭 글꼴을 사용할 수 있습니다.",
  "Open browser": "브라우저 열기",
  "Open docs": "도움말 열기",
  "Open keybindings.json": "keybindings.json 열기",
  "Open linked pull requests first. Otherwise, open Changes for edits to at least 3 files or 50 lines.":
    "연결된 PR을 먼저 엽니다. PR이 없으면 파일 3개 이상 또는 50줄 이상 변경했을 때 변경 내역을 엽니다.",
  "Open links in": "링크 열기 위치",
  "Open pull requests in T3 Code": "앱에서 PR 열기",
  "Open sign-in page": "로그인 페이지 열기",
  "Open source licenses": "오픈 소스 라이선스",
  "OpenTelemetry export": "OpenTelemetry 내보내기",
  Option: "옵션",
  "Option id": "옵션 ID",
  "Option label": "옵션 표시 이름",
  "Option type": "옵션 유형",
  "Optional marker shown in the picker.": "선택 목록에 표시할 선택 사항입니다.",
  "Options shown in the composer": "입력창에 표시할 옵션",
  "Or choose from ACP Registry": "또는 ACP Registry에서 선택",
  "Order of projects in the sidebar project picker and command palette.":
    "사이드바 프로젝트 선택기와 명령 팔레트의 프로젝트 순서를 설정합니다.",
  "Other ways to connect": "다른 연결 방법",
  "Overridden by": "적용된 개별 설정:",
  "Overridden for this project": "이 프로젝트의 개별 설정",
  "Overridden for this project. Show where this value comes from":
    "이 프로젝트에 별도로 설정했습니다. 값의 적용 위치 보기",
  "Panel animation duration": "패널 애니메이션 시간",
  "Panel animations": "패널 애니메이션",
  "Paste the URL from the sign-in tab": "로그인 탭의 URL을 붙여 넣으세요",
  Performance: "성능",
  Permissions: "권한",
  "Permissions for new threads in this project.": "이 프로젝트의 새 대화에 적용할 권한입니다.",
  "Plain text": "일반 텍스트",
  "Plan mode (legacy)": "계획 모드 (이전 방식)",
  "Preparing sign-in.": "로그인을 준비하는 중입니다.",
  "Press shortcut": "단축키를 누르세요",
  "Primary device": "기본 기기",
  "Privacy policy": "개인정보 및 외부 연결",
  "Proactive panels": "관련 패널 자동 열기",
  Project: "프로젝트",
  "Project Grouping": "프로젝트 그룹화",
  "Project defaults and overrides": "프로젝트 기본값 및 개별 설정",
  "Project grouping": "프로젝트 묶기",
  "Project order": "프로젝트 정렬",
  "Project overview": "프로젝트 개요",
  Projects: "프로젝트",
  "Prompt font": "입력창 글꼴",
  "Prompt font size": "입력창 글꼴 크기",
  Provider: "AI 제공자",
  "Provider default": "AI 제공자 기본값",
  "Provider deleted, but managed files remain": "AI 제공자는 삭제했지만 관리 파일이 남아 있습니다",
  "Provider health check interval in seconds": "AI 제공자 상태 확인 간격 (초)",
  "Provider instance added": "AI 제공자를 추가했습니다",
  "Provider settings are unavailable": "AI 제공자 설정을 사용할 수 없습니다",
  "Provider setup failed.": "AI 제공자 설정에 실패했습니다.",
  "Provider setup failed. Try again.": "AI 제공자 설정에 실패했습니다. 다시 시도하세요.",
  "Provider setup is read-only.": "AI 제공자 설정은 읽기 전용입니다.",
  "Provider sign-in failed. Try again.": "AI 제공자 로그인에 실패했습니다. 다시 시도해 주세요.",
  "Provider sign-in link": "AI 제공자 로그인 링크",
  "Provider update checks": "AI 제공자 업데이트 확인",
  Providers: "AI 제공자",
  "Publish agent activity": "에이전트 활동 게시",
  "Pull request sharing": "PR 공유",
  "Pull requests": "PR",
  "Pull requests in this project start with this method.":
    "이 프로젝트에서 PR을 만들 때 사용할 기본 병합 방식입니다.",
  "Pull requests start with this method. Last selected reuses whatever you chose most recently on this device.":
    "PR의 기본 병합 방식입니다. 최근 선택을 사용하면 이 기기에서 마지막으로 선택한 방식을 적용합니다.",
  Queue: "대기열에 추가",
  "Quit shortcut": "종료 단축키",
  "Quit shortcut behavior": "종료 단축키 동작",
  "Reading connected execution environments.": "연결된 실행 환경을 불러오고 있습니다.",
  Ready: "준비됨",
  "Reconnect account": "계정 다시 연결",
  "Reconnect the selected environment to change this setting.":
    "이 설정을 변경하려면 선택한 환경에 다시 연결하세요.",
  "Reconnect this device to set up its provider, or select another device.":
    "AI 제공자를 설정하려면 이 기기를 다시 연결하거나 다른 기기를 선택하세요.",
  "Red & green (default)": "빨강 및 초록 (기본)",
  "Refresh provider status": "AI 제공자 상태 새로 고침",
  "Refresh provider status, versions, and models in the background. Set to 0 to disable.":
    "백그라운드에서 AI 제공자 상태, 버전 및 모델 목록을 새로 고칩니다. 0으로 설정하면 끕니다.",
  "Refresh the provider and start the authentication flow again.":
    "AI 제공자 상태를 새로 고친 다음 인증을 다시 시작하세요.",
  "Refreshing providers": "AI 제공자 새로 고침 중",
  "Reinstall Antigravity": "Antigravity 다시 설치",
  "Remote device": "원격 기기",
  Remove: "삭제",
  "Remove agent credits when merging": "병합 시 에이전트 작성 표시 제거",
  "Remove choice": "선택 항목 삭제",
  "Remove custom model": "사용자 지정 모델 삭제",
  "Remove downloaded runtime": "다운로드한 실행 파일 삭제",
  "Remove from favorites": "즐겨찾기 해제",
  "Remove recognized agent credit lines from merge and squash messages on hosts that support it, keeping human co-authors. Includes auto-merge. Excludes merge queues, stack merges, and existing commits.":
    "지원하는 호스트에서 병합 및 스쿼시 메시지의 에이전트 작성 표시를 제거하고 사람 공동 작성자는 유지합니다. 자동 병합에도 적용하며, 병합 대기열·스택 병합·기존 커밋에는 적용하지 않습니다.",
  "Remove theme": "테마 삭제",
  "Remove themes": "테마 삭제",
  "Removing runtime": "런타임 삭제 중",
  "Render math": "수식 표시",
  "Repository conventions": "저장소 규칙",
  "Require a second click on the inline archive action before a thread is archived.":
    "대화를 보관하려면 보관 버튼을 한 번 더 클릭하도록 합니다.",
  Reset: "초기화",
  "Reset automatic pull to off": "자동 가져오기를 끄기로 초기화",
  "Reset to default": "기본값으로 초기화",
  "Reset to inherited value": "상속된 값으로 초기화",
  "Reset to last selected": "최근 선택으로 초기화",
  "Reset to the device setting": "기기 설정으로 초기화",
  "Response streaming": "응답 표시 방식",
  "Restart and turn off": "다시 시작하고 끄기",
  "Restart and turn on": "다시 시작하고 켜기",
  "Restarting…": "다시 시작하는 중…",
  "Restore Build/Plan, /plan, /default, and Shift+Tab. Off uses build mode.":
    "Build/Plan, /plan, /default 및 Shift+Tab을 복원합니다. 끄면 실행 모드를 사용합니다.",
  "Restore default settings?": "기본 설정으로 복원할까요?",
  "Resume after usage limits": "사용량 한도 초기화 후 재개",
  "Resume usage-limit stops at the reported reset time. Each thread can cancel its scheduled continuation.":
    "사용량 한도 때문에 중지된 대화를 안내된 초기화 시각에 재개합니다. 각 대화에서 예약된 재개를 취소할 수 있습니다.",
  "Retry connection": "연결 다시 시도",
  "Retry installation": "설치 다시 시도",
  "Retry setup status": "설정 상태 다시 확인",
  "Retry sign-in": "로그인 다시 시도",
  Review: "확인",
  "Review guide instructions": "검토 가이드 지침",
  "Review guide model": "검토 가이드 모델",
  "Review guides (beta)": "검토 가이드 (베타)",
  "Rich text composer": "서식 있는 입력창",
  "Run T3 Code's CLI as `t3` from any terminal.":
    "모든 터미널에서 `liverary` 명령으로 Liverary를 실행합니다.",
  "Run agents on this computer. Turn off to use T3 Code only with remote environments.":
    "이 컴퓨터에서 에이전트를 실행합니다. 끄면 원격 실행 환경만 사용합니다.",
  "Run it in a terminal when you are ready to update.":
    "업데이트할 준비가 되면 터미널에서 실행하세요.",
  Runtime: "실행 구성",
  "Same on all machines": "모든 컴퓨터에서 동일",
  Save: "저장",
  Saving: "저장 중",
  "Scheduled tasks": "예약 작업",
  Search: "검색",
  "Search engine": "검색 엔진",
  "Search fonts…": "글꼴 검색…",
  "Search keybindings": "단축키 검색",
  "Search registry": "레지스트리 검색",
  "Search settings": "설정 검색",
  "Secret providers": "비밀 정보 제공자",
  Secrets: "비밀 정보",
  "Select an ACP or configure one manually.": "ACP를 선택하거나 직접 설정하세요.",
  "Select the variants you want to remove. You can restore them by importing the extension again.":
    "삭제할 테마를 선택하세요. 확장 기능을 다시 가져오면 복원할 수 있습니다.",
  "Selected by T3 Code.": "앱에서 선택한 경로입니다.",
  "Send shortcut": "전송 단축키",
  "Sensitive values are stored separately and never returned to the app.":
    "민감한 값은 별도로 저장되며 앱에 원문을 반환하지 않습니다.",
  "Sensitive, stored separately": "민감한 정보, 별도 저장됨",
  "Separate fonts": "글꼴 개별 설정",
  "Set how fast panels open and close.": "패널을 열고 닫는 속도를 설정합니다.",
  "Set how wide messages and the composer can grow on large screens.":
    "큰 화면에서 메시지와 입력창이 차지하는 최대 너비를 설정합니다.",
  "Set on the environment": "환경에 설정됨",
  "Set the prompt, code, and terminal fonts separately instead of one monospace font.":
    "입력창, 코드, 터미널의 글꼴을 각각 설정합니다.",
  "Set whether the diff panel ignores whitespace-only edits by default.":
    "변경 내역에서 공백만 바뀐 부분을 기본적으로 숨길지 설정합니다.",
  "Setting up...": "설정 중…",
  Settings: "설정",
  "Settings breadcrumb": "설정 탐색 경로",
  "Settings search results": "설정 검색 결과",
  "Settings sections": "설정 항목",
  "Settle a thread when its pull request merges. Closed pull requests still settle automatically.":
    "PR이 병합되면 관련 대화를 정리합니다. 닫힌 PR의 대화도 자동으로 정리됩니다.",
  Setup: "설정",
  "Setup unavailable": "설정할 수 없습니다",
  "Shadow home path": "별도 홈 경로",
  "Sharing & access": "공유 및 접근",
  "Show development artwork in the sidebar header.":
    "사이드바 머리글에 개발 환경 장식 이미지를 표시합니다.",
  "Show a toast when another thread finishes, fails, or needs input or approval while this app has focus.":
    "앱을 사용하는 동안 다른 대화가 완료되거나 실패하거나 입력 또는 승인이 필요하면 알림을 표시합니다.",
  "Show diffs stacked or side by side. The toggle in the diff toolbar changes this too.":
    "변경 내역을 위아래 또는 나란히 표시합니다. 변경 내역 도구 모음에서도 바꿀 수 있습니다.",
  "Show finished paragraphs": "완성된 문단부터 표시",
  "Show formatted Markdown as you type.": "입력하는 동안 마크다운 서식을 표시합니다.",
  "Show key presses in recordings": "녹화에 키 입력 표시",
  "Show less": "간단히 보기",
  "Show more": "더 보기",
  "Show mouse presses in recordings": "녹화에 마우스 클릭 표시",
  "Show reasoning effort in the composer as its name, such as High, or as bars.":
    "입력창의 추론 강도를 높음 같은 문구 또는 막대로 표시합니다.",
  "Show skills in slash menu": "슬래시 메뉴에 스킬 표시",
  "Shown in picker": "모델 선택 목록에 표시됨",
  "Shown in the provider list.": "AI 제공자 목록에 표시됩니다.",
  "Shows context window usage as a circular indicator in the composer.":
    "입력창에 컨텍스트 사용량을 원형 표시로 보여 줍니다.",
  Sidebar: "사이드바",
  "Sidebar threads with no activity for this long settle automatically.":
    "설정한 기간 동안 활동이 없는 사이드바 대화를 자동으로 정리합니다.",
  "Sign in": "로그인",
  "Sign out": "로그아웃",
  "Sign-in method": "로그인 방식",
  "Signed in as": "로그인한 계정",
  "Signed in.": "로그인되었습니다.",
  "Signed out locally.": "이 기기에서 로그아웃되었습니다.",
  "Signing in...": "로그인 중…",
  "Simlock device hosts (alpha)": "Simlock 기기 호스트 (알파)",
  "Skip for now": "나중에 설정",
  SnapShots: "화면 캡처",
  Snooze: "나중에 알림",
  "Snooze options": "나중에 알림 옵션",
  "Snooze until limits reset": "사용량 한도 초기화까지 미루기",
  "Snooze usage-limit stops until reset. Pair with resume to continue on wake.":
    "사용량 한도로 중지된 대화를 초기화 시각까지 미룹니다. 재개 옵션을 함께 켜면 이후 작업을 이어갑니다.",
  "Something went wrong.": "문제가 발생했습니다.",
  Source: "소스",
  "Source control": "소스 관리",
  "Source control writer model": "소스 관리 작성 모델",
  "Source control writing style": "소스 관리 작성 스타일",
  Split: "나란히",
  Stable: "안정 버전",
  Stacked: "위아래",
  "Start from remote": "원격 브랜치에서 시작",
  "Start with files expanded or collapsed when opening diffs or a pull request's Code tab.":
    "변경 내역이나 PR의 코드 탭을 열 때 파일을 펼치거나 접어서 표시합니다.",
  "Starting installation": "설치 시작 중",
  "Starting sign-in…": "로그인을 시작하는 중…",
  "Starting update": "업데이트 시작 중",
  Status: "상태",
  Steer: "진행 중 작업에 전달",
  "Stored secret, enter a new value to replace":
    "저장된 비밀 정보입니다. 바꾸려면 새 값을 입력하세요",
  Submodules: "서브모듈",
  "Switches the hosted app release channel.": "웹 앱의 업데이트 채널을 변경합니다.",
  "Switches this app and every connected machine whose database the target release supports.":
    "대상 버전이 데이터베이스를 지원하는 이 앱과 연결된 모든 컴퓨터의 채널을 변경합니다.",
  System: "시스템",
  "System alerts when a thread finishes, fails, or needs input or approval. Applies to this device while T3 Code is open.":
    "대화가 완료되거나 실패하거나 입력 또는 승인이 필요하면 시스템 알림을 보냅니다. 앱이 열려 있는 동안 이 기기에 적용합니다.",
  "System default": "시스템 기본값",
  "System default follows your browser or OS clock preference.":
    "시스템 기본값은 브라우저 또는 운영체제의 시간 형식을 따릅니다.",
  "System monospace": "시스템 고정폭 글꼴",
  "T3 Code does not recognize this condition yet. It can still be saved, but it may not match unless the runtime provides it.":
    "앱에서 아직 인식하지 못하는 조건입니다. 저장은 가능하지만 런타임이 해당 조건을 제공해야 적용됩니다.",
  "T3 Code will restart and start running a server on this computer again.":
    "앱이 다시 시작되고 이 컴퓨터에서 서버를 다시 실행합니다.",
  "T3 Code will restart without running a server on this computer. Any agents and terminals running here will stop, and other devices will no longer be able to connect to this computer. Your projects, history, and remote environments are unaffected.":
    "앱이 이 컴퓨터에서 서버를 실행하지 않는 상태로 다시 시작됩니다. 이곳에서 실행 중인 에이전트와 터미널이 중지되며 다른 기기에서 이 컴퓨터에 연결할 수 없게 됩니다. 프로젝트, 기록, 원격 환경은 그대로 유지됩니다.",
  "T3 Connect": "T3 Connect",
  "Tailscale HTTPS": "Tailscale HTTPS",
  "Terminal font": "터미널 글꼴",
  "Terminal font size": "터미널 글꼴 크기",
  "Terminal output, independent from code blocks and diffs.":
    "코드 블록 및 변경 내역과 별도로 터미널 출력에 적용합니다.",
  "Text appears once the agent finishes its turn.": "에이전트가 응답을 마치면 텍스트를 표시합니다.",
  "Text generation": "텍스트 생성",
  "Text generation model": "텍스트 생성 모델",
  "Text generation model not saved": "텍스트 생성 모델을 저장하지 못했습니다",
  "That custom model is already saved.": "이미 저장된 사용자 지정 모델입니다.",
  "That model is already built in.": "이미 기본 제공되는 모델입니다.",
  "The authentication request expired.": "인증 요청이 만료되었습니다.",
  "The browser may claim some shortcuts first. The desktop app receives them all.":
    "브라우저가 일부 단축키를 먼저 처리할 수 있습니다. 데스크톱 앱에서는 모든 단축키를 사용할 수 있습니다.",
  "The configured Antigravity runtime has not been checked.":
    "설정된 Antigravity 런타임을 아직 확인하지 않았습니다.",
  "The configured Antigravity runtime is unavailable.":
    "설정된 Antigravity 런타임을 사용할 수 없습니다.",
  "The keybinding was not removed.": "단축키를 삭제하지 못했습니다.",
  "The keybinding was not saved.": "단축키를 저장하지 못했습니다.",
  "The keybindings file was not opened.": "단축키 파일을 열지 못했습니다.",
  "The most recent matching binding wins when both conditions can apply.":
    "두 조건이 모두 일치하면 가장 최근에 설정한 단축키가 적용됩니다.",
  "The provider failed its startup checks.": "AI 제공자의 시작 상태 확인에 실패했습니다.",
  "The provider is installed, but the server could not fully verify it.":
    "AI 제공자는 설치되어 있지만 서버에서 상태를 완전히 확인하지 못했습니다.",
  "The provider sign-in terminal is no longer available.":
    "AI 제공자 로그인 터미널을 더 이상 사용할 수 없습니다.",
  "The provider update command could not be started.":
    "AI 제공자 업데이트 명령을 실행하지 못했습니다.",
  "The selected targets use different streaming modes.":
    "선택한 대상의 응답 표시 방식이 서로 다릅니다.",
  "The settings update failed.": "설정을 저장하지 못했습니다.",
  "Theme mix": "테마 혼합",
  Themes: "테마",
  "This connection can view keybindings but cannot change them.":
    "이 연결에서는 단축키를 볼 수 있지만 변경할 수는 없습니다.",
  "This driver has no required configuration. You can add the instance now.":
    "필수 설정이 없는 드라이버입니다. 바로 추가할 수 있습니다.",
  "This instance uses": "이 인스턴스의 드라이버:",
  "This interval is configured here, then the shared Background activity policy decides whether provider probes may run when the timer fires. Custom intervals appear as Advanced in Maintenance settings.":
    "여기서 확인 간격을 설정합니다. 실제 실행 여부는 공통 백그라운드 작업 정책에 따릅니다. 사용자 지정 간격은 유지 관리 설정에서 고급 설정으로 표시됩니다.",
  "This machine": "이 컴퓨터",
  "This provider instance is no longer available on this device.":
    "이 기기에서 해당 AI 제공자를 더 이상 사용할 수 없습니다.",
  "This provider is installed but disabled for new sessions in T3 Code.":
    "이 제공자는 설치되어 있지만 새 대화에서는 사용하지 않도록 설정되어 있습니다.",
  "Thread details": "대화 세부 정보",
  "Thread notifications": "대화 알림",
  "Thread title instructions": "대화 제목 생성 지침",
  Threads: "대화 관리",
  "Time format": "시간 형식",
  "Timestamp format": "시간 형식",
  Toggle: "켜기/끄기",
  "Toggle account email visibility": "계정 이메일 표시 전환",
  "Try again.": "다시 시도해 주세요.",
  "Try sign-in in your browser": "브라우저에서 로그인 시도",
  "Turn off local environment?": "로컬 실행 환경을 끌까요?",
  "Turn on local environment?": "로컬 실행 환경을 켤까요?",
  "Turned off. Agents only run in remote environments.":
    "꺼져 있습니다. 에이전트는 원격 실행 환경에서만 실행됩니다.",
  "Two-line folder rows": "폴더 정보를 두 줄로 표시",
  "Typeset LaTeX math, such as $x^2$ or \\[x^2\\], in messages and Markdown previews. The composer keeps TeX source editable.":
    "메시지와 마크다운 미리 보기에서 $x^2$ 또는 \\[x^2\\] 같은 LaTeX 수식을 표시합니다. 입력창에서는 TeX 소스를 편집할 수 있습니다.",
  Typography: "글꼴",
  "Unable to open keybindings file": "단축키 파일을 열지 못했습니다",
  "Unable to remove keybinding": "단축키를 삭제하지 못했습니다",
  "Unable to save keybinding": "단축키를 저장하지 못했습니다",
  Unassigned: "지정되지 않음",
  Unavailable: "사용할 수 없음",
  "Unpin confirmation": "고정 해제 확인",
  Unsupported: "지원되지 않음",
  "Unsupported version": "지원되지 않는 버전",
  "Up to Date": "최신 버전",
  "Update Antigravity": "Antigravity 업데이트",
  "Update available": "업데이트 있음",
  "Update available.": "업데이트가 있습니다.",
  "Update check failed.": "업데이트 확인에 실패했습니다.",
  "Update confirmation failed.": "업데이트 확인에 실패했습니다.",
  "Update for full support.": "모든 기능을 사용하려면 업데이트하세요.",
  "Update now": "지금 업데이트",
  "Update required": "업데이트 필요",
  "Update this environment to manage Antigravity.":
    "Antigravity를 관리하려면 이 실행 환경을 업데이트하세요.",
  Updates: "업데이트",
  "Usage limits": "사용량 한도",
  "Usage providers": "사용량 제공자",
  "Use T3 desktop for automatic return": "데스크톱 앱에서 로그인 후 자동으로 돌아오기",
  "Use a different account": "다른 계정 사용",
  "Use devices": "기기 사용",
  "Use for both light and dark": "밝은 모드와 어두운 모드 모두에 적용",
  "Use the first variants for light and dark": "밝은 모드와 어두운 모드에 첫 번째 테마 적용",
  "Use thinner grayscale text smoothing instead of the macOS default.":
    "macOS 기본 방식 대신 더 얇은 회색조 글꼴 다듬기를 사용합니다.",
  "Used for new threads when the default model's provider is out of usage.":
    "기본 모델 제공자의 사용량 한도에 도달하면 새 대화에 사용합니다.",
  "Used for thread titles and other generated text on connected devices with this provider. Source control can override it.":
    "이 제공자를 사용하는 연결 기기에서 대화 제목 등의 텍스트를 생성합니다. 소스 관리에서는 별도로 설정할 수 있습니다.",
  "Uses the custom binary path below. Installation keeps that path.":
    "아래에 지정한 실행 파일 경로를 사용합니다. 설치 후에도 해당 경로를 유지합니다.",
  "Using CURSOR_API_KEY. Remove it from this provider's environment to use browser sign-in.":
    "CURSOR_API_KEY를 사용 중입니다. 브라우저로 로그인하려면 이 제공자의 환경 변수에서 키를 제거하세요.",
  Variables: "환경 변수",
  Version: "버전",
  "Version and updates": "버전 및 업데이트",
  "Version pill": "버전 배지",
  "View diagnostics": "진단 보기",
  "View licenses": "라이선스 보기",
  "View policy": "안내 보기",
  "WSL backend": "WSL 백엔드",
  "Wait for the full response": "전체 응답이 완료될 때 표시",
  "Waiting for the server to report installation and authentication details.":
    "서버의 설치 및 인증 정보를 기다리고 있습니다.",
  "We do not recommend managing multiple":
    "이 앱에서 여러 계정을 함께 관리하는 것은 권장하지 않습니다:",
  When: "적용 조건",
  "When expression": "조건식",
  "When to compact an idle Claude thread over 200,000 tokens: after you return, just before its prompt cache expires, or never. Each Claude provider can override this.":
    "20만 토큰을 넘긴 대기 중 Claude 대화를 언제 압축할지 선택합니다. 돌아온 후, 프롬프트 캐시 만료 직전 또는 사용 안 함으로 설정할 수 있으며, 각 Claude 제공자에서 따로 바꿀 수 있습니다.",
  "Where new threads in this project start.": "이 프로젝트의 새 대화가 시작되는 위치입니다.",
  "Where new threads start. Projects and their liverary.json can override it.":
    "새 대화가 시작되는 위치입니다. 프로젝트 설정과 liverary.json에서 바꿀 수 있습니다.",
  Wide: "넓게",
  Word: "문구",
  "Word (default)": "문구 (기본)",
  "Word wrap": "자동 줄바꿈",
  "Working section": "진행 중 영역",
  Workspace: "작업 공간",
  "Worktree branch naming": "워크트리 브랜치 이름",
  "Worktree cleanup": "워크트리 정리",
  "Worktree location": "워크트리 위치",
  "Worktree submodules": "워크트리 서브모듈",
  Worktrees: "워크트리",
  "Wrap code, diffs, and file previews by default": "코드·변경 내역·파일 미리 보기 자동 줄바꿈",
  "Wrap long lines in code blocks, diffs, and file previews by default.":
    "코드 블록, 변경 내역 및 파일 미리 보기의 긴 줄을 기본적으로 줄바꿈합니다.",
  "You can bring it back anytime by importing its JSON file.":
    "JSON 파일을 가져오면 언제든 다시 추가할 수 있습니다.",
  "accounts in T3 Code.": "계정",
  "add project base directory": "프로젝트 추가 시작 폴더",
  "agent credit removal": "에이전트 작성 표시 제거",
  and: "그리고",
  "archive confirmation": "보관 확인",
  "auto-settle": "자동 정리",
  "auto-settle on merge": "병합 시 자동 정리",
  "chat width": "대화 너비",
  "compact idle threads": "대기 중 대화 압축",
  "composer context": "입력창 작업 정보",
  "continue threads after restarts": "재시작 후 대화 재개",
  contrast: "대비",
  custom: "사용자 지정",
  default: "기본값",
  "default automatic pull": "기본 자동 가져오기",
  "default diff file state": "변경 파일 기본 펼침 상태",
  "default merge method": "기본 병합 방식",
  "default model": "기본 모델",
  "default permissions": "기본 권한",
  "default workspace": "기본 작업 공간",
  "delete confirmation": "삭제 확인",
  "diff colors": "변경 내역 색상",
  "diff layout": "변경 내역 배치",
  "diff whitespace changes": "공백 변경",
  "e.g. Work": "예: 업무용",
  "e.g. dsh": "예: dsh",
  "effort display": "추론 강도 표시",
  "environment identification": "실행 환경 구분 표시",
  "fallback model": "대체 모델",
  "follow-up behavior": "추가 메시지 처리",
  "font smoothing": "글꼴 다듬기",
  "glass opacity": "배경 불투명도",
  "in your browser.": "브라우저에 입력하세요.",
  "math rendering": "수식 표시",
  model: "모델",
  "new keybinding": "새 단축키",
  or: "또는",
  "or, update manually using": "또는 다음 명령으로 직접 업데이트하세요",
  override: "개별 설정",
  "panel animations": "패널 애니메이션",
  "proactive panels": "관련 패널 자동 열기",
  "project grouping": "프로젝트 묶기",
  "project order": "프로젝트 정렬",
  "provider health check interval": "AI 제공자 상태 확인 간격",
  "provider update checks": "AI 제공자 업데이트 확인",
  "quit shortcut behavior": "종료 단축키 동작",
  "response streaming": "응답 표시 방식",
  "rich text composer": "서식 있는 입력창",
  seconds: "초",
  "send shortcut": "전송 단축키",
  "skills in slash menu": "슬래시 메뉴의 스킬",
  "t3 command": "Liverary CLI",
  "text generation model": "텍스트 생성 모델",
  "time format": "시간 형식",
  "unpin confirmation": "고정 해제 확인",
  value: "값",
  "word wrapping": "자동 줄바꿈",
  "working section": "진행 중 영역",
  "worktree submodules": "워크트리 서브모듈",
  "the selected environment": "선택한 환경",
  "the primary environment": "기본 환경",
  "Reset all": "모두 초기화",
  Updating: "업데이트 중",
  "Clear all conditions": "모든 조건 지우기",
  "Remove condition": "조건 삭제",
  "Remove group and its conditions": "그룹 및 조건 삭제",
  "Use variables with !, &&, ||, and parentheses.": "변수와 !, &&, ||, 괄호를 사용하세요.",
  Navigation: "탐색",
  Terminal: "터미널",
  "Preview & diff": "미리보기 및 변경 사항",
  "Project scripts": "프로젝트 스크립트",
  Other: "기타",
  "Korean default": "한국어 기본값",
  "Korean default follows the Korean time format and your device time zone.":
    "한국어 기본 시간 형식을 사용합니다. 시간대는 기기 설정을 따릅니다.",
  "Queue follow-ups while the agent runs or steer the current run.":
    "에이전트 실행 중 후속 메시지를 대기열에 넣거나 현재 실행에 반영합니다.",
  "Installed.": "설치되었습니다.",
  Favorites: "즐겨찾기",
  "Browser viewport": "브라우저 화면 크기",
  "Browser zoom": "브라우저 확대 비율",
  "Browser appearance": "브라우저 화면 모드",
  "Recording frame rate": "녹화 프레임 속도",
  "Recording key presses": "녹화 시 키 입력 표시",
  "Recording mouse presses": "녹화 시 마우스 클릭 표시",
  "Floating preview": "플로팅 미리보기",
  "Failed to import action.": "작업을 가져오지 못했습니다.",
  "Commands that run in this project's checkout or its worktree, with optional shortcuts.":
    "이 프로젝트의 체크아웃 또는 워크트리에서 실행할 명령입니다. 단축키도 지정할 수 있습니다.",
  "Import scripts": "스크립트 가져오기",
  "Import from project configuration": "프로젝트 설정 파일에서 가져오기",
  "Project configuration file": "프로젝트 설정 파일",
  "Add actions declared by this checkout without editing them first.":
    "이 체크아웃에 정의된 작업을 바로 추가합니다.",
  "Add action": "작업 추가",
  "Different actions across environments": "환경마다 작업 목록이 다릅니다",
  "Choose one environment to edit its list. Adding an action here adds it on every selected environment.":
    "목록을 편집하려면 환경 하나를 선택하세요. 여기서 작업을 추가하면 선택한 모든 환경에 추가됩니다.",
  "Project configuration file is invalid": "프로젝트 설정 파일이 올바르지 않습니다",
  "Could not read project configuration file": "프로젝트 설정 파일을 읽지 못했습니다",
  "The project configuration file could not be parsed, so its actions and icon are ignored. Check the JSON syntax and icon values.":
    "프로젝트 설정 파일을 해석할 수 없어 정의된 작업과 아이콘을 무시합니다. JSON 문법과 아이콘 값을 확인하세요.",
  "No actions configured.": "등록된 작업이 없습니다.",
  setup: "초기 설정",
  "on settle": "대화 정리 시",
  "preview · desktop only": "미리보기 · 데스크톱 전용",
  "Could not load linked environments": "연결된 환경을 불러오지 못했습니다",
  "Loading linked environments…": "연결된 환경을 불러오는 중…",
  "No linked environments": "연결된 환경이 없습니다",
  "Link another machine running T3 Code, such as a VPS, so agents here can launch and drive threads there.":
    "VPS 등 이 앱을 실행하는 다른 컴퓨터를 연결하면, 여기의 에이전트가 상대 환경에서 대화를 시작하고 작업을 진행할 수 있습니다.",
  "Could not forget the link": "환경 연결을 삭제하지 못했습니다",
  "Expired. Link it again with a new pairing code.":
    "연결이 만료되었습니다. 새 페어링 코드로 다시 연결하세요.",
  "Not answering right now.": "현재 응답이 없습니다.",
  Reachable: "연결 가능",
  "Forgetting…": "연결 삭제 중…",
  Forget: "연결 삭제",
  "Could not link the environment": "환경을 연결하지 못했습니다",
  Link: "연결",
  "Linking…": "연결 중…",
  "Link an environment": "환경 연결",
  "Agents here can then launch, message and wait on threads there. It appears in that environment's Connections, where it can be revoked.":
    "여기의 에이전트가 상대 환경에서 대화를 시작하고, 메시지를 보내고, 작업이 끝날 때까지 기다릴 수 있습니다. 상대 환경의 연결 설정에서 이 연결의 권한을 해제할 수 있습니다.",
  "Already linked. Linking again renews it with the access you pick.":
    "이미 연결된 환경입니다. 다시 연결하면 선택한 접근 권한으로 갱신됩니다.",
  Address: "주소",
  "Pairing code": "페어링 코드",
  "From that environment's Connections, or t3 pair there":
    "상대 환경의 연결 설정 또는 liverary pair에서 발급받은 코드",
  "Paste the code": "코드를 붙여 넣으세요",
  "Add a project from the sidebar to configure it here.":
    "사이드바에서 프로젝트를 추가하면 여기서 설정할 수 있습니다.",
  "This project is no longer available.": "이 프로젝트를 더 이상 사용할 수 없습니다.",
  "This checkout is no longer available in the selected project and environment.":
    "선택한 프로젝트와 환경에서 이 체크아웃을 더 이상 사용할 수 없습니다.",
  "Project title cannot be empty": "프로젝트 이름을 입력하세요",
  "Failed to rename project": "프로젝트 이름을 변경하지 못했습니다",
  "Failed to update project icon": "프로젝트 아이콘을 변경하지 못했습니다",
  "Failed to remove project": "프로젝트를 삭제하지 못했습니다",
  Checkouts: "체크아웃",
  "Can't find a setting? Keep this project picked above and hop to any other settings page.":
    "원하는 설정이 없나요? 위에서 이 프로젝트를 선택한 채 다른 설정 페이지로 이동하세요.",
  "Shared settings require permission to change every checkout in this group.":
    "공유 설정을 변경하려면 이 그룹의 모든 체크아웃에 대한 변경 권한이 필요합니다.",
  "This connection cannot change this project.": "이 연결에는 프로젝트를 변경할 권한이 없습니다.",
  Name: "이름",
  "The shared name for this project group in the sidebar and thread lists.":
    "사이드바와 대화 목록에서 이 프로젝트 그룹에 공통으로 표시할 이름입니다.",
  "project name": "프로젝트 이름",
  "Project name": "프로젝트 이름",
  "Project icon": "프로젝트 아이콘",
  "project icon": "프로젝트 아이콘",
  "Choose a project icon": "프로젝트 아이콘 선택",
  "Choose icon": "아이콘 선택",
  "Choose a project icon file": "프로젝트 아이콘 파일 선택",
  "Choose file": "파일 선택",
  Pin: "고정",
  "Pinned projects come first in project pickers.":
    "고정한 프로젝트는 프로젝트 선택 목록의 맨 위에 표시됩니다.",
  "Failed to pin project": "프로젝트를 고정하지 못했습니다",
  "Failed to unpin project": "프로젝트 고정을 해제하지 못했습니다",
  "Pin project": "프로젝트 고정",
  "Project archive": "프로젝트 보관",
  "Archive project": "보관",
  "Unarchive project": "보관 해제",
  "Hidden from project pickers. Threads and files are kept.":
    "프로젝트 선택 목록에서 숨겨져 있습니다. 대화와 파일은 유지됩니다.",
  "Hides the project from project pickers. Threads and files are kept.":
    "프로젝트 선택 목록에서 숨깁니다. 대화와 파일은 유지됩니다.",
  "Failed to unarchive project": "프로젝트 보관을 해제하지 못했습니다",
  "Failed to archive project": "프로젝트를 보관하지 못했습니다",
  Danger: "위험 작업",
  "Remove checkout": "체크아웃 삭제",
  "Remove this project everywhere": "모든 환경에서 프로젝트 삭제",
  "Remove project": "프로젝트 삭제",
  "Deletes the selected machine's checkout entries and their threads. Other machines and files on disk are not touched.":
    "선택한 컴퓨터의 체크아웃 항목과 대화를 삭제합니다. 다른 컴퓨터와 디스크의 파일은 유지됩니다.",
  "Deletes the project entry and its threads. Files on disk are not touched.":
    "프로젝트 항목과 대화를 삭제합니다. 디스크의 파일은 유지됩니다.",
  "Remove all entries": "모든 항목 삭제",
  "Failed to update network exposure.": "네트워크 공개 설정을 변경하지 못했습니다.",
  "Could not update network access": "네트워크 접근 설정을 변경하지 못했습니다",
  "Failed to configure Tailscale HTTPS.": "Tailscale HTTPS를 설정하지 못했습니다.",
  "Could not set up Tailscale HTTPS": "Tailscale HTTPS를 설정하지 못했습니다",
  "Failed to disable Tailscale HTTPS.": "Tailscale HTTPS를 끄지 못했습니다.",
  "Could not disable Tailscale HTTPS": "Tailscale HTTPS를 끄지 못했습니다",
  "Failed to revoke pairing link.": "페어링 링크를 해제하지 못했습니다.",
  "Could not revoke pairing link": "페어링 링크를 해제하지 못했습니다",
  "Failed to revoke client access.": "클라이언트 접근 권한을 해제하지 못했습니다.",
  "Could not revoke client access": "클라이언트 접근 권한을 해제하지 못했습니다",
  "Other paired clients will need a new pairing link before reconnecting.":
    "다른 클라이언트가 다시 연결하려면 새 페어링 링크가 필요합니다.",
  "Failed to revoke other clients.": "다른 클라이언트의 접근 권한을 해제하지 못했습니다.",
  "Could not revoke other clients": "다른 클라이언트의 접근 권한을 해제하지 못했습니다",
  "Failed to remove backend.": "백엔드를 삭제하지 못했습니다.",
  "Could not remove backend": "백엔드를 삭제하지 못했습니다",
  "Enable network access": "네트워크 접근 허용",
  "Failed to update WSL backend.": "WSL 백엔드를 변경하지 못했습니다.",
  "Could not change WSL backend": "WSL 백엔드를 변경하지 못했습니다",
  "Couldn't load the WSL backend state.": "WSL 백엔드 상태를 불러오지 못했습니다.",
  "Retrying…": "다시 시도 중…",
  Retry: "다시 시도",
  "WSL is unavailable, so Windows is running instead. Turn WSL off to clear this preference.":
    "WSL을 사용할 수 없어 Windows 백엔드로 실행 중입니다. WSL을 끄면 저장된 선택이 해제됩니다.",
  "Switch to Windows": "Windows로 전환",
  "Default distro": "기본 배포판",
  "Run the selected WSL distro alongside Windows. Projects remain on their current filesystem.":
    "선택한 WSL 배포판을 Windows 백엔드와 함께 실행합니다. 프로젝트는 현재 파일 시스템에 유지됩니다.",
  " (default)": " (기본값)",
  "WSL only": "WSL만 사용",
  "Run only the WSL backend. T3 Code restarts when this changes.":
    "WSL 백엔드만 실행합니다. 변경하면 앱이 다시 시작됩니다.",
  "Run WSL only": "WSL만 실행",
  "Use Tailscale Serve to expose this backend through a MagicDNS HTTPS URL.":
    "Tailscale Serve로 이 백엔드를 MagicDNS HTTPS 주소에 공개합니다.",
  "Enable Tailscale HTTPS": "Tailscale HTTPS 사용",
  "Exposed on all interfaces.": "모든 네트워크 인터페이스에서 접속할 수 있습니다.",
  "Limited to this machine.": "이 컴퓨터에서만 접속할 수 있습니다.",
  "Loading…": "불러오는 중…",
  "This connection cannot view or change network exposure.":
    "이 연결에는 네트워크 공개 설정을 보거나 변경할 권한이 없습니다.",
  "Remote access is already configured. Change network exposure where the server starts.":
    "원격 접근이 이미 설정되어 있습니다. 서버를 실행하는 곳에서 네트워크 공개 설정을 변경하세요.",
  "Only this machine can connect. Restart with a non-loopback host for remote pairing.":
    "이 컴퓨터에서만 연결할 수 있습니다. 원격 페어링을 사용하려면 루프백 이외의 호스트 주소로 서버를 다시 실행하세요.",
  "Network exposure information is unavailable.": "네트워크 공개 정보를 확인할 수 없습니다.",
  "Network exposure changes restart the backend and must be controlled where the server process is launched.":
    "네트워크 공개 설정을 바꾸면 백엔드가 다시 시작됩니다. 서버 프로세스를 실행하는 곳에서 변경해야 합니다.",
  "Primary environment": "기본 환경",
  "More actions for this machine": "이 컴퓨터의 추가 작업",
  "Retry update": "업데이트 다시 시도",
  "Authorized clients": "접근이 허용된 클라이언트",
  "This connection can create access links but cannot view authorized clients.":
    "이 연결에서는 접근 링크를 만들 수 있지만, 접근이 허용된 클라이언트 목록은 볼 수 없습니다.",
  "Enable network access?": "네트워크 접근을 허용할까요?",
  "Disable network access?": "네트워크 접근을 차단할까요?",
  "Let your other devices connect to T3 Code over the network. Pair devices to give them access. T3 Code will restart.":
    "다른 기기에서 네트워크를 통해 이 앱에 연결할 수 있도록 허용합니다. 기기를 페어링해야 접근할 수 있습니다. 앱이 다시 시작됩니다.",
  "Devices connected over your local network will disconnect. Existing tunnels, such as Tailscale HTTPS, keep working. Liverary will restart.":
    "로컬 네트워크로 연결된 기기의 연결이 끊깁니다. 별도로 설정한 터널 연결은 계속 동작합니다. 앱이 다시 시작됩니다.",
  "Restart and enable": "다시 시작하고 켜기",
  "Restart and disable": "다시 시작하고 끄기",
  "Turn off WSL and switch back to Windows?": "WSL을 끄고 Windows로 돌아갈까요?",
  "Disable WSL backend?": "WSL 백엔드를 끌까요?",
  "Switch WSL distro?": "WSL 배포판을 바꿀까요?",
  "Start the WSL backend": "WSL 백엔드 시작",
  "Run only the WSL backend?": "WSL 백엔드만 실행할까요?",
  "Re-enable the Windows backend?": "Windows 백엔드를 다시 켤까요?",
  "T3 Code will restart on the Windows backend. Threads and projects opened against WSL stay safe inside the distro and become available again when you re-enable WSL.":
    "앱이 Windows 백엔드로 다시 시작됩니다. WSL의 대화와 프로젝트는 배포판에 보관되며, WSL을 다시 켜면 사용할 수 있습니다.",
  "The WSL backend will stop. Threads and projects opened against WSL stay safe inside the distro, but they'll be unavailable in T3 Code until you re-enable WSL.":
    "WSL 백엔드가 중지됩니다. WSL의 대화와 프로젝트는 배포판에 보관되지만, WSL을 다시 켜기 전까지 앱에서 사용할 수 없습니다.",
  "T3 Code will restart the WSL backend on the new distro. Sessions still running on the current distro will be interrupted.":
    "새 배포판에서 WSL 백엔드를 다시 시작합니다. 현재 배포판에서 실행 중인 세션은 중단됩니다.",
  "Run the WSL backend alongside the Windows one, or stop the Windows backend and use only WSL? You can change this later from Settings.":
    "Windows와 WSL 백엔드를 함께 실행할까요, 아니면 Windows 백엔드를 중지하고 WSL만 사용할까요? 나중에 설정에서 변경할 수 있습니다.",
  "T3 Code will restart and start only the WSL backend. Your Windows-side projects won't be accessible until you turn this off again.":
    "앱이 다시 시작되고 WSL 백엔드만 실행됩니다. 이 설정을 끄기 전까지 Windows 쪽 프로젝트에 접근할 수 없습니다.",
  "T3 Code will restart and bring the Windows backend back up alongside WSL.":
    "앱이 다시 시작되고 Windows와 WSL 백엔드를 함께 실행합니다.",
  "Applying…": "적용 중…",
  "Use only WSL": "WSL만 사용",
  "Run both backends": "Windows와 WSL 함께 실행",
  "Disable WSL": "WSL 끄기",
  "Switch distro": "배포판 전환",
  "Disable Tailscale HTTPS?": "Tailscale HTTPS를 끌까요?",
  "T3 Code will restart the local backend without Tailscale Serve.":
    "Tailscale Serve를 끈 상태로 로컬 백엔드를 다시 시작합니다.",
  "Set up Tailscale HTTPS?": "Tailscale HTTPS를 설정할까요?",
  "T3 Code will restart the local backend with Tailscale Serve enabled and ask Tailscale to proxy HTTPS traffic to this backend.":
    "Tailscale Serve를 켠 상태로 로컬 백엔드를 다시 시작하고, Tailscale을 통해 HTTPS 요청을 이 백엔드로 전달합니다.",
  "HTTPS port": "HTTPS 포트",
  "Enter a port from 1 to 65535.": "1~65535 사이의 포트 번호를 입력하세요.",
  "HTTPS endpoint": "HTTPS 접속 주소",
  "Pending MagicDNS endpoint": "MagicDNS 접속 주소 준비 중",
  Enable: "켜기",
  "No environment selected": "선택한 환경이 없습니다",
  "Connect an environment to view its settings and access.":
    "환경을 연결하면 설정과 접근 권한을 확인할 수 있습니다.",
  "This app": "이 앱",
  Server: "서버",
  "Mobile clients": "모바일 기기",
  "No mobile clients": "연결된 모바일 기기 없음",
  "Mobile devices that get notifications from your environments.":
    "실행 환경의 알림을 받는 모바일 기기입니다.",
  "Push notifications": "푸시 알림",
  "Live Activities": "실시간 현황",
  "Loading mobile clients": "모바일 기기 불러오는 중",
  "Could not load mobile clients": "모바일 기기를 불러오지 못했습니다",
  "Push notifications are disabled on this device.": "이 기기에서는 푸시 알림이 꺼져 있습니다.",
  "Push notifications are enabled, but no alert types are selected.":
    "푸시 알림은 켜져 있지만 알림 종류를 선택하지 않았습니다.",
  "Update time unavailable": "업데이트 시간을 확인할 수 없습니다",
  "Approval requests": "승인 요청",
  "Input requests": "입력 요청",
  Completions: "완료",
  Failures: "실패",
  Refresh: "새로고침",
} as const;

const themeModeLabel = (mode: "light" | "dark") => (mode === "light" ? "라이트" : "다크");

export const settingsMessages = {
  speechUsingModelFile: (path: string) => `내 모델 파일 사용 중: ${path}`,
  speechUnlinkModel: (name: string) => `${name} 연결 해제`,
  speechCloudGroup: (environment: string) => `${environment}을(를) 통한 클라우드`,

  generatorModelsTitle: (name: string) => `${name} 모델`,

  unarchive: (title: string) => `${title} 보관 해제`,

  speechLanguageCount: (count: number) => `${count}개 언어`,
  speechDownloadProgress: (name: string) => `${name} 다운로드 진행률`,
  speechDownloaded: (percent: number) => `${percent}% 다운로드됨`,
  speechCancelDownload: (name: string) => `${name} 다운로드 취소`,
  speechDeleteModel: (name: string) => `${name} 삭제`,
  speechAddWord: (label: string) => `${label}에 단어나 문구 추가`,
  speechDictionaryEntries: (label: string) => `${label} 항목`,
  speechAliasFor: (term: string) => `${term}의 별칭`,
  speechAddAlias: (term: string) => `${term}의 별칭 추가`,
  speechRemoveWord: (term: string) => `${term} 제거`,
  speechProjectDictionary: (label: string) =>
    `${label}의 환경에 저장합니다. 이 프로젝트에서 받아쓰는 모든 사용자가 개인 사전과 함께 이 표기를 사용합니다. 겹치는 경우 프로젝트 표기가 우선합니다.`,
  speechBestAccuracy: (language: string) => `${language} 정확도순`,
  speechModelsFor: (languages: string) => `${languages} 지원 모델`,
  speechModelSort: (sort: string, downloaded: boolean) =>
    `모델 정렬 및 필터: ${sort}${downloaded ? ", 다운로드한 모델만" : ""}`,
  speechCloudVia: (provider: string, environment: string) =>
    `${environment}을(를) 통한 ${provider}`,
  speechModelLanguage: (model: string, detects: boolean) =>
    `${model}: ${detects ? "언어를 자동으로 감지합니다" : "고정된 하나의 언어를 사용합니다"}.`,
  speechUnsupportedEnvironment: (label: string) =>
    `${label}에서는 로컬 음성 인식을 사용할 수 없습니다. 다른 대상을 선택하세요.`,
  speechLanguageUnavailable: (language: string) => `${language} 사용 불가`,
  speechLanguageAuto: (language: string) => `자동(${language})`,
  cloudApiKey: (company: string) => `${company} API 키`,
  cloudApiKeyReference: (company: string) => `${company} API 키 참조`,
  cloudSpeechKeyBilling: (environment: string) =>
    `${environment}에 받아쓰기 접근 권한이 있는 사용자는 누구나 이 키로 요금을 발생시킬 수 있습니다.`,
  cloudRemoveKey: (company: string) => `${company} 키를 제거할까요?`,
  cloudManageKey: (company: string) => `${company} 키 관리`,
  cloudUseDictation: (name: string) => `${name}을(를) 받아쓰기에 사용할까요?`,
  cloudRemoveAccess: (name: string, environment: string) =>
    `${environment}에서 ${name} 받아쓰기를 사용하는 모든 사용자의 접근 권한이 사라집니다.`,
  cloudKeyAccess: (environment: string) =>
    `${environment}에 받아쓰기 접근 권한이 있는 사용자는 누구나 이 API 키를 사용할 수 있습니다.`,
  cloudModelDelisted: (model: string) =>
    `OpenRouter에서 더 이상 ${model}을(를) 제공하지 않습니다. 다른 모델을 선택할 때까지 받아쓰기가 꺼집니다.`,
  cloudConnectForDictation: (environment: string) =>
    `계속하려면 받아쓰기 접근 권한으로 ${environment}에 연결하세요.`,
  cloudUpdateForDictation: (environment: string) =>
    `OpenRouter 받아쓰기를 사용하려면 ${environment}을(를) 업데이트하세요.`,
  cloudAskAdministrator: (environment: string) =>
    `${environment} 관리자에게 API 키 추가를 요청하세요.`,
  cloudUseSavedKey: (environment: string) =>
    `${environment}에 저장된 API 키를 사용합니다. 이 선택은 이 기기에만 적용됩니다.`,
  cloudUseProvider: (name: string) => `${name} 사용`,
  cloudSpeechDisclosure: (provider: CloudSpeechProvider, environment: string) =>
    provider === "openrouter"
      ? `녹음을 중지하면 ${environment}에서 OpenRouter로 녹음을 전송합니다. OpenRouter가 모델 실행 제공자를 선택합니다. Liverary는 데이터 보관 안 함을 요청하지만 OpenRouter 계정에서 안전 목적의 보관을 허용할 수 있습니다.`
      : `녹음을 중지하면 ${environment}에서 ${CLOUD_SPEECH_PROVIDER_NAMES[provider]}로 녹음과 프로젝트 이름을 포함한 단어 힌트를 전송합니다.`,
  generatorActions: (name: string) => `${name} 추가 작업`,
  generatorEnable: (name: string) => `${name} 활성화`,
  generatorEdit: (name: string) => `${name} 편집`,
  generatorModelsFailed: (name: string) => `${name} 모델을 불러오지 못했습니다`,
  generatorModelCount: (count: number) =>
    `모델 ${count}개를 사용할 수 있습니다. 텍스트 생성 모델 선택기에서 선택하세요.`,
  generatorRemove: (name: string) => `${name}을(를) 제거할까요?`,
  generatorRemoveDescription: (environment: string) =>
    `${environment}에 저장된 API 키를 삭제합니다. 이 생성기를 사용하던 설정은 기본 텍스트 생성 모델을 따릅니다.`,
  generatorConnected: (name: string, count: number) =>
    `${name}에 연결되었으며 모델 ${count}개가 있습니다. 아래 설정에 적용하거나 현재 선택을 유지하세요.`,
  generatorTestSuccess: (model: string) => `${model}이(가) 응답했습니다. 정상적으로 작동합니다.`,
  deviceAvailability: (title: string, label: string, available: boolean) =>
    `${title}: ${label} ${available ? "사용 가능" : "사용 불가"}`,

  databaseSpaceOn: (amount: string, label: string) => `${label}에서 ${amount}`,
  databaseReclaiming: (amount: string, label: string) => `${label}에서 ${amount} 회수 중`,
  databaseReclaimRestart: (minutes: number) =>
    `해당 환경의 Liverary가 다시 시작되며 약 ${minutes}분 후 돌아옵니다.`,
  databaseReclaimFailed: (label: string) => `${label}의 공간을 회수하지 못했습니다`,
  databaseReclaimOffline: (minutes: number) =>
    `해당 환경의 Liverary를 다시 시작합니다. 약 ${minutes}분 동안 오프라인 상태가 됩니다.`,
  databaseLastReclaimFailed: (reason: string) => `지난 시도에 실패했습니다: ${reason}`,
  databaseReclaimConfirm: (amount: string, label: string) => `${label}에서 ${amount}을 회수할까요?`,
  databaseReclaimWarning: (label: string, minutes: number) =>
    `${label}의 Liverary를 중지하고 데이터베이스를 다시 만든 뒤 다시 시작합니다. 약 ${minutes}분 동안 오프라인 상태가 되며 실행 중인 에이전트가 중지됩니다.`,

  secretProviderUnused: (value0: string | number | null | undefined) =>
    `${value0}에서 값을 읽는 항목이 없습니다. 비밀 값 자체는 바뀌지 않습니다.`,
  secretProviderUsesUnset: (value0: string | number | null | undefined) =>
    `다음 항목은 ${value0}에서 값을 읽으며 설정이 해제됩니다. 비밀 값 자체는 바뀌지 않습니다.`,

  cliAddedToPath: (path: string | null, file: string) =>
    `${path}에 설치하고 ${file}에서 PATH에 추가했습니다. 새 터미널을 열어 사용하세요.`,
  cliPathSetupNeeded: (path: string | null, canAdd: boolean) =>
    `${path}에 설치했지만 아직 PATH에 없습니다.${canAdd ? "" : " liverary 명령을 실행하려면 해당 폴더를 PATH에 추가하세요."}`,
  deviceListIncomplete: (platform: string) =>
    `${platform === "Device" ? "기기" : platform} 목록이 완전하지 않을 수 있습니다.`,
  databaseReclaimDescription: (allReclaimable: boolean) =>
    `기록 정리로 확보한 공간이 아직 데이터베이스에 남아 있습니다.${allReclaimable ? "" : " 각 컴퓨터에서 명령을 실행해 공간을 회수하세요. 백그라운드 서비스가 다시 시작됩니다. 데스크톱 앱이 환경을 호스팅한다면 먼저 종료하세요."}`,

  seconds: (value: string | number) => `${value}초`,
  sessionCount: (count: number) => `세션 ${count}개`,
  deviceCount: (count: number) => `기기 ${count}개`,
  clientCount: (count: number) => `클라이언트 ${count}개`,
  pairingLinkCount: (count: number) => `페어링 링크 ${count}개`,
  retainedProcesses: (retained: number, scanned: number) => `${scanned}개 중 ${retained}개 보관`,
  thermalStateDescription: (state: string): string =>
    `${settingsMessages.thermalState(state)} 발열 상태`,
  themeColorUsageCount: (label: string, count: number) => `${label} · 사용 위치 ${count}곳`,
  observedCpuTime: (value0: string | number | null | undefined) => `측정된 CPU 사용 시간 ${value0}`,
  combinedProcessPeaks: (value0: string | number | null | undefined) =>
    `프로세스 최대 사용량 합계 ${value0}`,
  processStartExitCounts: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `시작 ${value0}회 · 종료 ${value1}회`,
  observedResource: (value0: string | number | null | undefined) => `측정값 ${value0}`,
  pairingLinkCreatedAt: (value0: string | number | null | undefined) => `링크 생성: ${value0}`,
  joinedDomains: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0} 및 ${value1}`,
  moreDomains: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0} 외 ${value1}개`,
  updateVersionDownloaded: (value0: string | number | null | undefined) =>
    `${value0} 업데이트 다운로드 완료`,
  updateVersionAvailable: (value0: string | number | null | undefined) =>
    `${value0} 업데이트 사용 가능`,
  modelOptionLabelRequired: (value0: string | number | null | undefined) =>
    `${value0}에 이름이 필요합니다.`,
  failedEnvironmentCount: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `환경 ${value1}개 중 ${value0}개 실패`,
  confirmRemoveRoute: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `“${value0}” 접속 경로를 삭제할까요?${value1}`,
  viaRoute: (value0: string | number | null | undefined) => `접속 경로: ${value0}`,
  reconnectingDetails: (value0: string | number | null | undefined) => `다시 연결 중: ${value0}`,
  connectionFix: (value0: string | number | null | undefined) => `해결 방법: ${value0}`,
  everyMinutes: (value0: string | number | null | undefined) => `${value0}분마다`,
  everySeconds: (value0: string | number | null | undefined) => `${value0}초마다`,
  scheduledAt: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0} ${value1} (실행 환경 시간)`,
  scheduledDeviceTime: (timestamp: string) => `${timestamp} (이 기기 시간)`,
  scheduledTaskStatus: (status: ScheduledTask["lastRunStatus"]) =>
    ({
      never: "요청 이력 없음",
      running: "전송 중",
      succeeded: "요청 전달됨",
      failed: "전송 실패",
    })[status],
  emptyPlaceholders: (count: number) => `비어 있는 자리표시자 ${count}개`,
  minutesFromNow: (value0: string | number | null | undefined) => `${value0}분 후`,
  hoursFromNow: (value0: string | number | null | undefined) => `${value0}시간 후`,
  daysFromNow: (value0: string | number | null | undefined) => `${value0}일 후`,
  addThemePalette: (appearance: "light" | "dark") => `${themeModeLabel(appearance)} 팔레트 추가`,
  byteCount: (value0: string | number | null | undefined) => `${value0}바이트`,
  resourceSourceStatus: (status: string) =>
    ({
      starting: "시작 중",
      healthy: "정상",
      degraded: "성능 저하",
      unavailable: "사용 불가",
      stopped: "중지됨",
    })[status as "starting" | "healthy" | "degraded" | "unavailable" | "stopped"] ?? status,
  quitBrowserToImport: (browser: string) => `가져오려면 ${browser} 종료`,
  allowBrowserCookieAccess: (browser: string) => `${browser} 쿠키 접근 허용`,
  browserCookieAccessDescription: (browser: string) =>
    `${browser}의 쿠키를 가져오려면 Liverary에 전체 디스크 접근 권한이 필요합니다. 시스템 설정에서 허용한 뒤 돌아와 가져오기를 완료하세요. 완료 후에는 권한을 다시 해제해도 됩니다.`,
  importFromBrowser: (browser: string) => `${browser}에서 가져오기`,
  chooseCookiesForEnvironment: (environment: string) =>
    `${environment}에 가져올 쿠키를 선택하세요.`,
  browserImportBlocked: (browser: string) => `${browser}에서 가져오지 못했습니다`,
  cookieCount: (count: number) => `쿠키 ${count.toLocaleString()}개`,
  cookieImportCompleted: (profile: string, environment: string, skipped: number) =>
    `${environment}의 ${profile}에 추가했습니다.${skipped > 0 ? ` 쿠키 ${skipped.toLocaleString()}개는 건너뛰었습니다.` : ""}`,
  confirmRemoveBrowserProfile: (name: string | undefined) => `“${name}” 프로필을 삭제할까요?`,
  confirmClearBrowserProfile: (name: string | undefined) => `“${name}” 쿠키와 캐시를 지울까요?`,
  reconnectToChangeSettings: (environment: string) =>
    `설정을 바꾸려면 ${environment}에 다시 연결하세요.`,
  optionNumber: (index: number) => `옵션 ${index}`,
  thermalState: (state: string) =>
    ({ unknown: "알 수 없음", nominal: "정상", fair: "보통", serious: "높음", critical: "위험" })[
      state as "unknown" | "nominal" | "fair" | "serious" | "critical"
    ] ?? state,
  confirmDeleteAcpSession: (value0: string | number | null | undefined) =>
    `네이티브 ACP 세션 “${value0}”을(를) 영구 삭제할까요?`,
  confirmDisableAcpProvider: (value0: string | number | null | undefined) =>
    `ACP 제공자 “${value0}”을(를) 끌까요?`,
  connectedFor: (value0: string | number | null | undefined) => `${value0} 동안 연결됨`,
  lastConnectedAt: (value0: string | number | null | undefined) => `마지막 연결: ${value0}`,
  advancedBackgroundPolicy: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0} 공통 정책: ${value1}.`,
  retryingInSeconds: (value0: string | number | null | undefined) => `${value0}초 후 재시도`,
  downloadingVersion: (value0: string | number | null | undefined) =>
    `${value0} 업데이트 다운로드 중`,
  modelOptionIdRequired: (value0: string | number | null | undefined) =>
    `${value0}에 ID가 필요합니다.`,
  duplicateModelOptionId: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0}: ID “${value1}”이(가) 중복됩니다.`,
  modelOptionChoiceRequired: (value0: string | number | null | undefined) =>
    `${value0}에 선택지가 하나 이상 필요합니다.`,
  modelOptionChoiceValueRequired: (value0: string | number | null | undefined) =>
    `${value0}에 값이 없는 선택지가 있습니다.`,
  duplicateModelOptionChoice: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0}: 선택지 “${value1}”이(가) 중복됩니다.`,
  confirmKillProcess: (value0: string | number | null | undefined) =>
    `프로세스 ${value0}에 SIGKILL을 보낼까요? 프로세스가 종료를 처리할 수 없습니다.`,
  easHostLimits: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
    value2: string | number | null | undefined,
  ) => `동시에 최대 ${value0}, ${value1}분이 지나거나 ${value2}분 동안 유휴 상태이면 종료`,
  cookieImportFailed: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0}에서 쿠키를 가져오지 못했습니다: ${value1}.`,
  sendProcessSignalFailed: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `프로세스 ${value1}에 ${value0} 신호를 보내지 못했습니다.`,
  connectionFailedDetails: (value0: string | number | null | undefined) => `연결 실패: ${value0}`,
  environmentUpdateAvailable: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `\n업데이트 가능: ${value0} → ${value1}`,
  connectToSaveSetting: (value0: string | number | null | undefined) =>
    `이 설정을 저장하려면 ${value0}에 연결하세요.`,
  simlockHostLimits: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `동시에 최대 ${value0}, ${value1}분 후 각각 반환`,
  setUpDesktopCapture: (value0: string | number | null | undefined) => `${value0} 캡처 설정`,
  shortcutAlreadyUsed: (value0: string | number | null | undefined) =>
    `Liverary에서 이미 “${value0}”에 사용하는 단축키입니다.`,
  themePaletteMissing: (value0: string | number | null | undefined, appearance: "light" | "dark") =>
    `“${value0}”에 ${themeModeLabel(appearance)} 팔레트가 없습니다. 추가하려면 같은 이름의 테마를 만드세요.`,
  themePaletteExists: (value0: string | number | null | undefined, appearance: "light" | "dark") =>
    `“${value0}”에 ${themeModeLabel(appearance)} 팔레트가 이미 있습니다.`,
  themePaletteNameConflict: (
    value0: string | number | null | undefined,
    appearance: "light" | "dark",
  ) =>
    `“${value0}”에 ${themeModeLabel(appearance)} 팔레트가 이미 있습니다. 다른 이름을 선택하세요.`,
  themeAllPalettesExist: (value0: string | number | null | undefined) =>
    `“${value0}”에 라이트와 다크 팔레트가 모두 있습니다. 다른 이름을 선택하세요.`,
  themeFileTooLarge: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) =>
    `파일 크기가 ${value0}입니다. 테마 파일은 보통 수 KB이므로 읽지 않았습니다 (한도 ${value1}).`,
  oversizedThemeFile: (value0: string | number | null | undefined) => `${value0}: 크기 초과`,
  tooManyThemeCopies: (value0: string | number | null | undefined) =>
    `“${value0}” 복사본이 너무 많습니다.`,
  modelUnavailableOnEnvironment: (value0: string | number | null | undefined) =>
    `${value0}에서 이 모델을 사용할 수 없습니다. 해당 환경을 선택하여 모델을 개별 설정하세요.`,
  settingSaveFailedOn: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0}에 저장하지 못했습니다: ${value1}`,
  settingSavedOn: (value0: string | number | null | undefined) => `${value0}에 저장했습니다.`,
  compatibleAgentsFound: (value0: string | number | null | undefined) =>
    `호환되는 에이전트 ${value0}개를 찾았습니다.`,
  aboutAgent: (value0: string | number | null | undefined) => `${value0} 정보`,
  providerProtocol: (value0: string | number | null | undefined) => `${value0} 프로토콜`,
  providerBaseUrl: (value0: string | number | null | undefined) => `${value0} 기본 URL`,
  providerHeadersJson: (value0: string | number | null | undefined) =>
    `${value0} 헤더 JSON (저장 후 표시 안 함)`,
  environmentSshRouteAdded: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `이제 ${value0}에 SSH ${value1} 경로로 접속할 수 있습니다.`,
  sshTunnelReady: (value0: string | number | null | undefined) =>
    `SSH 관리 터널로 ${value0}에 접속할 준비가 되었습니다.`,
  environmentRouteAdded: (value0: string | number | null | undefined) =>
    `${value0}에 다른 접속 경로를 추가했습니다.`,
  addEnvironmentRoute: (value0: string | number | null | undefined) => `${value0}의 접속 경로 추가`,
  showClientScopes: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0}: ${value1} 표시`,
  oneEnvironmentProfile: (value0: string | number | null | undefined) => `${value0} (환경 하나)`,
  readBrowserCookies: (value0: string | number | null | undefined) =>
    `가져오기에 사용할 ${value0} 쿠키를 읽습니다.`,
  importedCookies: (value0: string | number | null | undefined) => `${value0} 가져옴`,
  skippedCookies: (value0: string | number | null | undefined) => `${value0} 건너뜀`,
  noCookiesImported: (value0: string | number | null | undefined) =>
    `${value0}에 가져온 쿠키가 없습니다.`,
  noCookiesToImport: (value0: string | number | null | undefined) =>
    `${value0}에 가져올 쿠키가 없습니다.`,
  shortcutFromOtherApp: (value0: string | number | null | undefined) =>
    `다른 앱에서 ${value0} 단축키를 사용하세요.`,
  captureShortcutFromOtherApp: (value0: string | number | null | undefined) =>
    `다른 앱에서 ${value0} 단축키로 창을 캡처하세요.`,
  databaseReclaimable: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value1}에서 ${value0} GiB`,
  connectFromEnvironment: (value0: string | number | null | undefined) =>
    `${value0}에서 연결합니다.`,
  connectFromEnvironments: (value0: string | number | null | undefined) =>
    `선택한 환경 ${value0}개에서 연결합니다.`,
  perMachineResults: (value0: string | number | null | undefined) => `${value0}. 컴퓨터별 결과`,
  cannotChangeEnvironmentSettings: (value0: string | number | null | undefined) =>
    `이 연결에서는 ${value0}의 설정을 바꿀 수 없습니다.`,
  deviceHostChecksFailed: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
    value2: string | number | null | undefined,
  ) => `${value0}: 환경 ${value2}개 중 ${value1}개 실패`,
  deviceHostChecksPassed: (value0: string | number | null | undefined) =>
    `${value0}: 연결 테스트 통과`,
  detailsFor: (value0: string | number | null | undefined) => `${value0} 세부 정보`,
  collapse: (value0: string | number | null | undefined) => `${value0} 접기`,
  expand: (value0: string | number | null | undefined) => `${value0} 펼치기`,
  processLabel: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0} 프로세스 ${value1}`,
  cpuAveragePeak: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `평균 CPU ${value0}%, 최대 CPU ${value1}%`,
  sendSignalFailedDescription: (value0: string | number | null | undefined) =>
    `${value0} 신호를 보내지 못했습니다.`,
  sendSignalFailed: (value0: string | number | null | undefined) =>
    `${value0} 신호를 보내지 못했습니다`,
  slowSpansThreshold: (value0: string | number | null | undefined) =>
    `${value0} 이상 걸린 구간입니다.`,
  traceFilesIncomplete: (value0: string | number | null | undefined) =>
    `일부 추적 파일을 읽지 못해 진단 정보가 불완전할 수 있습니다. ${value0}`,
  signedInWithCredential: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value1}로 ${value0} 계정에 로그인했습니다.`,
  environmentRoutes: (value0: string | number | null | undefined) =>
    `${value0}의 접속 경로, 우선순위순`,
  reorderRoute: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value0} 순서 변경, 현재 ${value1}번째`,
  removeRoute: (value0: string | number | null | undefined) => `${value0} 접속 경로 삭제`,
  rotateViewport: (orientation: "landscape" | "portrait") =>
    `${orientation === "landscape" ? "가로" : "세로"} 방향으로 회전`,
  updateEnvironmentsFailed: (value0: string | number | null | undefined) =>
    `${value0}을(를) 업데이트하지 못했습니다.`,
  clearProfileDataFailed: (value0: string | number | null | undefined) =>
    `${value0} 데이터를 지우지 못했습니다`,
  profileDataCleared: (value0: string | number | null | undefined) =>
    `${value0} 쿠키와 캐시를 지웠습니다`,
  rename: (value0: string | number | null | undefined) => `${value0} 이름 변경`,
  optionsFor: (value0: string | number | null | undefined) => `${value0} 옵션`,
  loadPreference: (value0: string | number | null | undefined) => `${value0} 부하 분산 우선순위`,
  licenseManifestRequestFailed: (value0: string | number | null | undefined) =>
    `라이선스 목록 요청에 실패했습니다. 상태: ${value0}`,
  viewProjectSource: (value0: string | number | null | undefined) => `${value0} 프로젝트 소스 보기`,
  licenseNoticesCount: (value0: string | number | null | undefined) => `고지사항 ${value0}개`,
  filteredCount: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value1}개 중 ${value0}개`,
  openInApp: (value0: string | number | null | undefined) => `${value0}에서 열기`,
  pullRequestRouting: (value0: string | number | null | undefined) =>
    `${value0} Pull Request 라우팅`,
  routeCount: (value0: string | number | null | undefined) => `접속 경로 ${value0}개`,
  moreActions: (value0: string | number | null | undefined) => `${value0} 추가 작업`,
  wholeMinutesRange: (value0: string | number | null | undefined) =>
    `1~${value0} 사이의 정수(분)를 입력하거나 비워 두세요.`,
  requestPlaceholderRequired: (value0: string | number | null | undefined) =>
    `${value0}에 유효한 요청 자리표시자가 필요합니다.`,
  webhookFilterPath: (value0: string | number | null | undefined) => `필터 ${value0} 경로`,
  removeWebhookFilter: (value0: string | number | null | undefined) => `필터 ${value0} 삭제`,
  webhookFilterTest: (value0: string | number | null | undefined) => `필터 ${value0} 조건`,
  webhookFilterValue: (value0: string | number | null | undefined) => `필터 ${value0} 값`,
  reconnectForScheduledTasks: (value0: string | number | null | undefined) =>
    `예약 작업을 보려면 ${value0}에 다시 연결하세요.`,
  enableItem: (value0: string | number | null | undefined) => `${value0} 사용`,
  actionsFor: (value0: string | number | null | undefined) => `${value0} 작업`,
  threadReference: (value0: string | number | null | undefined) => `대화 ${value0}`,
  secretSource: (value0: string | number | null | undefined) => `${value0} 소스`,
  secretReference: (value0: string | number | null | undefined) => `${value0} 참조`,
  unsupportedProvider: (value0: string | number | null | undefined) =>
    `지원하지 않는 제공자 (${value0})`,
  environmentAgentToken: (value0: string | number | null | undefined) =>
    `에이전트 토큰 · ${value0}`,
  usingMachineAgentToken: (value0: string | number | null | undefined) =>
    `이 컴퓨터의 agent-device 토큰을 사용합니다 (${value0}).`,
  tokenAccepted: (value0: string | number | null | undefined) =>
    `${value0} 계정으로 확인되었습니다.`,
  setUpDesktopSnapshots: (value0: string | number | null | undefined) => `${value0} 스냅샷 설정`,
  snoozeOption: (value0: string | number | null | undefined) => `미루기 옵션 ${value0}`,
  removeSnoozeOption: (value0: string | number | null | undefined) => `미루기 옵션 ${value0} 삭제`,
  snoozeMenuPreview: (value0: string | number | null | undefined) => `현재 메뉴: ${value0}`,
  saveSourceControlAccount: (value0: string | number | null | undefined) =>
    `${value0} 계정 설정 저장`,
  hideAccounts: (value0: string | number | null | undefined) => `${value0} 계정 숨기기`,
  revealAccounts: (value0: string | number | null | undefined) => `${value0} 계정 표시`,
  accountForHostLabel: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value1}에서 ${value0} 사용`,
  hostAccount: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value1}의 ${value0} 계정`,
  accountNumber: (value0: string | number | null | undefined) => `계정 ${value0}`,
  invalidSourceControlLogin: (value0: string | number | null | undefined) =>
    `${value0}에서 이 로그인이 유효하지 않다고 보고했습니다.`,
  signOutOfApp: (value0: string | number | null | undefined) => `${value0}에서 로그아웃`,
  saveProviderSettings: (value0: string | number | null | undefined) => `${value0} 설정 저장`,
  allSourceControlHostsDisabled: (value0: string | number | null | undefined) =>
    `모든 ${value0} 호스트가 꺼져 있습니다.`,
  toggleDetails: (value0: string | number | null | undefined) => `${value0} 세부 정보 전환`,
  availability: (value0: string | number | null | undefined) => `${value0} 사용 가능 여부`,
  versionControlTitle: (value0: string | number | null | undefined) => `버전 제어${value0}`,
  sourceControlProvidersTitle: (value0: string | number | null | undefined) =>
    `소스 제어 제공자${value0}`,
  saveToken: (value0: string | number | null | undefined) => `${value0} 토큰 저장`,
  sourceControlTokenFallback: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `저장된 토큰이 없어 서버에서 ${value0} 또는 ${value1} 로그인을 사용합니다.`,
  savedForHosts: (value0: string | number | null | undefined) => `${value0}에 저장되었습니다.`,
  telemetryConnected: (value0: string | number | null | undefined) => `연결됨 · ${value0} ms`,
  telemetryRejected: (value0: string | number | null | undefined) => `거부됨 · HTTP ${value0}`,
  colorHue: (value0: string | number | null | undefined) => `${value0} 색조`,
  colorPickerHexValue: (value0: string | number | null | undefined) => `${value0} 선택기의 HEX 값`,
  colorPickerRgbValue: (value0: string | number | null | undefined) => `${value0} 선택기의 RGB 값`,
  chooseNamedColor: (value0: string | number | null | undefined) => `${value0} 색상 선택`,
  colorUsage: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `${value1} 사용 위치 ${value0}`,
  colorHexValue: (value0: string | number | null | undefined) => `${value0} HEX 값`,
  themeUpdated: (value0: string | number | null | undefined) => `${value0} 업데이트됨`,
  themePaletteAdded: (appearance: "light" | "dark") =>
    `${themeModeLabel(appearance)} 팔레트를 추가했습니다.`,
  themeSaved: (value0: string | number | null | undefined) => `${value0} 저장됨`,
  themeCreated: (value0: string | number | null | undefined) => `${value0} 생성됨`,
  mergeIntoTheme: (value0: string | number | null | undefined) => `“${value0}”에 병합`,
  supportedThemesFound: (value0: string | number | null | undefined) =>
    `지원하는 테마 ${value0}개를 찾았습니다.`,
  viewSourceFor: (value0: string | number | null | undefined) => `${value0} 소스 보기`,
  threadDetailsEnabled: (
    value0: string | number | null | undefined,
    value1: string | number | null | undefined,
  ) => `대화 세부 정보: ${value1}개 중 ${value0}개 사용`,
  recordSnapshotShortcut: (value0: string | number | null | undefined) =>
    `스냅샷 단축키 기록, 현재 ${value0}`,
  reconnectForProviders: (value0: string | number | null | undefined) =>
    `제공자를 설정하려면 ${value0}에 다시 연결하세요.`,
  chooseSupportingEnvironment: (value0: string | number | null | undefined) =>
    `${value0}을(를) 지원하는 환경이 필요합니다. 계속하려면 환경을 선택하세요.`,
  connectSupportingEnvironment: (value0: string | number | null | undefined) =>
    `${value0}을(를) 지원하는 환경이 필요합니다. 계속하려면 환경을 연결하거나 업데이트하세요.`,
  chooseSettingScope: (value0: string | number | null | undefined) =>
    `선택한 대상에서 ${value0}을(를) 사용할 수 없습니다. 계속하려면 해당 설정의 범위를 선택하세요.`,
  retentionDays: (label: string) => `${label} (일)`,
  cleanupEveryMachine: (counts: string) => `${counts} · 모든 컴퓨터`,
  cleanupFiles: (count: number) => `파일 ${count.toLocaleString()}개`,
  cleanupMoreResults: (environment: string, count: number) =>
    `${environment}: 결과 ${count.toLocaleString()}개 더 있음.`,
  cleanupNothingNeeded: (environment: string) => `${environment}: 정리할 항목이 없습니다.`,
  cleanupCounts: (removed: number, kept: number, failed: number) =>
    `삭제 ${removed}개, 유지 ${kept}개${failed > 0 ? `, 실패 ${failed}개` : ""}`,
  cleanupLastRun: (relativeTime: string, bytesFreed: string, failed: number) =>
    `마지막 실행: ${relativeTime}. ${bytesFreed} 확보.${failed > 0 ? ` 항목 ${failed}개를 삭제하지 못했습니다.` : ""}`,
  cleanupFailedOn: (environment: string) => `${environment}에서 정리하지 못했습니다`,
  cleanupRunFailedOn: (environment: string) => `${environment}에서 정리를 실행하지 못했습니다`,
  mobileAlertsEnabled: (types: readonly string[]) => `알림 켜짐: ${types.join(", ")}`,
  mobileClientUpdatedAt: (date: string) => `마지막 업데이트: ${date}`,
  addMcpUrlToAgent: (url: string) =>
    `에이전트에 추가하세요. 예: claude mcp add --transport http liverary ${url}`,
  managedBy: (organization: string) => `${organization}에서 관리합니다.`,
  organizationPolicy: (organization: string) =>
    `이 환경은 ${organization}에서 관리합니다. 일부 설정과 기능에는 조직 정책이 적용됩니다.`,
  mixedDefaultsEffort: (automatic: boolean) =>
    `${automatic ? "자동 기본값" : "기본값"}이 서로 다릅니다. 추론 수준을 편집하려면 환경 하나를 선택하거나 공통 모델을 선택하세요.`,
  checkoutGroupingLabel: (path: string, environment: string) =>
    `${environment}의 ${path} 그룹화 규칙`,
  defaultGrouping: (label: string) => `기본값 (${label})`,
  connectToLoadModels: (environment: string) => `${environment}에 연결하여 모델을 불러오세요.`,
  decreaseInterval: (label: string) => `${label} 줄이기`,
  increaseInterval: (label: string) => `${label} 늘리기`,
  intervalSeconds: (label: string) => `${label} (초)`,
  providerRemovalDetails: (question: string, consequence: string) =>
    `${question}\n사용자 지정 실행 파일 경로를 포함한 저장된 설정이 삭제됩니다.${consequence}`,
  removeProviderQuestion: (name: string) => `${name} 제공자 인스턴스를 삭제할까요?`,
  resetProviderQuestion: (name: string) => `${name} 제공자를 기본값으로 초기화할까요?`,
  onceAt: (date: string) => `한 번, ${date} (이 기기 시간)`,
  disabledWebhookTask: (reason: string) =>
    `${reason} 저장하려면 시간 또는 간격 예약으로 바꾸거나 작업을 끄세요.`,
  sourceControlToken: (label: string) => `${label} 토큰`,
  otherClientsRevoked: (count: number) => `다른 클라이언트 ${count}개의 접근 권한을 해제했습니다`,
  backendToggleFailed: (enabled: boolean) =>
    enabled ? "백엔드를 켜지 못했습니다" : "백엔드를 끄지 못했습니다",
  confirmRemoveEnvironment: (label: string) =>
    `이 기기에서 ${label} 환경을 삭제할까요?\n이 기기에 저장된 페어링 정보, 인증 정보와 대화 캐시를 삭제합니다. 저장된 정보를 유지하려면 환경을 끄세요.`,
  wslStartFailed: (detail: string) => `WSL 백엔드를 시작하지 못했습니다: ${detail}`,
  networkAddress: (url: string) => `접속 주소: ${url}`,
  networkAdvertisedHost: (host: string) =>
    `모든 네트워크 인터페이스에서 접근할 수 있습니다. 페어링 링크에는 ${host} 주소를 사용합니다.`,
  environmentServer: (label: string) => `${label} 서버`,
  updateToVersion: (version: string) => `${version} 버전으로 업데이트`,
  confirmForgetEnvironmentLink: (label: string) =>
    `${label} 환경 연결을 삭제할까요? 여기의 에이전트는 상대 환경에서 작업할 수 없게 됩니다. 상대 환경의 연결 설정에서 이 연결의 접근 권한도 해제하면 세션을 완전히 종료할 수 있습니다.`,
  environmentLinkExpires: (days: number) => `${days}일 후 만료됩니다. 갱신하려면 다시 연결하세요.`,
  environmentLinked: (label: string) => `${label} 환경을 연결했습니다`,
  environmentAddressNeeded: (label: string) =>
    `다른 컴퓨터에서 접근할 수 있는 ${label}의 주소가 없습니다. HTTPS 또는 Tailscale 주소를 입력하세요.`,
  environmentPairingInstructions: (label: string) =>
    `${label}의 설정 → 연결 → 링크 만들기에서 링크를 만든 다음, 코드를 여기에 붙여 넣으세요.`,
  removeProjectFailed: (title: string) => `“${title}” 프로젝트를 삭제하지 못했습니다`,
  removeCheckoutLabel: (path: string) => `체크아웃 삭제: ${path}`,
  removeAllCheckoutsDescription: (count: number) =>
    `모든 컴퓨터의 체크아웃 항목 ${count}개와 해당 대화를 삭제합니다. 디스크의 파일은 유지됩니다.`,
  accountsAndToken: (label: string) => `${label} 계정 및 토큰`,
  credentials: (label: string) => `${label} 인증 정보`,
  machinesOnChannel: (count: number, channel: string) =>
    `${count}대의 기기에서 아직 ${channel} 채널을 사용하고 있습니다.`,
  resetSettings: (labels: readonly string[]) => `다음 설정을 초기화합니다: ${labels.join(", ")}.`,
  multilineSendShortcut: (modifier: string) => `여러 줄 입력 시 ${modifier} + Enter`,
  alwaysSendShortcut: (modifier: string) => `항상 ${modifier} + Enter`,
  alternateMultilineSend: (modifier: string) =>
    `한 줄 입력 시 ${modifier} + Enter, 여러 줄 입력 시 ${modifier} + Shift + Enter를 누르면 해당 메시지만 반대 방식으로 전송합니다.`,
  alternateSend: (modifier: string, shift: boolean) =>
    `${modifier}${shift ? " + Shift" : ""} + Enter를 누르면 해당 메시지만 반대 방식으로 전송합니다.`,
  inheritedFrom: (source: string) => `${source}에서 상속됨`,
  resetToDefault: (label: string) => `${label} 기본값으로 초기화`,
  settingsPermissionDenied: (environment: string) =>
    `이 연결에는 ${environment}의 설정을 변경할 권한이 없습니다.`,
  fontFamily: (title: string) => `${title} 글꼴`,
  chooseThemeVariant: (mode: "light" | "dark", count: number, current: string) =>
    `${themeModeLabel(mode)} 변형 선택, ${count}개 옵션, 현재 ${current}`,
  themeVariantLabel: (mode: "light" | "dark", current: string) =>
    `${themeModeLabel(mode)} 변형 사용, 현재 ${current}`,
  themeForModeLabel: (label: string, mode: "light" | "dark", active = false) =>
    `${themeModeLabel(mode)} 모드에 ${label} 사용${active ? ", 현재 적용됨" : ""}`,
  themeSelectionLabel: (label: string, collection: string | undefined, active: boolean) =>
    `${collection ? `${collection}, ${label} 변형` : `${label} 테마`} 사용${active ? ", 현재 적용됨" : ""}`,
  duplicate: (label: string) => `${label} 복제`,
  edit: (label: string) => `${label} 편집`,
  export: (label: string) => `${label} 내보내기`,
  remove: (label: string) => `${label} 삭제`,
  clear: (label: string) => `${label} 지우기`,
  removeCollectionThemes: (label: string) => `${label}에서 테마 삭제`,
  themeModeOnlyLabel: (mode: "light" | "dark") => `${themeModeLabel(mode)} 모드에서만 사용`,
  themeModeLabel: (mode: "light" | "dark") => `${themeModeLabel(mode)} 모드 사용`,
  copyName: (label: string) => `${label} 복사본`,
  themesImported: (labels: readonly string[], updated: boolean) =>
    `${labels.length === 1 ? labels[0] : `테마 ${labels.length}개`} ${updated ? "업데이트됨" : "추가됨"}`,
  themeAdded: (label: string) => `${label} 추가됨`,
  themeModeApplied: (mode: "light" | "dark") => `${themeModeLabel(mode)} 테마로 적용되었습니다.`,
  confirmRemoveCollectionThemes: (label: string) => `“${label}”에서 테마를 삭제할까요?`,
  confirmRemoveTheme: (label: string | undefined) => `“${label}” 테마를 삭제할까요?`,
  removeSelectedThemes: (count: number) => `선택 항목 삭제${count > 0 ? ` (${count})` : ""}`,
  waitingForConfiguration: (environment: string) => `${environment}의 설정을 기다리는 중입니다.`,
  providerUpdateFailed: (label: string) => `${label} 업데이트에 실패했습니다`,
  providerSettingsReadOnly: (environment: string) =>
    `이 세션에서는 ${environment}의 AI 제공자를 볼 수 있지만 설정을 변경할 수는 없습니다.`,
  providerSettings: (label: string) => `${label} AI 제공자 설정`,
  argument: (index: number) => `인수 ${index}`,
  removeArgument: (index: number) => `인수 ${index} 삭제`,
  downloadProgress: (downloadedBytes: number, totalBytes: number | null) =>
    `${(downloadedBytes / 1_000_000).toFixed(1)}${totalBytes === null ? "" : ` / ${(totalBytes / 1_000_000).toFixed(1)}`} MB 다운로드 중`,
  downloadSize: (bytes: number) => `다운로드 용량: ${Math.ceil(bytes / 1_000_000)} MB.`,
  removeAntigravityRuntime: (environment: string) =>
    `${environment}에서 다운로드한 Antigravity 런타임을 삭제할까요? Google 로그인과 대화 기록은 유지됩니다.`,
  signInOn: (environment: string) => `${environment}에서 로그인하세요.`,
  signOutProvider: (provider: string, environment: string) =>
    `${environment}의 ${provider}에서 로그아웃할까요? 이 로그인을 공유하는 대화의 실행이 중지됩니다. 대화 기록은 유지됩니다.`,
  instanceAlreadyExists: (id: string) => `'${id}' 인스턴스가 이미 있습니다.`,
  providerWorkspace: (label: string) => `${label} 작업 공간`,
  providerInstanceAdded: (label: string, id: string) =>
    `${label}의 '${id}' 인스턴스를 추가했습니다.`,
  runLocalAcp: (environment: string) => `${environment}에 설치된 ACP 실행 파일을 실행합니다.`,
  openDocumentation: (name: string, id: string) => `${name} (${id}) 문서 열기`,
  openSource: (name: string, id: string) => `${name} (${id}) 소스 열기`,
  modelSlugTooLong: (maxLength: number) => `모델 식별자는 ${maxLength}자 이하여야 합니다.`,
  favoriteCount: (count: number) => ` · 즐겨찾기 ${count}개`,
  hiddenCount: (count: number) => ` · 숨김 ${count}개`,
  toggleModelFavorite: (name: string, isFavorite: boolean) =>
    `${name} 즐겨찾기 ${isFavorite ? "해제" : "추가"}`,
  moveUp: (name: string) => `${name} 위로 이동`,
  moveDown: (name: string) => `${name} 아래로 이동`,
  showModel: (name: string) => `모델 선택 목록에 ${name} 표시`,
  environmentVariableName: (index: number) => `환경 변수 ${index} 이름`,
  removeEnvironmentVariable: (name: string | number) => `환경 변수 ${name} 삭제`,
  markEnvironmentVariableSensitive: (name: string | number) =>
    `환경 변수 ${name}을 민감한 정보로 표시`,
  environmentVariableValue: (index: number) => `환경 변수 ${index} 값`,
  updateCommandCopied: (provider: string) => `${provider} 업데이트 명령을 복사했습니다`,
  updateCommandCopyFailed: (provider: string) => `${provider} 업데이트 명령을 복사하지 못했습니다`,
  viewUpdateDetails: (title: string) => `${title}, 자세히 보기`,
  installVersion: (version: string | null) => `${version} 설치`,
  select: (label: string) => `${label} 선택`,
  updating: (progress: string) => `업데이트 중 · ${progress}`,
  providerEnablement: (name: string) => `${name} 사용 여부`,
  enableProvider: (name: string) => `${name} 사용`,
  deleteInstance: (id: string) => `${id} 인스턴스 삭제`,
  modelCount: (count: number) => `모델 ${count}개`,
  days: (count: number) => `${count}일`,
  items: (count: number) => `${count}개 항목`,
  projectOverrides: (summary: string, count: number) =>
    `${summary} · 프로젝트 ${count}개에서 재정의`,
  showInheritance: (summary: string) => `${summary}. 설정값의 출처 보기`,
  cliShadowed: (path: string) =>
    `새 터미널에서는 ${path}의 다른 liverary 명령이 먼저 실행됩니다. 이 앱의 명령을 사용하려면 기존 명령을 삭제하세요.`,
  cliInstalled: (path: string | null) => `${path}에 설치되었습니다. 새 터미널에서 사용하세요.`,
  cliNotOnPath: (path: string | null) =>
    `${path}에 설치되었지만 아직 PATH에 없습니다. \`liverary\`를 실행하려면 해당 폴더를 PATH에 추가하세요.`,
  copyVersion: (version: string) => `버전 ${version} 복사`,
  notMonospace: (font: string) => `“${font}”은 고정폭 글꼴이 아닙니다`,
  accentColor: (name: string, hasColor: boolean) =>
    `${name} 강조 색상 ${hasColor ? "변경" : "추가"}`,
  removeOption: (index: number) => `옵션 ${index} 삭제`,
  continueWithOpenAi: (email: string) => `OpenAI에서 ${email} 계정으로 계속하세요.`,
  notAuthenticated: (label: string) => `인증되지 않음 · ${label}`,
  authenticated: (label: string) => `인증됨 · ${label}`,
  recommendedProviderVersion: (version: string) =>
    `모든 기능을 사용하려면 ${version} 버전을 사용하세요.`,
  providerVersionAvailable: (label: string, version: string) =>
    `${label}: ${version} 버전을 설치하세요.`,
  latestProviderVersionAvailable: (label: string) => `${label}: 최신 AI 제공자 버전을 설치하세요.`,
  unknownConditions: (identifiers: readonly string[]) =>
    `알 수 없는 조건: ${identifiers.join(", ")}`,
  keybindingConflicts: (labels: readonly string[]) =>
    `${labels.slice(0, 3).join(", ")}${labels.length > 3 ? " 외 여러 단축키" : ""}와 충돌합니다. `,
  negateCondition: (condition: string) => `${condition} 조건 반전`,
  editShortcut: (label: string, shortcut: string) => `${label} 단축키 편집: ${shortcut}`,
  keybindingFor: (label: string) => `${label} 단축키`,
  editWhenClause: (label: string) => `${label} 적용 조건 편집`,
  keybindingActions: (label: string) => `${label} 작업`,
  runScript: (name: string) => `스크립트 실행: ${name}`,
} as const;

export const keybindingLabels = {
  "workspace.focusNext": "다음 작업 영역으로 이동",
  "workspace.focusPrevious": "이전 작업 영역으로 이동",
  "sidebar.toggle": "사이드바: 열기/닫기",
  "navigation.back": "탐색: 뒤로",
  "navigation.forward": "탐색: 앞으로",
  "terminal.toggle": "터미널: 열기/닫기",
  "terminal.split": "터미널: 분할",
  "terminal.splitVertical": "터미널: 세로 분할",
  "terminal.new": "터미널: 새 터미널",
  "terminal.close": "터미널: 닫기",
  "rightPanel.toggle": "오른쪽 패널: 열기/닫기",
  "rightPanel.new": "오른쪽 패널: 새 패널",
  "threadPanel.toggle": "대화 패널: 열기/닫기",
  "rightPanel.toggleMaximized": "오른쪽 패널: 최대화 전환",
  "rightPanel.close": "오른쪽 패널: 닫기",
  "view.reopenClosed": "닫은 탭 다시 열기",
  "pullRequest.copyNumber": "Pull Request: 번호 복사",
  "diff.toggle": "변경 사항: 열기/닫기",
  "preview.toggle": "미리보기: 열기/닫기",
  "preview.refresh": "미리보기: 새로 고침",
  "preview.focusUrl": "미리보기: 주소창으로 이동",
  "preview.zoomIn": "미리보기: 확대",
  "preview.zoomOut": "미리보기: 축소",
  "preview.resetZoom": "미리보기: 확대 비율 초기화",
  "commandPalette.toggle": "명령 팔레트: 열기/닫기",
  "filePicker.toggle": "파일 선택: 열기/닫기",
  "projectSearch.toggle": "프로젝트 검색: 열기/닫기",
  "usage.open": "사용량: 열기",
  "theme.select": "테마: 선택",
  "appearance.cycle": "화면 모드: 순환",
  "themeEditor.toggle": "테마 편집기: 열기/닫기",
  "composer.stash": "메시지 입력: 임시 보관",
  "composer.sendAlternate": "메시지 입력: 대기열 또는 현재 실행 반영 방식 전환",
  "composer.dictation": "입력창: 받아쓰기 시작 또는 완료",
  "composer.sendBackground": "메시지 입력: 백그라운드에서 시작",
  "composer.sendAndNewThread": "메시지 입력: 전송 후 새 대화 시작",
  "composer.host": "메시지 입력: 호스트 선택",
  "composer.cycleHost": "메시지 입력: 호스트 순환",
  "composer.effort": "메시지 입력: 추론 수준 선택",
  "composer.increaseEffort": "메시지 입력: 추론 수준 높이기",
  "composer.decreaseEffort": "메시지 입력: 추론 수준 낮추기",
  "composer.mode": "메시지 입력: 모드 선택",
  "composer.workspace": "메시지 입력: 작업 공간 선택",
  "composer.previousWorktree": "메시지 입력: 이전 작업 트리",
  "composer.branch": "메시지 입력: 브랜치 선택",
  "chat.new": "대화: 새 대화",
  "chat.newLocal": "대화: 새 로컬 대화",
  "chat.newWithoutProject": "대화: 프로젝트 없이 시작",
  "chat.find": "대화: 찾기",
  "editor.openFavorite": "편집기: 즐겨찾는 편집기에서 열기",
  "usage.cost": "사용량: 비용",
  "usage.tokens": "사용량: 토큰",
  "usage.limits": "사용량: 한도",
  "usage.period.day": "사용량: 기간: 최근 24시간",
  "usage.period.week": "사용량: 기간: 7일",
  "usage.period.month": "사용량: 기간: 30일",
  "usage.period.quarter": "사용량: 기간: 90일",
  "modelPicker.toggle": "모델 선택: 열기/닫기",
  "modelPicker.previousProvider": "모델 선택: 이전 AI 제공자",
  "modelPicker.nextProvider": "모델 선택: 다음 AI 제공자",
  "thread.regenerateTitle": "대화: 제목 다시 생성",
  "thread.stop": "대화: 중지",
  "thread.steerQueuedMessage": "대기열: 첫 번째 메시지 전송",
  "thread.editQueuedMessage": "대기열: 마지막 메시지 편집",
  "thread.previous": "대화: 이전 대화",
  "thread.next": "대화: 다음 대화",
  "thread.copyReference": "Pull Request: 링크 또는 대화 복사",
  "thread.settle": "대화: 정리",
  "thread.pin": "대화: 고정",
  "thread.undo": "대화: 실행 취소",
  "thread.jump.1": "대화: 1번으로 이동",
  "modelPicker.jump.1": "모델 선택: 1번으로 이동",
  "thread.jump.2": "대화: 2번으로 이동",
  "modelPicker.jump.2": "모델 선택: 2번으로 이동",
  "thread.jump.3": "대화: 3번으로 이동",
  "modelPicker.jump.3": "모델 선택: 3번으로 이동",
  "thread.jump.4": "대화: 4번으로 이동",
  "modelPicker.jump.4": "모델 선택: 4번으로 이동",
  "thread.jump.5": "대화: 5번으로 이동",
  "modelPicker.jump.5": "모델 선택: 5번으로 이동",
  "thread.jump.6": "대화: 6번으로 이동",
  "modelPicker.jump.6": "모델 선택: 6번으로 이동",
  "thread.jump.7": "대화: 7번으로 이동",
  "modelPicker.jump.7": "모델 선택: 7번으로 이동",
  "thread.jump.8": "대화: 8번으로 이동",
  "modelPicker.jump.8": "모델 선택: 8번으로 이동",
  "thread.jump.9": "대화: 9번으로 이동",
  "modelPicker.jump.9": "모델 선택: 9번으로 이동",
} as const satisfies Record<(typeof STATIC_KEYBINDING_COMMANDS)[number], string>;

export function localizeSettingsText(text: string): string {
  if (Object.hasOwn(settingsText, text)) return settingsText[text as keyof typeof settingsText];
  const tunnel = /^Tunnel connected(?: · (\d+) connections?)?(?: · (.+))?$/.exec(text);
  if (tunnel)
    return [
      "터널 연결됨",
      ...(tunnel[1] ? [`연결 ${tunnel[1]}개`] : []),
      ...(tunnel[2] ? [tunnel[2]] : []),
    ].join(" · ");
  const edgePort = /^Cloudflare's tunnel port \((\d+)\) times out from this machine\.$/.exec(text);
  if (edgePort)
    return `이 컴퓨터에서 Cloudflare 터널 포트(${edgePort[1]}) 연결 시간이 초과되었습니다.`;
  const exitNode =
    /^Tailscale exit node(?: "(.+)")? is on\. Traffic to Cloudflare goes through it\.$/.exec(text);
  if (exitNode)
    return `Tailscale 출구 노드${exitNode[1] ? ` “${exitNode[1]}”` : ""}가 켜져 있습니다. Cloudflare 트래픽이 이 노드를 통과합니다.`;
  const allowPort =
    /^Allow outbound TCP and UDP port (\d+), or turn off the VPN or firewall that blocks it\.$/.exec(
      text,
    );
  if (allowPort)
    return `아웃바운드 TCP 및 UDP 포트 ${allowPort[1]}을 허용하거나 이를 차단하는 VPN 또는 방화벽을 끄세요.`;
  const exitCommand =
    /^tailscale set --exit-node=   \(or allow outbound (\d+) on that network\)$/.exec(text);
  if (exitCommand)
    return `tailscale set --exit-node=   (또는 해당 네트워크에서 아웃바운드 포트 ${exitCommand[1]} 허용)`;
  const connectHttp =
    /^The T3 Connect address answered with HTTP (\d+)(?: \(Cloudflare error (\d+)\))?\.$/.exec(
      text,
    );
  if (connectHttp)
    return `T3 Connect 주소가 HTTP ${connectHttp[1]}${connectHttp[2] ? `(Cloudflare 오류 ${connectHttp[2]})` : ""} 응답을 반환했습니다.`;
  const speechModelDescription = /^(.+) speech-to-text\.$/.exec(text);
  if (speechModelDescription) return `${speechModelDescription[1]} 음성 인식 모델.`;
  const speechPlatform = /^voice transcription is not available on (.+)$/.exec(text);
  if (speechPlatform) return `${speechPlatform[1]}에서는 음성 받아쓰기를 사용할 수 없습니다`;
  const generatorOff = /^(.+) is off\. Turn it on in Settings → Providers\.$/.exec(text);
  if (generatorOff) return `${generatorOff[1]}이(가) 꺼져 있습니다. 설정 → 제공자에서 켜세요.`;
  const generatorModels = /^(.+) lists no models to test with\.$/.exec(text);
  if (generatorModels) return `${generatorModels[1]}에 테스트할 모델이 없습니다.`;
  const generatorReach = /^Couldn't reach (.+)\. Check the base URL and your connection\.$/.exec(
    text,
  );
  if (generatorReach)
    return `${generatorReach[1]}에 연결하지 못했습니다. 기본 URL과 연결 상태를 확인하세요.`;
  const generatorReply = /^(.+) returned a reply Liverary couldn't read\.$/.exec(text);
  if (generatorReply)
    return `${generatorReply[1]}에서 Liverary가 읽을 수 없는 응답을 반환했습니다.`;
  const generatorTimeout = /^(.+) took too long to respond\.$/.exec(text);
  if (generatorTimeout) return `${generatorTimeout[1]}의 응답 시간이 초과되었습니다.`;
  const generatorLimit = /^(.+) reached its output limit\.$/.exec(text);
  if (generatorLimit) return `${generatorLimit[1]}의 출력 한도에 도달했습니다.`;
  const generatorEmpty = /^(.+) returned no text\.$/.exec(text);
  if (generatorEmpty) return `${generatorEmpty[1]}에서 텍스트를 반환하지 않았습니다.`;
  const generatorStatus =
    /^(.+) (rejected the API key|couldn't find that model or endpoint|is rate-limiting requests|returned HTTP (\d+))(?:\.|: ([\s\S]*))$/.exec(
      text,
    );
  if (generatorStatus) {
    const reason =
      generatorStatus[2] === "rejected the API key"
        ? "API 키를 거부했습니다"
        : generatorStatus[2] === "couldn't find that model or endpoint"
          ? "모델 또는 엔드포인트를 찾지 못했습니다"
          : generatorStatus[2] === "is rate-limiting requests"
            ? "요청 속도를 제한하고 있습니다"
            : `HTTP ${generatorStatus[3]} 응답을 반환했습니다`;
    return `${generatorStatus[1]}에서 ${reason}${generatorStatus[4] ? `: ${generatorStatus[4]}` : "."}`;
  }
  return text;
}

export function localizeProjectRemovalConfirmation(message: string): string {
  return message
    .split("\n")
    .map((line) => {
      const question =
        /^Remove (checkout|project) "(.+)"(?: and delete its (\d+) threads?)?\?$/.exec(line);
      if (question)
        return `“${question[2]}” ${question[1] === "checkout" ? "체크아웃" : "프로젝트"}${question[3] ? ` 및 대화 ${question[3]}개` : ""}을(를) 삭제할까요?`;
      if (line.startsWith("Path: ")) return `경로: ${line.slice(6)}`;
      if (line.startsWith("Environment: ")) return `환경: ${line.slice(13)}`;
      const grouped = /^This removes (\d+) grouped project entries\.$/.exec(line);
      if (grouped) return `묶인 프로젝트 항목 ${grouped[1]}개를 삭제합니다.`;
      const fixed: Record<string, string> = {
        "Those threads and any archived threads are deleted from this app. Provider sessions are kept.":
          "해당 대화와 보관된 대화를 이 앱에서 삭제합니다. 제공자 세션은 유지됩니다.",
        "Any archived threads are deleted from this app. Provider sessions are kept.":
          "보관된 대화를 이 앱에서 삭제합니다. 제공자 세션은 유지됩니다.",
        "This removes only the project entries, not the files on disk.":
          "프로젝트 항목만 삭제하며 디스크의 파일은 유지됩니다.",
        "Other entries in this grouped project are unaffected.":
          "같은 그룹의 다른 프로젝트 항목은 유지됩니다.",
        "This action cannot be undone.": "이 작업은 되돌릴 수 없습니다.",
      };
      return fixed[line] ?? line;
    })
    .join("\n");
}

export function localizeSourceControlGuidance(text: string): string {
  const translated = localizeSettingsText(text);
  if (translated !== text) return translated;
  const environmentToken =
    /^Using (.+) from the server environment; it overrides the account chosen in Settings\.$/.exec(
      text,
    );
  if (environmentToken)
    return `서버 환경의 ${environmentToken[1]}을(를) 사용하며 설정에서 선택한 계정보다 우선합니다.`;
  const gitCafeAuth = /^GitCafe authentication status could not be read\. Run `(.+)`\.$/.exec(text);
  if (gitCafeAuth)
    return `GitCafe 인증 상태를 읽지 못했습니다. \`${gitCafeAuth[1]}\`을 실행하세요.`;
  const gitCafeInstall =
    /^Install the GitCafe CLI with `(.+)`, then run `(.+)`, save a token in Settings, or set CAFE_TOKEN on the server\.$/.exec(
      text,
    );
  if (gitCafeInstall)
    return `\`${gitCafeInstall[1]}\`로 GitCafe CLI를 설치한 뒤 \`${gitCafeInstall[2]}\`를 실행하거나, 설정에 토큰을 저장하거나, 서버에 CAFE_TOKEN을 설정하세요.`;
  const architecture =
    /^`(.+)` is built for another CPU architecture, so this (.+) machine cannot run it\. Remove or replace it\. (.+)$/.exec(
      text,
    );
  if (architecture)
    return `\`${architecture[1]}\`은(는) 다른 CPU 아키텍처용이므로 이 ${architecture[2]} 컴퓨터에서 실행할 수 없습니다. 삭제하거나 교체하세요. ${localizeSettingsText(architecture[3]!)}`;
  return text;
}

const storageCleanupReasons: Readonly<Record<string, string>> = {
  "no thread uses this worktree": "이 워크트리를 사용하는 대화가 없습니다",
  "no thread uses this folder, and it isn't a git worktree":
    "이 폴더를 사용하는 대화가 없으며 Git 워크트리도 아닙니다",
  "no rules apply": "적용할 정리 규칙이 없습니다",
  "project is unavailable": "프로젝트를 사용할 수 없습니다",
  "thread is running or has pending work": "대화가 실행 중이거나 대기 중인 작업이 있습니다",
  "a subagent thread's branch differs from this worktree's branch":
    "하위 에이전트 대화의 브랜치가 이 워크트리의 브랜치와 다릅니다",
  "open terminal": "열려 있는 터미널이 있습니다",
  "worktree is a symbolic link": "워크트리가 심볼릭 링크입니다",
  "outside the managed worktree folder": "관리하는 워크트리 폴더 밖에 있습니다",
  "contains a project checkout": "프로젝트 체크아웃을 포함합니다",
  "not a linked worktree": "연결된 워크트리가 아닙니다",
  "repository or branch changed": "저장소 또는 브랜치가 바뀌었습니다",
  "settled moments ago": "방금 대화를 정리했습니다",
  "thread was deleted": "대화가 삭제되었습니다",
  "no remote is configured for merged-worktree cleanup":
    "병합된 워크트리를 정리할 원격 저장소가 설정되지 않았습니다",
  "project branch is unavailable": "프로젝트 브랜치를 사용할 수 없습니다",
  "default branch is unavailable": "기본 브랜치를 사용할 수 없습니다",
  "no commits beyond the project branch": "프로젝트 브랜치에 없는 커밋이 없습니다",
  "no commits beyond the default branch": "기본 브랜치에 없는 커밋이 없습니다",
  "pull request was merged": "Pull Request가 병합되었습니다",
  "has commits beyond the project branch": "프로젝트 브랜치에 없는 커밋이 있습니다",
  "has commits beyond the default branch": "기본 브랜치에 없는 커밋이 있습니다",
  "not settled": "정리되지 않은 대화입니다",
  "not merged": "아직 병합되지 않았습니다",
  "thread or cleanup settings changed since check": "확인 이후 대화 또는 정리 설정이 바뀌었습니다",
  "thread deletion is still pending": "대화 삭제가 아직 대기 중입니다",
  "thread activity or shared worktree changed since check":
    "확인 이후 대화 활동 또는 공유 워크트리가 바뀌었습니다",
  "parent settlement changed since check": "확인 이후 상위 대화의 정리 상태가 바뀌었습니다",
  "provider session is still open": "제공자 세션이 아직 열려 있습니다",
  "repository or branch changed since check": "확인 이후 저장소 또는 브랜치가 바뀌었습니다",
  "commit changed since check": "확인 이후 커밋이 바뀌었습니다",
  "settings changed since check": "확인 이후 설정이 바뀌었습니다",
  "local changes exceed the inspection limit": "로컬 변경사항이 검사 한도를 초과했습니다",
  "ignored files exceed the inspection limit": "무시된 파일이 검사 한도를 초과했습니다",
  "submodule inspection exceeded the limit": "서브모듈 검사가 한도를 초과했습니다",
  "submodule repository could not be inspected": "서브모듈 저장소를 검사하지 못했습니다",
  "submodule has commits not on a remote-tracking ref":
    "서브모듈에 원격 추적 참조에 없는 커밋이 있습니다",
  "submodules could not be inspected": "서브모듈을 검사하지 못했습니다",
  "submodule has local files": "서브모듈에 로컬 파일이 있습니다",
  "no expired files": "보관 기간이 지난 파일이 없습니다",
};

export function localizeStorageCleanupReason(reason: string): string {
  const normalized = reason.replace(/^./, (character) => character.toLowerCase());
  const fixed = storageCleanupReasons[normalized];
  if (fixed) return fixed;
  const shared = /^shared by (\d+) threads$/.exec(normalized);
  if (shared) return `대화 ${shared[1]}개에서 공유하고 있습니다`;
  const age = /^(inactive|settled) for (\d+)(?: of (\d+))? days$/.exec(normalized);
  if (age) {
    const elapsed = age[3] ? `${age[3]}일 중 ${age[2]}일` : `${age[2]}일`;
    return age[1] === "inactive"
      ? `${elapsed} 동안 활동이 없습니다`
      : `대화 정리 후 ${elapsed}이 지났습니다`;
  }
  const changes = /^(submodule )?has uncommitted changes \((\d+) files?\)$/.exec(normalized);
  if (changes)
    return `${changes[1] ? "서브모듈에 " : ""}커밋하지 않은 파일이 ${changes[2]}개 있습니다`;
  const ignored = /^(submodule )?has ignored files \((.+)\)$/.exec(normalized);
  if (ignored) return `${ignored[1] ? "서브모듈에 " : ""}무시된 파일이 있습니다 (${ignored[2]})`;
  const removed = /^removed (\d+) (browser artifacts|rotated logs)$/.exec(normalized);
  if (removed)
    return `${removed[2] === "browser artifacts" ? "브라우저 생성 파일" : "교체된 로그"} ${removed[1]}개를 삭제했습니다`;
  return reason;
}
