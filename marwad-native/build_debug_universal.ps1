$ErrorActionPreference = "Stop"

Write-Host "Building UNIVERSAL DEBUG APK (works for all roles)" -ForegroundColor Cyan

# 1. Run Expo Prebuild
Write-Host "Running expo prebuild..."
npx expo prebuild --clean --platform android --no-install

# 2. Ensure local.properties
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$localProps = "android\local.properties"
if (Test-Path $sdkPath) {
    $sdkPathEscaped = $sdkPath -replace "\\", "\\"
    "sdk.dir=$sdkPathEscaped" | Out-File -FilePath $localProps -Encoding ascii
    Write-Host "Created local.properties."
}

# 3. Build DEBUG APK (no signing required)
Write-Host "Building Debug APK..."
cd android
.\gradlew assembleDebug --no-daemon
cd ..

# 4. Copy output
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
