@echo off
setlocal

title MAEngine Dev

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

pushd %~dp0\..

:: Get electron, compile, built-in extensions
if "%VSCODE_SKIP_PRELAUNCH%"=="" (
	node build/lib/preLaunch.ts || (
		echo Failed to prepare VS Code for launch ^(build/lib/preLaunch.ts^). 1>&2
		goto :failed
	)
)
goto :prelaunch_complete

:failed
popd
endlocal
exit /b 1

:prelaunch_complete

set CODE=".build\electron\MAEngine.exe"
if not exist %CODE% set CODE=".build\electron\Code - OSS.exe"

:: Manage built-in extensions
if "%~1"=="--builtin" goto builtin

:: Configuration
set NODE_ENV=development
set VSCODE_DEV=1
set VSCODE_CLI=1
set ELECTRON_ENABLE_LOGGING=1
set ELECTRON_ENABLE_STACK_DUMPING=1

set DISABLE_TEST_EXTENSION="--disable-extension=vscode.vscode-api-tests"
for %%A in (%*) do (
	if "%%~A"=="--extensionTestsPath" (
		set DISABLE_TEST_EXTENSION=""
	)
)

:: SAEngine AI assistants (docs/ai-assistants.md): "set SAENGINE_AI=1" starts the MCP server of each dev window
if "%SAENGINE_AI%"=="1" echo SAEngine AI: MCP server on; address and token are printed below and saved to ^<user-data-dir^>\saengine-ai-window-^<id^>.json

:: Launch Code
%CODE% . %DISABLE_TEST_EXTENSION% %*
goto end

:builtin
%CODE% build/builtin

:end

popd

endlocal
