param(
  [switch]$Force
)

Set-StrictMode -Version Latest
. "$PSScriptRoot\lcs-local-common.ps1"

$repoRoot = Get-LcsRepoRoot
Set-Location $repoRoot
Ensure-LcsLocalDirectories $repoRoot
Set-LcsProcessEnv $repoRoot | Out-Null

Write-Host "This will overwrite local trial data." -ForegroundColor Yellow
Write-Host "这会覆盖当前本地试运行数据。执行前会自动备份已有 dev.db。"

if (-not $Force) {
  $answer = Read-Host "请输入 RESET 确认重置验收数据库"
  if ($answer -ne "RESET") {
    Write-Host "已取消重置。"
    exit 0
  }
}

$dbPath = Get-LcsDatabasePath $repoRoot
if (Test-Path $dbPath) {
  $backupDir = Get-LcsBackupDirectory $repoRoot
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupPath = Join-Path $backupDir "before-reset-$timestamp.db"
  Copy-Item -LiteralPath $dbPath -Destination $backupPath -Force
  Write-Host "已备份当前数据库：" $backupPath
}

pnpm seed:acceptance
pnpm seed:real-period

Write-Host "验收数据库已重置，包含 2026-04 验收数据和 2026-05 脱敏试运行数据。" -ForegroundColor Green
