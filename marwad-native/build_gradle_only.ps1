$ErrorActionPreference = "Stop"

# Set APP_TYPE for app.config.js
$env:APP_TYPE = "delivery"
Write-Host "Building for APP_TYPE: $env:APP_TYPE" -ForegroundColor Cyan

# Force unmount X: if exists
if (Test-Path "X:\") {
    Write-Host "Unmounting existing X: drive..."
    cmd /c "subst X: /D"
}

# 3. Build with Gradle
# Use virtual drive to avoid MAX_PATH issues
Write-Host "Mapping project to X: drive..."
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

    # Capture output to log file in the X: drive (which is effectively local)
    # redirecting both stdout and stderr
    cmd /c "gradlew assembleRelease --no-daemon --stacktrace --project-cache-dir `"$tempCache`" > ..\build_fast.log 2>&1"
    
    # Check if gradlew failed by checking file content for "BUILD FAILED" or exist code
    # cmd exit code logic in powershell is tricky with redirection, so we check logs or apk.
}
finally {
    Pop-Location
    cmd /c "subst X: /D"
}

# 4. Check Output
$outputDir = "app\build\outputs\apk\release"
if (Test-Path "$outputDir\app-release.apk") {
    # Ensure APKs directory exists
    if (-not (Test-Path "..\APKs")) { New-Item -ItemType Directory -Path "..\APKs" -Force | Out-Null }

    $dest = "..\APKs\Marwad-Delivery-Fresh.apk"
    Copy-Item "$outputDir\app-release.apk" -Destination $dest -Force
    Write-Host "SUCCESS! APK created at: $dest" -ForegroundColor Green
}
else {
    Write-Error "APK not found. Build failed. Check build_fast.log for details."
}
