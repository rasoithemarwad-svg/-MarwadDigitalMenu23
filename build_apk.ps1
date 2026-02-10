$ErrorActionPreference = "Stop"

Write-Host "STARTING NUCLEAR BUILD (ALL VERSIONS)..." -ForegroundColor Green

# 0. KILL EVERYTHING (Force kill to release locks)
Write-Host "Killing processes..." -ForegroundColor Yellow
Get-Process -Name "java", "openjdk", "gradle", "adb", "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 1. Setup Directories
$toolsDir = "C:\Users\lenovo\tools"
$javaDir = "$toolsDir\java"
New-Item -ItemType Directory -Force -Path $javaDir | Out-Null

# 2. Download JDK if not exists
$zipFile = "$toolsDir\jdk17.zip"
$zipUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.zip"

if (-not (Test-Path "$javaDir\jdk-17.0.10+7")) {
    Write-Host "Downloading JDK 17..."
    Import-Module BitsTransfer
    Start-BitsTransfer -Source $zipUrl -Destination $zipFile
    Expand-Archive -LiteralPath $zipFile -DestinationPath $javaDir -Force
    Remove-Item $zipFile
}

# 3. Configure Java
$jdkRoot = Get-ChildItem -Path $javaDir -Directory | Where-Object { $_.Name -like "jdk-*" } | Select-Object -First 1
$env:JAVA_HOME = $jdkRoot.FullName
$env:PATH = $jdkRoot.FullName + "\bin;" + $env:PATH
java -version

# 4. NUCLEAR CLEAN & INSTALL (Once)
$projectRoot = "$PSScriptRoot\marwad-native"
Set-Location $projectRoot

Write-Host "Skipping aggressive delete (likely locked). Overwriting..." -ForegroundColor Yellow
# cmd /c "if exist node_modules rmdir /s /q node_modules"
cmd /c "if exist android rmdir /s /q android"
if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue }

Write-Host "Installing Dependencies..." -ForegroundColor Cyan
npm install

# 5. Build Loop
$apps = @("admin", "staff", "delivery")
$distDir = "$projectRoot\dist"
if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
$outputDir = "$projectRoot\android\app\build\outputs\apk\release"

foreach ($type in $apps) {
    Write-Host "`n----------------------------------------" -ForegroundColor Cyan
    Write-Host "BUILDING: MARWAD $type" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    
    $env:APP_TYPE = $type
    Set-Location $projectRoot
    
    # FIX: Increase Node memory to prevent OOM during bundling
    $env:NODE_OPTIONS = "--max-old-space-size=4096"

    # Prebuild
    if (Test-Path "android") { cmd /c "rmdir /s /q android" }
    if (Test-Path "ios") { cmd /c "rmdir /s /q ios" }
    Write-Host "Running expo prebuild ($type)..."
    # We pipe 'y' to handle any prompts, though fresh install shouldn't have many
    cmd /c "echo y | npx expo prebuild --platform android --no-install"
    
    # Fix SDK Path
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $sdkPath) {
        $localProps = "$projectRoot\android\local.properties"
        $sdkPathEscaped = $sdkPath -replace "\\", "\\"
        "sdk.dir=$sdkPathEscaped" | Out-File -FilePath $localProps -Encoding ascii
    }

    # FIX: Increase Gradle Memory (Persistent across prebuilds)
    $gradleProps = "$projectRoot\android\gradle.properties"
    if (Test-Path $gradleProps) {
        $content = Get-Content $gradleProps
        $content = $content -replace "org.gradle.jvmargs=-Xmx2048m", "org.gradle.jvmargs=-Xmx4096m"
        $content | Set-Content $gradleProps
        Write-Host "Updated Gradle heap to 4GB" -ForegroundColor Yellow
    }
    
    # Build APK
    if (Test-Path "Z:") { cmd /c "subst Z: /d" }
    subst Z: $projectRoot
    Set-Location "Z:\android"
    
    Write-Host "Cleaning Gradle..."
    cmd /c "gradlew --stop"
    if (Test-Path ".gradle") { Remove-Item ".gradle" -Recurse -Force -ErrorAction SilentlyContinue }
    
    Write-Host "Compiling ($type)..."
    # Build (with info for debugging)
    $env:GRADLE_OPTS = "-Dorg.gradle.daemon=true -Dorg.gradle.vfs.watch=false"
    ./gradlew assembleRelease --info
    cmd /c "gradlew --stop"
    
    Set-Location $projectRoot
    cmd /c "subst Z: /d"
    
    # Move APK
    if (Test-Path "$outputDir\app-release.apk") {
        $finalName = "Marwad-$type.apk"
        Move-Item -Path "$outputDir\app-release.apk" -Destination "$distDir\$finalName" -Force
        Write-Host "SUCCESS: $finalName moved to dist" -ForegroundColor Green
    }
    else {
        Write-Host "ERROR: Build failed for $type" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nALL DONE!" -ForegroundColor Green
Invoke-Item $outputDir
