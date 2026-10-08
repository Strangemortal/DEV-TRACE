#!/usr/bin/env bash
# DEV-TRACE - Automated All-Endpoints cURL / API Test Runner (Bash)
# Ensure the development server is running ("npm run dev") on http://localhost:3000

BASE_URL="http://localhost:3000"
COOKIE_JAR="./cookies.txt"

echo -e "\n========================================================"
echo -e "   🚀 DEV-TRACE - RUNNING ALL API ENDPOINTS & SANDBOXES"
echo -e "========================================================\n"

# 1. Health / Session Check
echo -e "\033[33m[1/9] Checking /api/auth/me...\033[0m"
curl -s -X GET "$BASE_URL/api/auth/me"
echo -e "\n"

# 2. Staff Admin Login (Stores Session Cookie)
echo -e "\033[33m[2/9] Authenticating as Admin (/api/auth/login)...\033[0m"
curl -s -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin","password":"password123","loginType":"staff"}'
echo -e "\n"

# 3. Python Sandbox Execution
echo -e "\033[33m[3/9] Executing Python Code in Sandbox (/api/execute)...\033[0m"
curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"x = [1, 2, 3, 4, 5]\nprint(\"Sum:\", sum(x))\nprint(\"Execution successful!\")"}'
echo -e "\n"

# 4. C++ Sandbox Execution
echo -e "\033[33m[4/9] Executing C++ Code in Sandbox (/api/execute)...\033[0m"
curl -s -X POST "$BASE_URL/api/execute" \
  -H "Content-Type: application/json" \
  -d '{"language":"cpp","code":"#include <iostream>\nint main() { std::cout << \"C++ Sandbox OK!\\n\"; return 0; }"}'
echo -e "\n"

# 5. ML Behavioral Integrity Classifier
echo -e "\033[33m[5/9] Testing ML Integrity Predictor (/api/ml/predict)...\033[0m"
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/ml/predict" \
  -H "Content-Type: application/json" \
  -d '{"typingSpeed":120,"backspaceCount":10,"pasteCount":4,"focusLostCount":2,"totalActiveTime":180,"idleTime":20,"codeChurn":15}'
echo -e "\n"

# 6. AI Socratic Debugging Assistant
echo -e "\033[33m[6/9] Testing AI Socratic Assistant (/api/ai/assistant)...\033[0m"
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/ai/assistant" \
  -H "Content-Type: application/json" \
  -d '{"action":"explain_error","errorOutput":"IndexError: list index out of range at line 4","language":"python","activeFile":"main.py","code":"x = [1, 2]\nprint(x[5])"}'
echo -e "\n"

# 7. AI Candidate Evaluation Report
echo -e "\033[33m[7/9] Testing AI Candidate Evaluation (/api/ai/evaluate-candidate)...\033[0m"
curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/ai/evaluate-candidate" \
  -H "Content-Type: application/json" \
  -d '{"candidateId":"test_001","candidateName":"Alex Dev","repoId":"python-challenge","durationSeconds":300,"stabilityScore":88,"events":[]}'
echo -e "\n"

# 8. Fetch Registered Candidates (Admin Deck)
echo -e "\033[33m[8/9] Fetching Candidate Registry (/api/admin/candidates)...\033[0m"
curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/api/admin/candidates"
echo -e "\n"

# 9. Fetch Telemetry Records (Admin Deck)
echo -e "\033[33m[9/9] Fetching Admin Telemetry Sessions (/api/admin/telemetry)...\033[0m"
curl -s -b "$COOKIE_JAR" -X GET "$BASE_URL/api/admin/telemetry"
echo -e "\n"

# Cleanup
rm -f "$COOKIE_JAR"

echo -e "========================================================"
echo -e "   \033[32m✅ ALL DEV-TRACE ENDPOINT CHECKS COMPLETED!\033[0m"
echo -e "========================================================\n"
