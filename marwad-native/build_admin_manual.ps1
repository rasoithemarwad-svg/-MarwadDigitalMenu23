$ErrorActionPreference = "Stop"

# Set APP_TYPE for app.config.js - CHANGED TO ADMIN
$env:APP_TYPE = "admin"
Write-Host "Building for APP_TYPE: $env:APP_TYPE" -ForegroundColor Cyan

# 1. Run Expo Prebuild
Write-Host "Running expo prebuild..."
cmd /c "npx expo prebuild --clean --platform android --no-install"

# 2. Ensure local.properties for SDK location
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
$localProps = "android\local.properties"
if (Test-Path $sdkPath) {
    $sdkPathEscaped = $sdkPath -replace "\\", "\\"
    "sdk.dir=$sdkPathEscaped" | Out-File -FilePath $localProps -Encoding ascii
    Write-Host "Created local.properties."
}
else {
    Write-Warning "Android SDK not found at $sdkPath. Build might fail."
}

# 3. Build with Gradle
# Use virtual drive to avoid MAX_PATH issues
Write-Host "Mapping project to X: drive to shorten paths..."
cmd /c "subst X: $PSScriptRoot"
if (-not (Test-Path "X:\")) { Write-Error "Failed to mount X: drive."; exit 1 }

try {
    Push-Location "X:\android"

    # Clean gradle cache (Robust method for Windows)
    Write-Host "Cleaning Gradle Cache..."
    cmd /c "gradlew --stop"
    if (Test-Path ".gradle") {
        Write-Host "Removing .gradle folder..."
        Remove-Item ".gradle" -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host "Assembling Release APK..."
    $tempCache = "$env:TEMP\marwad-gradle-cache"
    if (-not (Test-Path $tempCache)) { New-Item -ItemType Directory -Path $tempCache -Force | Out-Null }

    ./gradlew assembleRelease --no-daemon --project-cache-dir "$tempCache"
}
finally {
    Pop-Location
    cmd /c "subst X: /D"
}

# 4. Check Output
$outputDir = "app\build\outputs\apk\release"
# Fix: Look for recursive APK/JSON file to confirm success more reliably if name changes
if (Test-Path "$outputDir\*.apk") {
    $dest = "..\..\Marwad-Admin-Manual.apk"
    # Move the app-release.apk to destination
    $builtApk = Get-ChildItem "$outputDir\*.apk" | Select-Object -First 1
    Copy-Item $builtApk.FullName -Destination $dest -Force
    Write-Host "SUCCESS! APK created at: $dest" -ForegroundColor Green
    Invoke-Item $dest
}
else {
    Write-Error "APK not found. Build failed."
}
