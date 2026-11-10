# Creates Desktop and Start Menu shortcuts that start MAEngine
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot 'run-maengine.ps1'
$appExe = Join-Path $repoRoot 'VSCode-win32-x64\MAEngine.exe'
$icon = Join-Path $repoRoot 'workbench\resources\win32\code.ico'
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

$targets = @(
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'MAEngine.lnk'),
    (Join-Path ([Environment]::GetFolderPath('Programs')) 'MAEngine.lnk')
)

$shell = New-Object -ComObject WScript.Shell
foreach ($path in $targets) {
    $shortcut = $shell.CreateShortcut($path)
    $shortcut.TargetPath = $powershell
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
    $shortcut.WorkingDirectory = $repoRoot
    if (Test-Path $icon) {
        $shortcut.IconLocation = "$icon,0"
    } elseif (Test-Path $appExe) {
        $shortcut.IconLocation = "$appExe,0"
    }
    $shortcut.Description = 'MAEngine - Mechanical Analysis Engine Workbench'
    $shortcut.WindowStyle = 7  # minimized, no console flash
    $shortcut.Save()
    Write-Host "Created $path"
}

