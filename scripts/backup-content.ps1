$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $projectRoot "backups"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archive = Join-Path $backupDir "tuyentruyen-content-$timestamp.zip"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$sources = @(
  (Join-Path $projectRoot "content"),
  (Join-Path $projectRoot "uploads"),
  (Join-Path $projectRoot "img")
)
Compress-Archive -LiteralPath $sources -DestinationPath $archive -CompressionLevel Optimal
Write-Output "Đã sao lưu nội dung: $archive"
