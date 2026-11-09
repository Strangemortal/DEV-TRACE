# Enterprise E2E Test Suite for DEV-TRACE Platform
$BASE_URL = "http://localhost:3000"
$ADMIN_COOKIES = "$PSScriptRoot\admin_cookies.txt"
$CAND_COOKIES = "$PSScriptRoot\cand_cookies.txt"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   🧪 DEV-TRACE - FULL ENTERPRISE E2E VERIFICATION SUITE" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$allPassed = $true

function Assert-Step($title, $success, $details) {
    if ($success) {
        Write-Host "  ✅ PASS: $title" -ForegroundColor Green
        if ($details) { Write-Host "     ↳ $details" -ForegroundColor DarkGray }
    } else {
        Write-Host "  ❌ FAIL: $title" -ForegroundColor Red
        if ($details) { Write-Host "     ↳ $details" -ForegroundColor Yellow }
        $script:allPassed = $false
    }
}

# 1. Check Unauthenticated Auth Status
Write-Host "[1/11] Checking unauthenticated session state..." -ForegroundColor Yellow
$meRes = curl.exe -s "$BASE_URL/api/auth/me" | ConvertFrom-Json
Assert-Step "Public auth/me returns null user" ($meRes.user -eq $null) ($meRes | ConvertTo-Json -Compress)

# 2. Authenticate as Staff Administrator
Write-Host "[2/11] Authenticating as Staff Admin..." -ForegroundColor Yellow
$adminPayload = '{"userId":"admin","password":"password123","loginType":"staff"}'
$adminRes = curl.exe -s -c $ADMIN_COOKIES -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d $adminPayload | ConvertFrom-Json
Assert-Step "Admin login succeeds with 'admin' role" ($adminRes.success -eq $true -and $adminRes.role -eq "admin") ($adminRes | ConvertTo-Json -Compress)

# 3. Provision a New Candidate
Write-Host "[3/11] Provisioning a fresh candidate via Admin API..." -ForegroundColor Yellow
$newCandPayload = '{"name":"Priya Sharma","userId":"priya_test","assignedRepoId":"python-challenge"}'
$createRes = curl.exe -s -b $ADMIN_COOKIES -X POST "$BASE_URL/api/admin/candidates" -H "Content-Type: application/json" -d $newCandPayload | ConvertFrom-Json
$candPassword = $createRes.candidate.passwordHash
$candId = $createRes.candidate.id
Assert-Step "Candidate created with generated access key" ($createRes.candidate.userId -eq "priya_test" -and $candPassword.Length -ge 6) "Password: $candPassword | ID: $candId"

# 4. Authenticate as Candidate
Write-Host "[4/11] Authenticating as Candidate in Candidate Portal..." -ForegroundColor Yellow
$candLoginPayload = "{`"userId`":`"priya_test`",`"password`":`"$candPassword`",`"loginType`":`"candidate`"}"
$candRes = curl.exe -s -c $CAND_COOKIES -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d $candLoginPayload | ConvertFrom-Json
Assert-Step "Candidate login succeeds and receives assigned repo" ($candRes.success -eq $true -and $candRes.assignedRepoId -eq "python-challenge") ($candRes | ConvertTo-Json -Compress)

# 5. Execute Python Code in Sandbox
Write-Host "[5/11] Executing Python code in sandbox..." -ForegroundColor Yellow
$pyPayload = '{"language":"python","code":"print(''DEVTRACE_SANDBOX_SUCCESS_PY'')\nx = sum([10, 20, 30])\nprint(''Sum:'', x)"}'
$pyRes = curl.exe -s -X POST "$BASE_URL/api/execute" -H "Content-Type: application/json" -d $pyPayload | ConvertFrom-Json
Assert-Step "Python execution output matches expected sum" ($pyRes.output -like "*DEVTRACE_SANDBOX_SUCCESS_PY*" -and $pyRes.output -like "*Sum: 60*") ($pyRes.output.Trim())

# 6. Execute C++ Code in Sandbox
Write-Host "[6/11] Executing C++ code in sandbox..." -ForegroundColor Yellow
$cppPayload = '{"language":"cpp","code":"#include <iostream>\nint main() { std::cout << \"DEVTRACE_SANDBOX_SUCCESS_CPP\"; return 0; }"}'
$cppRes = curl.exe -s -X POST "$BASE_URL/api/execute" -H "Content-Type: application/json" -d $cppPayload | ConvertFrom-Json
Assert-Step "C++ execution compiles and runs" ($cppRes.output -like "*DEVTRACE_SANDBOX_SUCCESS_CPP*") ($cppRes.output.Trim())

# 7. Stream Real-Time Telemetry from Candidate IDE
Write-Host "[7/11] Streaming Real-Time Telemetry from Candidate IDE..." -ForegroundColor Yellow
$livePayload = @{
    stability = 95
    duration = 45
    activeFile = "main.py"
    eventCount = 120
    tabSwitches = 0
    fullscreenEscapes = 0
    recentEvents = @(
        @{ type = "KEYSTROKE"; ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); meta = @{ char = "p" } }
    )
} | ConvertTo-Json -Depth 5
$liveRes = curl.exe -s -b $CAND_COOKIES -X POST "$BASE_URL/api/telemetry/live" -H "Content-Type: application/json" -d $livePayload | ConvertFrom-Json
Assert-Step "Live telemetry streams active heartbeat" ($liveRes.success -eq $true -and $liveRes.status -eq "active") ($liveRes | ConvertTo-Json -Compress)

# 8. Verify Admin Receives Live Telemetry Feed
Write-Host "[8/11] Verifying Admin receives Candidate Real-Time Telemetry Feed..." -ForegroundColor Yellow
$adminLiveRes = curl.exe -s -b $ADMIN_COOKIES -X GET "$BASE_URL/api/telemetry/live" | ConvertFrom-Json
$candidateFeed = $adminLiveRes.liveTelemetry | Where-Object { $_.candidateId -eq $candId }
Assert-Step "Admin live feed displays active candidate session" ($candidateFeed -ne $null -and $candidateFeed.stability -eq 95) "Candidate: $($candidateFeed.candidateName) | Stability: $($candidateFeed.stability)%"

# 9. Test Machine Learning Proficiency & Integrity Predictor
Write-Host "[9/11] Testing ML Behavioral Classifier..." -ForegroundColor Yellow
$mlPayload = '{"typingSpeed":110,"backspaceCount":12,"pasteCount":1,"focusLostCount":0,"totalActiveTime":200,"idleTime":15,"codeChurn":20}'
$mlRes = curl.exe -s -b $ADMIN_COOKIES -X POST "$BASE_URL/api/ml/predict" -H "Content-Type: application/json" -d $mlPayload | ConvertFrom-Json
Assert-Step "ML model classifies behavioral proficiency" ($mlRes.proficiency -ne $null -or $mlRes.classification -ne $null -or $mlRes.tier -ne $null) ($mlRes | ConvertTo-Json -Compress)

# 10. Candidate Submits and Concludes Test
Write-Host "[10/11] Candidate Submits and Concludes Assessment..." -ForegroundColor Yellow
$submitPayload = @{
    sessionStart = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 120000
    duration = 120
    stability = 92
    events = @(
        @{ type = "TEST_START"; ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 120000 },
        @{ type = "FINAL_SUBMIT"; ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
    )
} | ConvertTo-Json -Depth 5
$submitRes = curl.exe -s -b $CAND_COOKIES -X POST "$BASE_URL/api/telemetry/submit" -H "Content-Type: application/json" -d $submitPayload | ConvertFrom-Json
Assert-Step "Telemetry submission finalizes and concludes test" ($submitRes.success -eq $true) ($submitRes.message)

# 11. Verify Candidate Lockout on Re-Login Attempt
Write-Host "[11/11] Verifying Candidate Re-Login Lockout..." -ForegroundColor Yellow
$reLoginRes = curl.exe -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d $candLoginPayload | ConvertFrom-Json
Assert-Step "Re-login is STRICTLY BLOCKED after test conclusion" ($reLoginRes.isCompleted -eq $true -or $reLoginRes.error -like "*Assessment Concluded*") ($reLoginRes.error)

# Cleanup Test Candidate from database to leave DB clean
curl.exe -s -b $ADMIN_COOKIES -X DELETE "$BASE_URL/api/admin/candidates/$candId" > $null

# Remove temporary cookie files
if (Test-Path $ADMIN_COOKIES) { Remove-Item $ADMIN_COOKIES }
if (Test-Path $CAND_COOKIES) { Remove-Item $CAND_COOKIES }

Write-Host "`n========================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "   🎉 ALL 11 ENTERPRISE TEST SUITE CHECKS PASSED!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ SOME CHECKS FAILED - REVIEW LOGS ABOVE" -ForegroundColor Red
}
Write-Host "========================================================`n" -ForegroundColor Cyan
