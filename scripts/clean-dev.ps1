[CmdletBinding()]
param(
    [int[]]$Ports = @(5110, 5174, 5175)
)

$ErrorActionPreference = 'Stop'

$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $Ports -contains $_.LocalPort } |
    Select-Object LocalPort, OwningProcess -Unique |
    Sort-Object LocalPort

if (-not $listeners) {
    Write-Host "No existing dev listeners found on ports: $($Ports -join ', ')."
    exit 0
}

$processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
    if (-not $process) {
        continue
    }

    Write-Host "Stopping PID $processId on dev ports ($($process.Name))."
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

exit 0