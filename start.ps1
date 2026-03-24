# ============================================
# 长清阁麻将 - Windows 一键启动脚本
# ============================================
# 使用方法: 右键 → 用 PowerShell 运行
#           或在终端中: .\start.ps1
# ============================================

$ErrorActionPreference = "Stop"

# 颜色输出
function Ok    { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Fail  { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Info  { param($msg) Write-Host "  ℹ️  $msg" -ForegroundColor Cyan }
function Title { param($msg) Write-Host "`n🔍 $msg" -ForegroundColor White -BackgroundColor DarkCyan }

# ============================================
# 1. 环境检查
# ============================================
Title "环境检查"

$allPass = $true

# Node.js
Write-Host "  Node.js:" -NoNewline
try {
    $nodeVer = node --version 2>&1
    $major = [int]($nodeVer -replace 'v','' -split '\.' | Select-Object -First 1)
    if ($major -ge 20) {
        Ok "版本 $nodeVer"
    } else {
        Fail "版本 $nodeVer (需要 >= 20)"
        $allPass = $false
    }
} catch {
    Fail "未安装。请先安装 Node.js 20+ : https://nodejs.org"
    $allPass = $false
}

# npm
Write-Host "  npm:" -NoNewline
try {
    $npmVer = npm --version 2>&1
    Ok "版本 $npmVer"
} catch {
    Fail "未安装 (通常随 Node.js 一起安装)"
    $allPass = $false
}

# node_modules
Write-Host "  依赖 (node_modules):" -NoNewline
if (Test-Path "node_modules") {
    Ok "已安装"
} else {
    Warn "未安装，即将自动 npm install..."
    $needsInstall = $true
}

# ============================================
# 2. .env 文件检查
# ============================================
Title ".env 文件检查"

if (-not (Test-Path ".env")) {
    Warn "未找到 .env，正在自动创建..."
    $envContent = @"
MONGODB_URI=mongodb://192.168.3.241:27017
MONGODB_DB=changqingge
REDIS_URL=redis://192.168.3.241:6379
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Ok "已创建 .env"
} else {
    Ok ".env 已存在"
}

# 读取并显示 .env 配置
$envLines = Get-Content ".env" | Where-Object { $_ -match "^[A-Z]" -and $_ -notmatch "^#" }
foreach ($line in $envLines) {
    $key = ($line -split '=' | Select-Object -First 1).Trim()
    $val = ($line -split '=' | Select-Object -Skip 1) -join '='
    if ($val) {
        Info "$key = $val"
    } else {
        Warn "$key 未设置"
    }
}

# ============================================
# 3. 连通性测试
# ============================================
Title "连通性测试"

# MongoDB
Write-Host "  MongoDB (192.168.3.241:27017):" -NoNewline
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $result = $tcp.BeginConnect("192.168.3.241", 27017, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(3000)
    $tcp.EndConnect($result)
    $tcp.Close()
    if ($success) {
        Ok "可连通"
    } else {
        Fail "超时 (3s)"
        $allPass = $false
    }
} catch {
    Fail "无法连接。请确认 MongoDB 已启动"
    $allPass = $false
}

# Redis (可选)
Write-Host "  Redis  (192.168.3.241:6379):" -NoNewline
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $result = $tcp.BeginConnect("192.168.3.241", 6379, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(3000)
    $tcp.EndConnect($result)
    $tcp.Close()
    if ($success) {
        Ok "可连通"
    } else {
        Warn "超时，将降级为单机模式 (不影响开发)"
    }
} catch {
    Warn "无法连接，将降级为单机模式 (不影响开发)"
}

# ============================================
# 4. 自动安装依赖
# ============================================
Title "依赖检查"

if ($needsInstall) {
    Info "正在执行 npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Fail "npm install 失败"
        $allPass = $false
    } else {
        Ok "依赖安装完成"
    }
} else {
    Info "跳过 npm install (node_modules 已存在)"
}

# ============================================
# 5. 创建测试用户（可选）
# ============================================
Title "测试用户准备"

Write-Host "  如需在本机创建测试用户，启动后访问:"
Info "http://127.0.0.1:3000/api/test-insert  (每次创建 1 个)"
Info "http://127.0.0.1:3000/login  (选择用户登录)"

# ============================================
# 6. 显示本机 IP（用于手机访问）
# ============================================
Title "网络信息"

$localIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "以太网*", "Wi-Fi*", "Ethernet*", "WLAN*" 2>$null |
    Where-Object { $_.IPAddress -notlike "169.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $localIP) {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike "169.*" -and $_.IPAddress -notlike "127.*" } |
        Select-Object -First 1 -ExpandProperty IPAddress)
}

if ($localIP) {
    Ok "本机 IP: $localIP"
    Info "PC 访问:  http://127.0.0.1:3000/login"
    Info "手机访问: http://${localIP}:3000/login"
    Info "(手机和电脑需在同一 Wi-Fi，手机浏览器打开上方地址)"
    Info "(若手机打不开：Windows 防火墙放行 3000 端口)"
} else {
    Warn "未检测到有效 IPv4，手机访问地址请手动查看 ipconfig"
}

# ============================================
# 7. 总结
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor DarkCyan
if ($allPass) {
    Write-Host "  ✅ 所有检查通过，准备启动！" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  有检查项失败，请先解决上面的问题" -ForegroundColor Yellow
    Write-Host "  解决后再次运行 .\start.ps1" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor DarkCyan
    exit 1
}
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host ""

# ============================================
# 8. 启动开发服务器
# ============================================
Write-Host "🚀 正在启动 Nuxt 开发服务器 (允许局域网访问)..." -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "   按 Ctrl+C 停止服务器" -ForegroundColor Gray
Write-Host ""

# 给手机访问用 --host 0.0.0.0
npx nuxt dev --host 0.0.0.0 --port 3000
