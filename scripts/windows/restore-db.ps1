param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

Set-StrictMode -Version Latest
. "$PSScriptRoot\lcs-local-common.ps1"

$repoRoot = Get-LcsRepoRoot
Set-Location $repoRoot
Ensure-LcsLocalDirectories $repoRoot

$resolvedBackup = Resolve-Path -LiteralPath $BackupPath -ErrorAction Stop
$dbPath = Get-LcsDatabasePath $repoRoot

if (Test-Path $dbPath) {
  $backupDir = Get-LcsBackupDirectory $repoRoot
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $beforeRestorePath = Join-Path $backupDir "before-restore-$timestamp.db"
  Copy-Item -LiteralPath $dbPath -Destination $beforeRestorePath -Force
  Write-Host "恢复前已自动备份当前数据库：" $beforeRestorePath
}

Copy-Item -LiteralPath $resolvedBackup.Path -Destination $dbPath -Force
Write-Host "数据库恢复完成：" -ForegroundColor Green
Write-Host $dbPath
