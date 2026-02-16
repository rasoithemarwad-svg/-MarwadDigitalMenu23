$ErrorActionPreference = "Stop"

Write-Host "Building DEBUG APK without clean (using existing android folder)" -ForegroundColor Cyan

# 1. Ensure local.properties
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$localProps = "android\local.properties"
if (Test-Path $sdkPath) {
    $sdkPathEscaped = $sdkPath -replace "\\", "\\"
    "sdk.dir=$sdkPathEscaped" | Out-File -FilePath $localProps -Encoding ascii
    Write-Host "Created local.properties."
}

# 2. Build DEBUG APK using virtual drive to avoid path issues
Write-Host "Mapping to X: drive..."
cmd /c "subst X: $PSScriptRoot"

try {
    Push-Location "X:\android"
    
    Write-Host "Building Debug APK..."
    .\gradlew assembleDebug --no-daemon
    
    Pop-Location
}
finally {
    cmd /c "subst X: /D"
}

# 3. Copy output
$outputApk = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $outputApk) {
    if (-not (Test-Path "APKs")) { New-Item -ItemType Directory -Path "APKs" -Force | Out-Null }
    
    $dest = "APKs\Marwad-Universal-Debug.apk"
    Copy-Item $outputApk -Destination $dest -Force
    Write-Host "SUCCESS! Debug APK created at: $dest" -ForegroundColor Green
    Write-Host "Full Path: $((Resolve-Path $dest).Path)" -ForegroundColor Yellow
}
else {
    Write-Error "Debug APK not found!"
}
