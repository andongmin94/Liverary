# T3 Custom

[T3 Code](https://github.com/pingdotgg/t3code)를 기반으로 한 한국어 중심의 개인용 커스텀입니다. Electron 데스크톱 앱과 로컬 웹 화면을 함께 제공합니다.

**설치 파일:** [최신 릴리스 다운로드](https://github.com/andongmin94/t3-custom/releases/latest)

현재 기반 버전은 **T3 Code v0.1.6** (`2359643cffa6ba9ee84d6f2694b935de54a8013e`)입니다. 원본 Git 이력을 유지하므로 이후 안정 버전도 병합해 신기능과 수정 사항을 반영할 수 있습니다.

## 변경 사항

- 첫 실행, 프로젝트·대화 사이드바, 명령 팔레트, 주요 설정, 대화 입력·승인·작업 안내, 데스크톱 메뉴를 한국어로 표시합니다. 번역은 `apps/web/src/locales/ko/`에 모았습니다.
- 날짜와 상대 시간을 한국어로 표시합니다. 시간대와 12/24시간 선택은 유지합니다.
- 기본 빌드는 T3 Connect 계정 없이 로컬에서 실행합니다. `.env.example`과 빌드 워크플로의 Clerk·relay 설정은 비어 있습니다.
- 앱 이름·식별자·데이터 폴더·업데이트 저장소를 T3 Custom으로 분리했습니다. 서버 데이터는 `~/.t3-custom`, Electron 프로필은 OS 앱 데이터 폴더의 `t3-custom`을 사용합니다.
- 원본 앱의 프로필이나 대화 기록을 자동으로 가져오지 않습니다. 데스크톱 연결 주소는 `t3custom://`입니다.

한국어화 대상은 데스크톱과 로컬 웹의 주요 사용 화면입니다. 일부 고급 화면, 에이전트·서버에서 전달하는 메시지, 릴리스 노트, 문서, 모바일 앱은 영어가 남아 있습니다.

### 로그인 구분

**T3 Connect 로그인은 로컬 사용에 필요하지 않습니다.** 원격 접속·클라우드 기능을 쓰려면 별도 구성이 필요합니다. 네트워크 인증과 접근 제어는 유지됩니다.

**AI 제공자 인증은 필요합니다.** Codex·Claude 등의 계정이나 API 키는 해당 제공자의 실행 조건이며, 앱의 표시 언어와 별개입니다. 이미 설정한 CLI 인증을 사용하거나 첫 실행 화면에서 제공자를 연결하세요.

## 소스에서 실행

[Vite+](https://viteplus.dev/guide/)의 `vp`를 설치합니다. Node.js와 패키지 매니저 버전은 루트 `package.json`을 따릅니다.

```bash
git clone https://github.com/andongmin94/t3-custom.git
cd t3-custom
vp install --frozen-lockfile
```

기본 로컬 실행에는 `.env`가 필요하지 않습니다. 설정을 명시하려면 `.env.example`을 `.env`로 복사합니다.

```bash
# 개발용 데이터 폴더를 지정한 데스크톱 실행
vp run dev:desktop --home-dir ./.t3-custom-dev

# 브라우저에서 로컬 개발 화면 실행
vp run dev --home-dir ./.t3-custom-dev

# 배포용 애플리케이션 번들 빌드
vp run build:desktop
```

Linux에서 네이티브 자격 증명 도우미를 빌드하려면 `libsecret-1-dev`와 `pkg-config`가 필요합니다. 설치 파일은 아래 수동 빌드에서 만듭니다.

## 설치 파일 빌드·발행하기

GitHub Actions에서 다음 두 워크플로를 수동으로 실행합니다. 첫 커스텀 버전은 `1.0.0`이며, 이후 `1.0.1`처럼 증가시킵니다. 원본의 `v0.1.x` 태그와 커스텀 릴리스 버전을 구분합니다.

1. **Build T3 Custom desktop → Run workflow**에서 `main`과 커스텀 버전을 선택합니다. 빌드·검증이 성공하면 실행 URL의 숫자 run ID를 확인합니다.
2. **Publish T3 Custom release → Run workflow**에 성공한 빌드의 run ID와 같은 버전을 입력합니다. 해당 실행의 검증된 아티팩트를 그대로 가져와 같은 버전 태그(`v1.0.0` 등)의 GitHub 릴리스로 발행합니다. 발행 단계에서는 다시 빌드하지 않습니다.

워크플로는 Windows x64 설치 파일, Linux x64 AppImage·deb, CLI 압축 파일과 업데이트 메타데이터를 `t3-custom-<버전>` 아티팩트로 묶습니다. 아티팩트 보관 기간은 7일입니다. macOS 설치 파일은 이 워크플로에 포함되지 않습니다.

발행 워크플로는 설치 파일과 함께 자동 업데이트에 필요한 `latest.yml`, `latest-linux.yml`, blockmap, CLI 압축 파일과 `SHA256SUMS`를 첨부합니다. 자체 서명 인증서를 설정하지 않은 설치 파일은 운영체제에서 확인을 요구할 수 있습니다.

사용자는 [최신 릴리스](https://github.com/andongmin94/t3-custom/releases/latest)에서 설치 파일을 받습니다. 설치된 앱도 **이 저장소에 발행한 커스텀 릴리스**를 업데이트 대상으로 사용합니다.

## 원본 신기능 반영하기

이 저장소는 `main` 브랜치 하나로 관리합니다. 원본 업데이트도 `main`에 병합하며, 별도의 작업·업데이트 브랜치를 유지하지 않습니다.

한 번만 원본 저장소를 등록합니다. 원본 태그는 `upstream/` 아래로 가져와 커스텀 릴리스 태그와 겹치지 않게 합니다.

```bash
git remote add upstream https://github.com/pingdotgg/t3code.git
git fetch upstream 'refs/tags/*:refs/tags/upstream/*'
```

원하는 안정 버전을 확인한 뒤, 작업 트리가 깨끗한 상태에서 병합합니다. 아래 `v0.1.6` 자리를 새 원본 릴리스 태그로 바꾸세요.

```bash
git switch main
git pull --ff-only origin main
git fetch upstream 'refs/tags/*:refs/tags/upstream/*'
git merge upstream/v0.1.6
```

충돌이 생기면 번역·앱 식별자·업데이트 저장소·로컬 실행 설정을 유지하면서 원본 변경을 반영합니다. 원본 워크플로가 다시 추가되었는지도 확인합니다. 업데이트 완료 범위에는 추가·변경된 데스크톱·로컬 웹 UI 문구의 한국어화도 포함됩니다. 기존 `apps/web/src/locales/ko/` 모듈과 관련 표시 문구·테스트를 함께 갱신합니다.

통합한 변경을 기준으로 변경 범위 검사와 데스크톱 빌드를 한 번 수행합니다.

```bash
vp install --frozen-lockfile
vp run check:changed origin/main
vp run build:desktop
git push origin main
```

README의 기반 버전을 갱신하고 커스텀 버전을 올려 설치 파일을 다시 빌드·발행합니다. 원본 설치 파일을 그대로 받아서는 이 저장소의 한국어화와 커스텀 설정이 포함되지 않습니다.

## 개발 및 라이선스

CI는 일반 GitHub 러너에서 변경 파일 검사와 데스크톱 빌드를 수행합니다. 원본의 운영 서비스 배포, 모바일 발행, 이슈 관리, 예약 작업은 이 커스텀 워크플로에서 실행하지 않습니다.

자세한 원본 구조는 [docs/internals/overview.md](docs/internals/overview.md), 개발 규칙은 [AGENTS.md](AGENTS.md)를 참고하세요. 원본 문서의 다운로드 주소와 배포 방법은 T3 Code용일 수 있으므로, T3 Custom 설치·업데이트에는 이 README를 따릅니다.

원본 저작권과 [MIT LICENSE](LICENSE)를 유지합니다. T3 Custom은 T3 Code의 공식 배포판이 아닙니다.
