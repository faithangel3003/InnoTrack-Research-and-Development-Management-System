[CmdletBinding()]
param(
    [string]$ProjectPath = "InnoTrack.DotNet/InnoTrack.RDMS.Api/InnoTrack.RDMS.Api.csproj",
    [string]$OutputPath = "InnoTrack.DotNet/build-validation/dev-api",
    [string]$Urls = "http://localhost:5110"
)

$ErrorActionPreference = 'Stop'

$normalizedOutputPath = $OutputPath.TrimEnd([char[]]@([char]'\', [char]'/' ))
$outputParent = Split-Path -Path $normalizedOutputPath -Parent
$outputLeaf = Split-Path -Path $normalizedOutputPath -Leaf
$runSuffix = Get-Date -Format 'yyyyMMddHHmmss'
$resolvedOutputPath = Join-Path $outputParent "$outputLeaf-$runSuffix"

if (-not (Test-Path $outputParent)) {
    New-Item -ItemType Directory -Path $outputParent -Force | Out-Null
}

$env:ASPNETCORE_URLS = $Urls

if (Test-Path $normalizedOutputPath) {
    try {
        Remove-Item $normalizedOutputPath -Recurse -Force -ErrorAction Stop
    }
    catch {
        Write-Warning "Skipping cleanup for locked output path '$normalizedOutputPath'."
    }
}

$staleOutputDirectories = Get-ChildItem -Path $outputParent -Directory -Filter "$outputLeaf-*" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 4

foreach ($staleOutputDirectory in $staleOutputDirectories) {
    try {
        Remove-Item $staleOutputDirectory.FullName -Recurse -Force -ErrorAction Stop
    }
    catch {
        Write-Warning "Skipping cleanup for locked output path '$($staleOutputDirectory.FullName)'."
    }
}

Write-Host "Building API to $resolvedOutputPath..."
dotnet build $ProjectPath -p:UseAppHost=false -o $resolvedOutputPath
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

$apiDll = Join-Path $resolvedOutputPath 'InnoTrack.RDMS.Api.dll'

Write-Host "Starting API from $apiDll on $Urls..."
dotnet $apiDll
exit $LASTEXITCODE