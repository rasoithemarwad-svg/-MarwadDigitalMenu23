$ErrorActionPreference = "Stop"

function Build-Delivery {
    Write-Host "----------------------------------------------------------------"
    Write-Host "BUILDING: Delivery App (Fix)" -ForegroundColor Cyan
    Write-Host "----------------------------------------------------------------"

    $env:APP_TYPE = "delivery"
    
    # 1. Expo Prebuild
    Write-Host "Running expo prebuild for delivery..."
    cmd /c "npx expo prebuild --clean --platform android --no-install"
    if ($LASTEXITCODE -ne 0) { Write-Error "Prebuild failed"; exit 1 }

    # 2. Local Properties
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
    $localProps = "android\local.properties"
    if (Test-Path $sdkPath) {
        $sdkPathEscaped = $sdkPath -replace "\\", "\\"
        "sdk.dir=$sdkPathEscaped" | Out-File -FilePath $localProps -Encoding ascii
    }

    # 3. Mount X: Drive
    if (Test-Path "X:\") { cmd /c "subst X: /D" }
    cmd /c "subst X: $PSScriptRoot"
    if (-not (Test-Path "X:\")) { Write-Error "Failed to mount X: drive."; exit 1 }

    try {
        Push-Location "X:\android"
        
        # Clean Gradle
        Write-Host "Cleaning gradle..."
        cmd /c "gradlew --stop"
        if (Test-Path ".gradle") { Remove-Item ".gradle" -Recurse -Force -ErrorAction SilentlyContinue }
        
        # Build
        Write-Host "Assembling Release APK..."
        $tempCache = "$env:TEMP\marwad-gradle-cache"
        if (-not (Test-Path $tempCache)) { New-Item -ItemType Directory -Path $tempCache -Force | Out-Null }
        
        cmd /c "gradlew assembleRelease --no-daemon --project-cache-dir `"$tempCache`" > ..\build_delivery_fix.log 2>&1"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Gradle build exited with error code. Checking log..."
            Get-Content "..\build_delivery_fix.log" -Tail 20
        }
    }
    finally {
        Pop-Location
        cmd /c "subst X: /D"
    }

    # 4. Verify and Copy
    $outputDir = "android\app\build\outputs\apk\release"
    if (Test-Path "$outputDir\app-release.apk") {
        if (-not (Test-Path "..\APKs")) { New-Item -ItemType Directory -Path "..\APKs" -Force | Out-Null }
        $dest = "..\APKs\Marwad-Delivery-Fix.apk"
        Copy-Item "$outputDir\app-release.apk" -Destination $dest -Force
        Write-Host "SUCCESS! Delivery APK created at: $dest" -ForegroundColor Green
    }
    else {
        Write-Error "Delivery APK build completed but file not found. Check build_delivery_fix.log."
    }
}

Build-Delivery
