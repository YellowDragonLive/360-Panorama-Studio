# Target Commit Hash
$targetCommit = "7eaf92a58bd8f47d8cc67095f96c70bffdd24d31"
$outputFile = "diff_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').diff"

Write-Host "Generating diff report for $targetCommit..." -ForegroundColor Cyan

# Execute git diff and redirect to file
git diff $targetCommit HEAD > $outputFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Diff saved to: $outputFile" -ForegroundColor Green
} else {
    Write-Host "Failed. Please check if the commit hash is correct." -ForegroundColor Red
}
