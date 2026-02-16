$ErrorActionPreference = "Stop"

Write-Host "Starting Build Process for ALL APKs..." -ForegroundColor Cyan

# Check if we are in the correct directory
if (-not (Test-Path "build_admin_manual.ps1")) {
    Write-Error "Please run this script from the 'marwad-native' directory."
    exit 1
}

# Ensure APKs directory exists
$apksDir = "..\APKs"
if (-not (Test-Path $apksDir)) {
    New-Item -ItemType Directory -Path $apksDir -Force | Out-Null
}

function Build-APK {
    param (
        [string]$Type,
        [string]$Script
    )

    Write-Host "`n-------------------------------------------"
    Write-Host " Building $Type APK"
    Write-Host "-------------------------------------------"
    
    # Run the build script
    & .\$Script
    if ($LASTEXITCODE -ne 0) { throw "$Type build script failed" }

    # Manual Copy Step to be absolutely sure
    $sourcePath = "android\app\build\outputs\apk\release\app-release.apk"
    $destPath = "$apksDir\Marwad-$Type.apk"

    if (Test-Path $sourcePath) {
        Write-Host "Copying $Type APK to destination..."
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "SUCCESS: $destPath" -ForegroundColor Green
    } else {
        Write-Warning "Could not find apk at $sourcePath. The build script might have moved it already."
    }
}

try {
    Build-APK -Type "Admin" -Script "build_admin_manual.ps1"
    Build-APK -Type "Staff" -Script "build_staff_manual.ps1"
    Build-APK -Type "Delivery" -Script "build_delivery_manual.ps1"

    Write-Host "`n==========================================="
    Write-Host " ALL BUILDS COMPLETED SUCCESSFULLY!"
    Write-Host " APKs are located in: C:\Users\lenovo\Documents\MarwadDigitalMenu\APKs"
    Write-Host "===========================================" -ForegroundColor Green
}
catch {
    Write-Error "Build Process Failed: $_"
    exit 1
}

Write-Host "Press any key to exit..."
# Auto-exit for automation
