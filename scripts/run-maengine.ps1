$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$codeRoot = Join-Path $repoRoot 'workbench'
$product = Get-Content (Join-Path $codeRoot 'product.json') -Raw | ConvertFrom-Json
$electronDirectory = Join-Path $codeRoot '.build\electron'
$appExecutable = Join-Path $electronDirectory "$($product.nameShort).exe"

if (-not (Test-Path $appExecutable)) {
    $distExe = Join-Path $repoRoot "VSCode-win32-x64\$($product.nameShort).exe"
    if (Test-Path $distExe) {
        $appExecutable = $distExe
    }
}

if (-not (Test-Path (Join-Path $codeRoot 'out\main.js'))) {
    throw "Code - OSS is not compiled. Please verify $codeRoot\out\main.js exists."
}

if (-not (Test-Path $appExecutable)) {
    throw "The MAEngine Electron executable was not found at $appExecutable."
}

$userDataPath = Join-Path $env:APPDATA 'MAEngine'
$null = New-Item -ItemType Directory -Path $userDataPath -Force

$projectsPath = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'MAEngine Projects'
$null = New-Item -ItemType Directory -Path $projectsPath -Force

$arguments = @(
    '.',
    "--user-data-dir=`"$userDataPath`""
)

# Scrub parent environment variables that cause Electron to run in headless Node or attach to host VS Code
$envClean = @(
    'ELECTRON_RUN_AS_NODE',
    'VSCODE_IPC_HOOK',
    'VSCODE_PID',
    'VSCODE_CWD',
    'VSCODE_CODE_CACHE_PATH',
    'VSCODE_CRASH_REPORTER_PROCESS_TYPE',
    'VSCODE_ESM_ENTRYPOINT',
    'VSCODE_HANDLES_UNCAUGHT_ERRORS',
    'ANTIGRAVITY_VSCODE_HOST'
)
foreach ($v in $envClean) {
    Remove-Item "Env:\$v" -ErrorAction SilentlyContinue
}

$env:NODE_ENV = 'development'
$env:VSCODE_DEV = '1'
$env:VSCODE_CLI = '1'
$env:VSCODE_SKIP_PRELAUNCH = '1'

$process = Start-Process -FilePath $appExecutable `
    -ArgumentList $arguments `
    -WorkingDirectory $codeRoot `
    -PassThru

Write-Host "Started $($product.nameLong) (PID $($process.Id))."

# Ensure the window is brought to the foreground on the user's interactive desktop
Start-Sleep -Seconds 2
$appDef = @'
using System;
using System.Runtime.InteropServices;
public static class WindowActivator {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
}
'@
Add-Type -TypeDefinition $appDef -ErrorAction SilentlyContinue

$deadline = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $deadline) {
    $proc = Get-Process -Name "*MAEngine*" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
    if ($proc) {
        Write-Host "Found MAEngine Window (Handle: $($proc.MainWindowHandle), Title: '$($proc.MainWindowTitle)'). Activating..."
        [WindowActivator]::ShowWindow($proc.MainWindowHandle, 3) # SW_MAXIMIZE
        [WindowActivator]::SetForegroundWindow($proc.MainWindowHandle)
        [WindowActivator]::BringWindowToTop($proc.MainWindowHandle)
        break
    }
    Start-Sleep -Milliseconds 500
}
