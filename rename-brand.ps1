# PowerShell script: run in repo root
# Perform case-insensitive replacement of brand name in all source files

Get-ChildItem -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\(node_modules|\.git|dist|build|coverage|playwright-report|test-results)\\?'
} | ForEach-Object {
    try { $content = Get-Content -Raw $_.FullName -ErrorAction Stop } catch { return }
    if ($content -match '(?i)pawon') {
        Copy-Item $_.FullName ($_.FullName + '.bak') -Force
        $new = $content -replace 'Kedai Elvera 57','Kedai Elvera 57' `
                        -replace 'Kedai Elvera 57','kedai elvera 57' `
                        -replace 'Kedai Elvera 57','KEDAI ELVERA 57' `
                        -replace 'kedai-elvera-57','kedai-elvera-57' `
                        -replace 'kedai-elvera-57','Kedai-Elvera-57' `
                        -replace 'kedai_elvera_57','kedai_elvera_57'
        Set-Content -Path $_.FullName -Value $new -Force -Encoding utf8
        Write-Host "Processed $_.FullName"
    }
}

# Rename files containing pawon in name (excluding Java package directories and android files to avoid packages with hyphens)
Get-ChildItem -Recurse -File | Where-Object {
    $_.Name -Match '(?i)pawon' -and $_.FullName -notmatch '\\(node_modules|\.git|dist|build|coverage|playwright-report|test-results|android)\\?'
} | ForEach-Object {
    $newName = $_.Name -replace '(?i)pawon[- ]?[sS]alam','kedai-elvera-57' -replace '(?i)pawon','kedai-elvera-57'
    $newPath = Join-Path $_.DirectoryName $newName
    if (Test-Path $_.FullName) {
        git mv $_.FullName $newPath
        Write-Host "Renamed $_.FullName -> $newPath"
    }
}

