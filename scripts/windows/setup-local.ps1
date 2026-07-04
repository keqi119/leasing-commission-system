Set-StrictMode -Version Latest
. "$PSScriptRoot\lcs-local-common.ps1"

$repoRoot = Get-LcsRepoRoot
Set-Location $repoRoot

Write-Host "正在准备租赁公司提成系统本地试用环境..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "未找到 Node.js。请先安装 Node.js 20 或更高版本。"
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "未找到 pnpm。请先启用 corepack 或安装 pnpm。"
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "已创建 .env，本地目录和端口可在该文件中调整。"
}

Ensure-LcsLocalDirectories $repoRoot
Set-LcsProcessEnv $repoRoot | Out-Null

Write-Host "正在安装依赖..."
pnpm install

Write-Host "正在生成 Prisma 所需文件..."
pnpm prisma:generate

Write-Host "本地环境准备完成。" -ForegroundColor Green
Write-Host "下一步可执行："
Write-Host "  .\scripts\windows\reset-acceptance-db.ps1"
Write-Host "  .\scripts\windows\start-local.ps1"
