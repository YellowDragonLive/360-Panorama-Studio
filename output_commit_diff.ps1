param (
    [string]$commitHash = "791d5b7"
)

$outputFile = "commit_$($commitHash)_diff.diff"
Write-Host "Outputting diff for commit $commitHash to $outputFile..." -ForegroundColor Cyan

# Use git show to get specific commit diff
git show $commitHash > $outputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Diff saved to: $outputFile" -ForegroundColor Green
} else {
    Write-Host "Failed. Please check if the commit hash exists." -ForegroundColor Red
}
