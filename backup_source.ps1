$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$backupName = "Marwad_Source_Backup_$timestamp.zip"
$sourceDir = "c:\Users\lenovo\Documents\MarwadDigitalMenu"
$destination = Join-Path $sourceDir $backupName

Write-Host "Creating backup: $destination"

# Create a temporary directory for staging
$tempDir = Join-Path $env:TEMP "MarwadBackup_$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy source files (excluding heavy folders)
$exclude = @("node_modules", ".git", "android", "ios", "dist", "coverage", ".gradle", "APKs", "*.apk", "*.log")

Get-ChildItem -Path $sourceDir -Exclude $exclude | ForEach-Object {
    $targetPath = Join-Path $tempDir $_.Name
    if ($_.PSIsContainer) {
        # Recursive copy for directories, manually implementing exclusion logic
        Copy-Item -Path $_.FullName -Destination $targetPath -Recurse -Force
        
        # Remove nested excluded folders from the copy
        foreach ($ex in $exclude) {
            Get-ChildItem -Path $targetPath -Recurse -Filter $ex -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
        }
    }
    else {
        Copy-Item -Path $_.FullName -Destination $targetPath -Force
    }
}

# Add the specific generated APKs to the backup (they are valuable)
$apkDir = Join-Path $tempDir "APKs"
New-Item -ItemType Directory -Path $apkDir -Force | Out-Null
Copy-Item -Path "$sourceDir\APKs\*.apk" -Destination $apkDir -ErrorAction SilentlyContinue

# Create Zip
Compress-Archive -Path "$tempDir\*" -DestinationPath $destination -Force

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Backup Complete: $destination"
