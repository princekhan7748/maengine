@echo off
rem ===========================================================================
rem MAEngine (Mechanical Analysis Engine) Desktop Launcher
rem ===========================================================================
setlocal

rem Clean any parent VSCode / Antigravity environment hooks
set ELECTRON_RUN_AS_NODE=
set VSCODE_IPC_HOOK=
set VSCODE_PID=
set VSCODE_CWD=
set VSCODE_CODE_CACHE_PATH=
set VSCODE_CRASH_REPORTER_PROCESS_TYPE=
set VSCODE_ESM_ENTRYPOINT=
set VSCODE_HANDLES_UNCAUGHT_ERRORS=
set ANTIGRAVITY_VSCODE_HOST=

rem Configure developer workbench flags
set NODE_ENV=development
set VSCODE_DEV=1
set VSCODE_CLI=1
set VSCODE_SKIP_PRELAUNCH=1

set "REPO_ROOT=C:\Users\rashe\Documents\maengine"
set "WORKBENCH_ROOT=%REPO_ROOT%\workbench"
set "USER_DATA=%APPDATA%\MAEngine"

if not exist "%USER_DATA%" mkdir "%USER_DATA%"

set "APP_EXE=%WORKBENCH_ROOT%\.build\electron\MAEngine.exe"
if not exist "%APP_EXE%" set "APP_EXE=%REPO_ROOT%\VSCode-win32-x64\MAEngine.exe"

cd /d "%WORKBENCH_ROOT%"
echo Starting MAEngine Desktop Application...
start "" "%APP_EXE%" . --user-data-dir="%USER_DATA%"
endlocal
