$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$release = Join-Path $root 'release'

if (Test-Path -LiteralPath $release) {
  $resolvedRoot = [System.IO.Path]::GetFullPath($root)
  $resolvedRelease = [System.IO.Path]::GetFullPath($release)
  if (-not $resolvedRelease.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Release path is outside the project.'
  }
  Remove-Item -LiteralPath $resolvedRelease -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $release | Out-Null
$directories = @('dist', 'server', 'src\shared', 'data', 'node_modules')
foreach ($directory in $directories) {
  Copy-Item -LiteralPath (Join-Path $root $directory) -Destination (Join-Path $release $directory) -Recurse
}

$files = @('package.json', 'package-lock.json', 'start.bat', 'README.md')
foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $release $file)
}

Write-Host "Offline release created: $release"
