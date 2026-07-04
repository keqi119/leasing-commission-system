Set-StrictMode -Version Latest
. "$PSScriptRoot\lcs-local-common.ps1"

$repoRoot = Get-LcsRepoRoot
Set-Location $repoRoot
$envValues = Read-LcsEnv $repoRoot
$port = $envValues["LCS_APP_PORT"]
$baseUrl = "http://localhost:$port"

$paths = @(
  "/api/health",
  "/commission",
  "/commission/trial-run-checks",
  "/commission/trial-runs",
  "/commission/settlements",
  "/commission/exports"
)

foreach ($path in $paths) {
  $url = "$baseUrl$path"
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
      throw "HTTP $($response.StatusCode)"
    }
    Write-Host "通过：" $url -ForegroundColor Green
  } catch {
    throw "冒烟检查失败：$url。请确认 start-local.ps1 正在运行。错误：$($_.Exception.Message)"
  }
}

Write-Host "本地冒烟检查通过。" -ForegroundColor Green
