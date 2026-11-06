@echo off
setlocal
title Liverary - Development
cd /d "%~dp0"
set "PATH=%~dp0node_modules\.bin;%PATH%"
call vp run dev:desktop --home-dir ".t3-custom-dev" %*
set "liverary_exit=%ERRORLEVEL%"
if not "%liverary_exit%"=="0" pause
exit /b %liverary_exit%
