$ErrorActionPreference = "Stop"

Write-Host "STARTING AUTOMATED BUILD SETUP (ALL VERSIONS)..." -ForegroundColor Green

# 1. Setup Directories
$toolsDir = "C:\Users\lenovo\tools"
$javaDir = "$toolsDir\java"
New-Item -ItemType Directory -Force -Path $javaDir | Out-Null

# 2. Download JDK if not exists
$zipFile = "$toolsDir\jdk17.zip"
$zipUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.zip"

if (-not (Test-Path "$javaDir\jdk-17.0.10+7")) {
    Write-Host "Downloading Portable Java (JDK 17)..." -ForegroundColor Yellow
    Import-Module BitsTransfer
    Start-BitsTransfer -Source $zipUrl -Destination $zipFile
    Write-Host "Extracting Java..." -ForegroundColor Yellow
    Expand-Archive -LiteralPath $zipFile -DestinationPath $javaDir -Force
    Remove-Item $zipFile
}

# 3. Configure Java Environment
$jdkRoot = Get-ChildItem -Path $javaDir -Directory | Where-Object { $_.Name -like "jdk-*" } | Select-Object -First 1
$env:JAVA_HOME = $jdkRoot.FullName
$env:PATH = $jdkRoot.FullName + "\bin;" + $env:PATH
Write-Host "Environment Configured:" -ForegroundColor Green
java -version

# 4. Build Loop for 3 Versions
$apps = @("admin", "staff", "delivery")
$projectRoot = "C:\Users\lenovo\Documents\MarwadDigitalMenu\marwad-native"
$outputDir = "$projectRoot\android\app\build\outputs\apk\release"

foreach ($type in $apps) {
    Write-Host "`n----------------------------------------" -ForegroundColor Cyan
    Write-Host "BUILDING: MARWAD $trype" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    
    # Set Environment Variable for app.config.js
    $env:APP_TYPE = $type
    
    Set-Location $projectRoot
    
    # Prebuild (Generates Android Code)
    Write-Host "Running expo prebuild ($type)..."
    cmd /c "npx expo prebuild --clean --platform android --no-install"
    
    # Build APK
    Set-Location "$projectRoot\android"
    Write-Host "Compiling APK..."
    ./gradlew assembleRelease
    
    # Rename and Move
    if (Test-Path "$outputDir\app-release.apk") {
        $finalName = "Marwad-$type.apk"
        Move-Item -Path "$outputDir\app-release.apk" -Destination "$outputDir\$finalName" -Force
        Write-Host "✅ SUCCESS: $finalName created!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ ERROR: Build failed for $type" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n----------------------------------------" -ForegroundColor Green
Write-Host "ALL BUILDS COMPLETE!" -ForegroundColor Green
Write-Host "Find your APKs here: $outputDir" -ForegroundColor White
Invoke-Item $outputDir
