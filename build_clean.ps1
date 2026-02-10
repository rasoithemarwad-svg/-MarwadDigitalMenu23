$ErrorActionPreference = "Stop"
$originalRoot = "$PSScriptRoot\marwad-native"
$tempRoot = "C:\Users\lenovo\MarwadTemp"
$distDir = "$originalRoot\dist"

# Cleanup previous temp
if (Test-Path $tempRoot) { 
    Write-Host "Cleaning temp root..."
    cmd /c "rmdir /s /q $tempRoot" 
}
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

# Copy Source (Robocopy is fast and can exclude)
Write-Host "Copying source to $tempRoot..."
$exclude = @("android", "ios", "node_modules", ".git", "dist", ".gradle", "build")
# Robocopy usage: content source dest /xd dirs...
$roboCmd = "robocopy `"$originalRoot`" `"$tempRoot`" /MIR /XD " + ($exclude -join " ")
# Robocopy returns exit codes that are not errors (1=FileCopied). We suppress error checks for it usually.
cmd /c $roboCmd
if ($LASTEXITCODE -ge 8) { throw "Robocopy failed with code $LASTEXITCODE" }

# Map Z:
if (Test-Path "Z:") { cmd /c "subst Z: /d" }
subst Z: "$tempRoot"
Set-Location "Z:\"

# Setup Environment
$toolsDir = "C:\Users\lenovo\tools"
$env:JAVA_HOME = ((Get-ChildItem "$toolsDir\java\jdk-*" | Sort-Object Name -Descending | Select -First 1).FullName)
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# Install Deps
Write-Host "Installing dependencies on Z:..."
npm install

$apps = @("admin", "staff", "delivery")

foreach ($type in $apps) {
    Write-Host "BUILDING: $type"
    $env:APP_TYPE = $type
    
    # Prebuild
    if (Test-Path "android") { cmd /c "rmdir /s /q android" }
    cmd /c "echo y | npx expo prebuild --platform android --no-install"
    
    # Fix SDK Path
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
    $sdkEscaped = $sdkPath -replace "\\", "\\"
    "sdk.dir=$sdkEscaped" | Out-File -FilePath "android\local.properties" -Encoding ascii
    
    # Fix Memory
    $gradleProps = "android\gradle.properties"
    $c = Get-Content $gradleProps
    $c = $c -replace "org.gradle.jvmargs=-Xmx2048m", "org.gradle.jvmargs=-Xmx4096m"
    $c | Set-Content $gradleProps
    
    # Build
    Set-Location "Z:\android"
    $env:GRADLE_OPTS = "-Dorg.gradle.daemon=true -Dorg.gradle.vfs.watch=false"
    ./gradlew assembleRelease
    cmd /c "gradlew --stop"
    Set-Location "Z:\"
    
    # Move APK
    $apk = "android\app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apk) {
        Copy-Item $apk -Destination "$distDir\Marwad-$type.apk" -Force
        Write-Host "SUCCESS: $type APK created" -ForegroundColor Green
    }
    else {
        Write-Host "ERROR: Failed to build $type" -ForegroundColor Red
        exit 1
    }
}

# Cleanup
Set-Location "C:\"
cmd /c "subst Z: /d"
# Optional: Remove tempRoot
# cmd /c "rmdir /s /q $tempRoot"
Write-Host "Build Complete!"
