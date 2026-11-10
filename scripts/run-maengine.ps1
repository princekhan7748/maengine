$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$codeRoot = Join-Path $repoRoot 'workbench'
$product = Get-Content (Join-Path $codeRoot 'product.json') -Raw | ConvertFrom-Json
$distExe = Join-Path $repoRoot "VSCode-win32-x64\$($product.nameShort).exe"
$electronExe = Join-Path $codeRoot ".build\electron\$($product.nameShort).exe"

if (Test-Path $electronExe) {
    $appExecutable = $electronExe
} elseif (Test-Path $distExe) {
    $appExecutable = $distExe
} else {
    throw "The MAEngine executable was not found at $electronExe or $distExe."
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
