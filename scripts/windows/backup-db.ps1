Set-StrictMode -Version Latest
. "$PSScriptRoot\lcs-local-common.ps1"

$repoRoot = Get-LcsRepoRoot
Set-Location $repoRoot
Ensure-LcsLocalDirectories $repoRoot

$dbPath = Get-LcsDatabasePath $repoRoot
if (-not (Test-Path $dbPath)) {
  throw "未找到本地数据库 $dbPath，无法备份。"
}

$backupDir = Get-LcsBackupDirectory $repoRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupDir "dev-$timestamp.db"
Copy-Item -LiteralPath $dbPath -Destination $backupPath -Force

Write-Host "数据库备份完成：" -ForegroundColor Green
Write-Host $backupPath
