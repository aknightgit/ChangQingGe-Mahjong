# ============================================
# ChangQingGe Mahjong - Windows Startup Script
# ============================================

$ErrorActionPreference = "Stop"

function Ok    { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "  [!!] $msg" -ForegroundColor Yellow }
function Fail  { param($msg) Write-Host "  [XX] $msg" -ForegroundColor Red }
function Info  { param($msg) Write-Host "  [--] $msg" -ForegroundColor Cyan }
function Title { param($msg) Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor White -BackgroundColor DarkCyan }

$allPass = $true

# 1. Node.js
Title "Environment Check"

Write-Host "  Node.js:" -NoNewline
try {
    $nodeVer = node --version 2>&1
    $major = [int]($nodeVer -replace 'v','' -split '\.' | Select-Object -First 1)
    if ($major -ge 20) { Ok "version $nodeVer" } else { Fail "version $nodeVer (need >= 20)"; $allPass = $false }
} catch { Fail "not installed. Install Node.js 20+ from https://nodejs.org"; $allPass = $false }

# npm
Write-Host "  npm:" -NoNewline
try { $npmVer = npm --version 2>&1; Ok "version $npmVer" } catch { Fail "not installed"; $allPass = $false }

# node_modules
Write-Host "  node_modules:" -NoNewline
if (Test-Path "node_modules") { Ok "exists" } else { Warn "missing, will npm install"; $needsInstall = $true }

# 2. .env
Title "Config Check"

if (-not (Test-Path ".env")) {
    Warn ".env not found, creating..."
    $envContent = @"
MONGODB_URI=mongodb://admin:%24%249myHome@192.168.3.241:27017/changqingge?authSource=admin
MONGODB_DB=changqingge
REDIS_URL=redis://192.168.3.241:6379
"@
    $envContent | Out-File -FilePath ".env" -Encoding utf8
    Ok ".env created"
} else {
    Ok ".env exists"
}

$envLines = Get-Content ".env" | Where-Object { $_ -match "^[A-Z]" -and $_ -notmatch "^#" }
foreach ($line in $envLines) {
    $key = ($line -split '=' | Select-Object -First 1).Trim()
    $val = ($line -split '=' | Select-Object -Skip 1) -join '='
    if ($val) { Info "$key = $val" } else { Warn "$key not set" }
}

# 3. Connectivity
Title "Connectivity Check"

Write-Host "  MongoDB (192.168.3.241:27017):" -NoNewline
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $result = $tcp.BeginConnect("192.168.3.241", 27017, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(3000)
    $tcp.EndConnect($result); $tcp.Close()
    if ($success) { Ok "reachable" } else { Fail "timeout"; $allPass = $false }
} catch { Fail "cannot connect"; $allPass = $false }

Write-Host "  Redis  (192.168.3.241:6379):" -NoNewline
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $result = $tcp.BeginConnect("192.168.3.241", 6379, $null, $null)
    $success = $result.AsyncWaitHandle.WaitOne(3000)
    $tcp.EndConnect($result); $tcp.Close()
    if ($success) { Ok "reachable" } else { Warn "timeout, will fallback to single-server mode" }
} catch { Warn "cannot connect, will fallback to single-server mode" }

# 4. Install deps
Title "Dependencies"

if ($needsInstall) {
    Info "Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed"; $allPass = $false } else { Ok "done" }
} else {
    Info "skip npm install (node_modules exists)"
}

# 5. Test user info
Title "Test Users"

Info "Create test users at: http://127.0.0.1:3000/api/test-insert"
Info "Login at: http://127.0.0.1:3000/login"

# 6. Local IP
Title "Network Info"

$localIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*", "Wi-Fi*", "WLAN*" 2>$null |
    Where-Object { $_.IPAddress -notlike "169.*" } | Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $localIP) {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notlike "169.*" -and $_.IPAddress -notlike "127.*" } |
        Select-Object -First 1 -ExpandProperty IPAddress)
}

if ($localIP) {
    Ok "Local IP: $localIP"
    Info "PC:    http://127.0.0.1:3000/login"
    Info "Phone: http://${localIP}:3000/login"
    Info "(same WiFi required, open firewall port 3000 if needed)"
} else {
    Warn "Could not detect local IP"
}

# 7. Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor DarkCyan
if ($allPass) {
    Write-Host "  All checks passed! Starting server..." -ForegroundColor Green
} else {
    Write-Host "  Some checks failed. Fix issues above then run start.ps1 again." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor DarkCyan
    exit 1
}
Write-Host "========================================" -ForegroundColor DarkCyan
Write-Host ""

# 8. Start dev server
Write-Host "Starting Nuxt dev server (LAN accessible)..." -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

npx nuxt dev --host 0.0.0.0 --port 3000
