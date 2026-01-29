$ErrorActionPreference = "Stop"
Write-Host "STARTING DEEP CLEAN AND BUILD..." -ForegroundColor Yellow

# 0. Go to Correct Folder
Set-Location "C:\Users\lenovo\Documents\MarwadDigitalMenu\marwad-native"

# 1. Clean Garbage
Write-Host "Deleting old files (Nuclear Method)..." -ForegroundColor Yellow
cmd /c "if exist node_modules rmdir /s /q node_modules"
cmd /c "if exist android rmdir /s /q android"
if (Test-Path "package-lock.json") { Remove-Item -Force package-lock.json }

# 2. Reinstall Fresh
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# 2.5 PATCH EXPO MODULES CORE (Fix for Gradle 8 / RN 0.76)
Write-Host "Patching ExpoModulesCorePlugin.gradle..." -ForegroundColor Yellow
$pluginPath = "node_modules\expo-modules-core\android\ExpoModulesCorePlugin.gradle"
if (Test-Path $pluginPath) {
    (Get-Content $pluginPath) -replace 'from components.release', 'if (components.findByName("release") != null) from components.release' | Set-Content $pluginPath
}

# 3. Generate Android Config
Write-Host "Generating Android Project..." -ForegroundColor Cyan
# Pipe 'y' to auto-accept git warning
cmd /c "echo y | npx expo prebuild --clean --platform android"

# 4. Build APK
Write-Host "Building APK..." -ForegroundColor Green
Set-Location android
./gradlew assembleRelease

Write-Host "SUCCESS! APK is ready." -ForegroundColor Green
Write-Host "Location: android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor Green
