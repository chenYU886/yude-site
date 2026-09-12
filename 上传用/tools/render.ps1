# 生成页面截图与渲染自检数据
# 用法：powershell -File tools/render.ps1
# 生成的截图放在 _shot\*.png，DOM 快照放在 _shot\*.dom.html
$ErrorActionPreference = 'SilentlyContinue'

$edge = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edge) { Write-Host "没找到 Edge 或 Chrome，跳过截图。"; exit 1 }

$base = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $base '_shot'
New-Item -ItemType Directory -Force -Path $out | Out-Null

$pages = @(
  @{ n = 'index';    u = 'index.html';                h = 3400 },
  @{ n = 'plugins';  u = 'plugins.html';              h = 2200 },
  @{ n = 'detail';   u = 'plugin.html?id=police-pro'; h = 2600 },
  @{ n = 'services'; u = 'services.html';             h = 2400 },
  @{ n = 'news';     u = 'news.html';                 h = 1600 },
  @{ n = 'about';    u = 'about.html';                h = 2600 }
)

foreach ($p in $pages) {
  $url = 'file:///' + ($base -replace '\\', '/') + '/' + $p.u
  $prof = Join-Path $out 'prof'

  # 截图
  Start-Process -FilePath $edge -NoNewWindow -Wait -ArgumentList @(
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    "--user-data-dir=$prof", "--window-size=1440,$($p.h)",
    '--virtual-time-budget=5000', "--screenshot=$out\$($p.n).png", $url
  ) -RedirectStandardError "$out\_null.txt"

  # DOM 快照（用文件重定向，管道捕获在本机环境下拿不到输出）
  Start-Process -FilePath $edge -NoNewWindow -Wait -ArgumentList @(
    '--headless=new', '--disable-gpu', '--no-sandbox',
    "--user-data-dir=$prof", '--virtual-time-budget=4000', '--dump-dom', $url
  ) -RedirectStandardOutput "$out\$($p.n).dom.html" -RedirectStandardError "$out\$($p.n).err.txt"

  Write-Host "已生成 $($p.n)"
}

Remove-Item -Recurse -Force (Join-Path $out 'prof'), (Join-Path $out '_null.txt') -ErrorAction SilentlyContinue
Write-Host "`n完成。检查渲染结果：node tools/verify-dom.js"
