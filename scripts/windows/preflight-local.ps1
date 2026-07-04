Set-StrictMode -Version Latest
. "$PSScriptRoot\lcs-local-common.ps1"

$repoRoot = Get-LcsRepoRoot
Set-Location $repoRoot

if ($repoRoot -ne "D:\leasing-commission-system") {
  throw "当前目录不是 D:\leasing-commission-system。请切换到固定工作区后再运行。"
}

if ($repoRoot -like "*OneDrive*" -or $repoRoot -like "D:\Projects*") {
  throw "当前目录位于禁止使用的位置。"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "未找到 Node.js。" }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw "未找到 pnpm。" }
if (-not (Test-Path ".env")) { throw "未找到 .env，请先运行 setup-local.ps1。" }

Ensure-LcsLocalDirectories $repoRoot
Set-LcsProcessEnv $repoRoot | Out-Null

$dbPath = Get-LcsDatabasePath $repoRoot
if (-not (Test-Path $dbPath)) {
  throw "未找到本地数据库 $dbPath，请先运行 reset-acceptance-db.ps1。"
}

$probe = Join-Path (Get-LcsBackupDirectory $repoRoot) ".write-test"
Set-Content -LiteralPath $probe -Value "ok"
Remove-Item -LiteralPath $probe -Force

pnpm prisma:validate
pnpm build

Write-Host "本地试用 preflight 检查通过。" -ForegroundColor Green
