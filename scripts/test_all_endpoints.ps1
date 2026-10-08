# DEV-TRACE - Automated All-Endpoints cURL / API Test Runner (PowerShell)
# Make sure "npm run dev" is running at http://localhost:3000 before executing this script.

$BASE_URL = "http://localhost:3000"
$COOKIE_JAR = "$PSScriptRoot\cookies.txt"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "   🚀 DEV-TRACE - RUNNING ALL API ENDPOINTS & SANDBOXES" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Health / Auth Me check (Unauthenticated)
Write-Host "[1/9] Checking /api/auth/me..." -ForegroundColor Yellow
$meRes = curl.exe -s -X GET "$BASE_URL/api/auth/me"
Write-Host "Response: $meRes`n"

# 2. Staff Admin Login (Stores Session Cookie)
Write-Host "[2/9] Authenticating as Admin (/api/auth/login)..." -ForegroundColor Yellow
$loginPayload = '{"userId":"admin","password":"password123","loginType":"staff"}'
$loginRes = curl.exe -s -c $COOKIE_JAR -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d $loginPayload
Write-Host "Response: $loginRes`n"

# 3. Python Sandbox Execution
Write-Host "[3/9] Executing Python Code in Sandbox (/api/execute)..." -ForegroundColor Yellow
$pyPayload = '{"language":"python","code":"x = [1, 2, 3, 4, 5]\nprint(''Sum:'', sum(x))\nprint(''Execution successful!'')"}'
$pyRes = curl.exe -s -X POST "$BASE_URL/api/execute" -H "Content-Type: application/json" -d $pyPayload
Write-Host "Response: $pyRes`n"

# 4. C++ Sandbox Execution
Write-Host "[4/9] Executing C++ Code in Sandbox (/api/execute)..." -ForegroundColor Yellow
$cppPayload = '{"language":"cpp","code":"#include <iostream>\nint main() { std::cout << \"C++ Sandbox OK!\"; return 0; }"}'
$cppRes = curl.exe -s -X POST "$BASE_URL/api/execute" -H "Content-Type: application/json" -d $cppPayload
Write-Host "Response: $cppRes`n"

# 5. ML Behavioral Integrity Classifier
Write-Host "[5/9] Testing ML Integrity Predictor (/api/ml/predict)..." -ForegroundColor Yellow
$mlPayload = '{"typingSpeed":120,"backspaceCount":10,"pasteCount":4,"focusLostCount":2,"totalActiveTime":180,"idleTime":20,"codeChurn":15}'
$mlRes = curl.exe -s -b $COOKIE_JAR -X POST "$BASE_URL/api/ml/predict" -H "Content-Type: application/json" -d $mlPayload
Write-Host "Response: $mlRes`n"

# 6. AI Socratic Debugging Assistant
Write-Host "[6/9] Testing AI Socratic Assistant (/api/ai/assistant)..." -ForegroundColor Yellow
$aiPayload = '{"action":"explain_error","errorOutput":"IndexError: list index out of range at line 4","language":"python","activeFile":"main.py","code":"x = [1, 2]\nprint(x[5])"}'
$aiRes = curl.exe -s -b $COOKIE_JAR -X POST "$BASE_URL/api/ai/assistant" -H "Content-Type: application/json" -d $aiPayload
Write-Host "Response: $aiRes`n"

# 7. AI Candidate Evaluation Report
Write-Host "[7/9] Testing AI Candidate Evaluation (/api/ai/evaluate-candidate)..." -ForegroundColor Yellow
$evalPayload = '{"candidateId":"test_001","candidateName":"Alex Dev","repoId":"python-challenge","durationSeconds":300,"stabilityScore":88,"events":[]}'
$evalRes = curl.exe -s -b $COOKIE_JAR -X POST "$BASE_URL/api/ai/evaluate-candidate" -H "Content-Type: application/json" -d $evalPayload
Write-Host "Response: $evalRes`n"

# 8. Fetch Registered Candidates (Admin Deck)
Write-Host "[8/9] Fetching Candidate Registry (/api/admin/candidates)..." -ForegroundColor Yellow
$candRes = curl.exe -s -b $COOKIE_JAR -X GET "$BASE_URL/api/admin/candidates"
Write-Host "Response: $candRes`n"

# 9. Fetch Telemetry Records (Admin Deck)
Write-Host "[9/9] Fetching Admin Telemetry Sessions (/api/admin/telemetry)..." -ForegroundColor Yellow
$telemRes = curl.exe -s -b $COOKIE_JAR -X GET "$BASE_URL/api/admin/telemetry"
Write-Host "Response: $telemRes`n"

# Cleanup cookie jar
if (Test-Path $COOKIE_JAR) { Remove-Item $COOKIE_JAR }

Write-Host "========================================================" -ForegroundColor Green
Write-Host "   ✅ ALL DEV-TRACE ENDPOINT CHECKS COMPLETED!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
