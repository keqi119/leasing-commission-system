Set-StrictMode -Version Latest
. "$PSScriptRoot\lcs-local-common.ps1"

$repoRoot = Get-LcsRepoRoot
Set-Location $repoRoot

if (-not (Test-Path ".env")) {
  throw "未找到 .env。请先运行 .\scripts\windows\setup-local.ps1。"
}

$envValues = Set-LcsProcessEnv $repoRoot
$dbPath = Get-LcsDatabasePath $repoRoot
if (-not (Test-Path $dbPath)) {
  throw "未找到本地数据库 $dbPath。请先运行 .\scripts\windows\reset-acceptance-db.ps1。"
}

$port = $envValues["LCS_APP_PORT"]
Write-Host "正在启动租赁公司提成系统..." -ForegroundColor Cyan
Write-Host "访问地址：http://localhost:$port/commission"
Write-Host "停止方式：在当前 PowerShell 窗口按 Ctrl + C。"

pnpm --filter @lcs/web dev -- -p $port
