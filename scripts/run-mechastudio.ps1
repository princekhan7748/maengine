$ErrorActionPreference = 'Stop'

$mechastudioRoot = Split-Path -Parent $PSScriptRoot
$codeRoot = Join-Path $mechastudioRoot 'workbench'
$product = Get-Content (Join-Path $codeRoot 'product.json') -Raw | ConvertFrom-Json
$electronDirectory = Join-Path $codeRoot '.build\electron'
$appExecutable = Join-Path $electronDirectory "$($product.nameShort).exe"
$iconPath = Join-Path $codeRoot 'resources\win32\code.ico'
$productPath = Join-Path $codeRoot 'product.json'

if (-not (Test-Path (Join-Path $codeRoot 'out\main.js'))) {
    throw "Code - OSS is not compiled. Please verify $codeRoot\out\main.js exists."
}

if (-not (Test-Path $appExecutable)) {
    $cachedElectron = Join-Path $electronDirectory 'Code - OSS.exe'
    if (-not (Test-Path $cachedElectron)) {
        $cachedElectron = Join-Path $electronDirectory 'SAEngine.exe'
    }
    if (-not (Test-Path $cachedElectron)) {
        throw "The Electron runtime is missing from $electronDirectory."
    }
    Copy-Item -LiteralPath $cachedElectron -Destination $appExecutable
}

$userDataPath = Join-Path $env:APPDATA 'MechaStudio'
$null = New-Item -ItemType Directory -Path $userDataPath -Force

$projectsPath = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'MechaStudio Projects'
$null = New-Item -ItemType Directory -Path $projectsPath -Force

$arguments = @(
    '.',
    "--user-data-dir=`"$userDataPath`""
)

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
