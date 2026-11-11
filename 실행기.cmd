@echo off
chcp 65001 >nul
setlocal
title Liverary 실행기
cd /d "%~dp0"
set "PATH=%~dp0node_modules\.bin;%PATH%"

echo [Liverary] 현재 소스에 필요한 패키지를 확인합니다.
if exist "node_modules\.bin\vp.cmd" (
  call "node_modules\.bin\vp.cmd" install --frozen-lockfile
) else (
  call npm exec --yes --package=vite-plus@1.4.0 -- vp install --frozen-lockfile
)
if errorlevel 1 goto install_failed

echo.
echo [Liverary] 개발 모드로 실행합니다. 처음에는 빌드가 끝날 때까지 기다려 주세요.
echo [Liverary] 실행 중에는 이 창을 열어 두세요.
call "node_modules\.bin\vp.cmd" run dev:desktop --home-dir ".liverary-dev" %*
set "liverary_exit=%ERRORLEVEL%"
goto finished

:install_failed
set "liverary_exit=%ERRORLEVEL%"
echo.
echo [Liverary] 패키지 설치에 실패했습니다. 위 오류를 확인해 주세요.

:finished
echo.
echo [Liverary] 실행이 종료되었습니다. 종료 코드: %liverary_exit%
pause
exit /b %liverary_exit%
