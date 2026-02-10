$ErrorActionPreference = "Stop"

Write-Host "STARTING ROBUST GRADLE CLEANUP & BUILD..." -ForegroundColor Green

# 1. STOP ALL JAVA PROCESSES (Fixes file locking)
Write-Host "Stopping any running Java/Gradle daemons..." -ForegroundColor Yellow
Get-Process -Name "java", "openjdk", "gradle" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Go to Android Directory
$projectRoot = "$PSScriptRoot\marwad-native"
Set-Location "$projectRoot\android"

# 3. Clean Gradle Caches Manually
Write-Host "Cleaning .gradle cache..." -ForegroundColor Yellow
if (Test-Path ".gradle") {
    Remove-Item ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "build") {
    Remove-Item "build" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "app\build") {
    Remove-Item "app\build" -Recurse -Force -ErrorAction SilentlyContinue
}

# 4. Run Build with --no-daemon (Prevents locking)
Write-Host "Starting Build (No Daemon)..." -ForegroundColor Cyan
./gradlew assembleRelease --no-daemon

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ BUILD SUCCESS!" -ForegroundColor Green
    Invoke-Item "app\build\outputs\apk\release"
}
else {
    Write-Host "❌ BUILD FAILED" -ForegroundColor Red
}
