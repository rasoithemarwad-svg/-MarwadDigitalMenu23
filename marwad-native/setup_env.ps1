$ErrorActionPreference = "Stop"

function Install-WingetPackage {
    param (
        [string]$Id,
        [string]$Name
    )
    Write-Host "Checking for $Name..."
    $package = winget list --id $Id --exact
    if (-not $package) {
        Write-Host "Installing $Name..."
        winget install --id $Id --exact --accept-package-agreements --accept-source-agreements --silent
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install $Name. Exit code: $LASTEXITCODE"
        }
    }
    else {
        Write-Host "$Name is already installed."
    }
}

# 1. Install OpenJDK 17
Install-WingetPackage -Id "Microsoft.OpenJDK.17" -Name "OpenJDK 17"

# 3. Set Environment Variables
Write-Host "Configuring Environment Variables..."

# JAVA_HOME - Using Android Studio's bundled JDK (JBR)
$javaPath = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $javaPath) {
    [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaPath, [System.EnvironmentVariableTarget]::User)
    Write-Host "JAVA_HOME set to $javaPath"
}
else {
    Write-Error "Could not find Android Studio bundled JDK at $javaPath"
}

# ANDROID_HOME
$androidHome = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $androidHome) {
    [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, [System.EnvironmentVariableTarget]::User)
    Write-Host "ANDROID_HOME set to $androidHome"
}
else {
    Write-Error "Could not find Android SDK at $androidHome"
}

# Add to PATH
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
$newPaths = @("$javaPath\bin", "$androidHome\platform-tools", "$androidHome\cmdline-tools\latest\bin")

foreach ($p in $newPaths) {
    if ($currentPath -notlike "*$p*") {
        $currentPath += ";$p"
    }
}

[System.Environment]::SetEnvironmentVariable("Path", $currentPath, [System.EnvironmentVariableTarget]::User)
Write-Host "Updated Path environment variable."

Write-Host "Setup complete. Environment variables have been updated persistently."
