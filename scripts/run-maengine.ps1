$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$codeRoot = Join-Path $repoRoot 'workbench'
$product = Get-Content (Join-Path $codeRoot 'product.json') -Raw | ConvertFrom-Json

$distDir = Join-Path $repoRoot 'VSCode-win32-x64'
$distExe = Join-Path $distDir "$($product.nameShort).exe"
$electronExe = Join-Path $codeRoot ".build\electron\$($product.nameShort).exe"

# Clean up any stale/zombie instances that hold single-instance lock
$existing = Get-Process -Name "$($product.nameShort)" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Closing $($existing.Count) existing $($product.nameShort) process(es)..."
    Stop-Process -Name "$($product.nameShort)" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
}

# Clean stale lockfile
$lockFile = Join-Path $env:APPDATA "$($product.nameShort)\code.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
}

# Scrub parent environment variables that cause Electron to attach to host VS Code or run as node
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
    [Environment]::SetEnvironmentVariable($v, $null, 'Process')
}

if (Test-Path $distExe) {
    # Run the standalone packaged distribution (native Windows desktop app)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $distExe
    $psi.WorkingDirectory = $distDir
    $psi.UseShellExecute = $true

    $process = [System.Diagnostics.Process]::Start($psi)
    Write-Host "Launched $($product.nameLong) (PID $($process.Id))."
} elseif (Test-Path $electronExe) {
    # Development runtime fallback
    $env:NODE_ENV = 'development'
    $env:VSCODE_DEV = '1'
    $env:VSCODE_CLI = '1'
    $env:VSCODE_SKIP_PRELAUNCH = '1'

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $electronExe
    $psi.Arguments = "."
    $psi.WorkingDirectory = $codeRoot
    $psi.UseShellExecute = $true

    $process = [System.Diagnostics.Process]::Start($psi)
    Write-Host "Launched $($product.nameLong) Dev Workbench (PID $($process.Id))."
} else {
    throw "MAEngine executable not found at $distExe or $electronExe."
}
