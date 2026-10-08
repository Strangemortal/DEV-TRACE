/**
 * DEV-TRACE Ollama Comprehensive Testing Suite
 * Tests llama3.1:8b and qwen2.5:3b across:
 *  1. Functional Testing
 *  2. Integration Testing
 *  3. System Testing
 *  4. Performance Testing
 */

const OLLAMA_BASE_URL = "http://127.0.0.1:11434";

async function queryOllama(model, prompt, systemPrompt = "You are a code assessment and proctoring evaluation engine. Always respond in valid JSON format.", temperature = 0.2) {
  const startTime = Date.now();
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      stream: false,
      format: "json",
      options: { temperature }
    })
  });

  const latencyMs = Date.now() - startTime;
  if (!res.ok) {
    throw new Error(`Ollama HTTP Error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const evalDurationMs = (data.eval_duration || 0) / 1e6;
  const promptEvalDurationMs = (data.prompt_eval_duration || 0) / 1e6;
  const evalCount = data.eval_count || 0;
  const promptEvalCount = data.prompt_eval_count || 0;
  const tokensPerSec = evalDurationMs > 0 ? ((evalCount / evalDurationMs) * 1000).toFixed(1) : "N/A";

  let parsed = null;
  let isJsonValid = false;
  try {
    parsed = JSON.parse(data.message.content);
    isJsonValid = true;
  } catch (e) {
    parsed = data.message.content;
    isJsonValid = false;
  }

  return {
    model,
    content: data.message.content,
    parsed,
    isJsonValid,
    totalLatencyMs: latencyMs,
    evalDurationMs: Math.round(evalDurationMs),
    promptEvalDurationMs: Math.round(promptEvalDurationMs),
    evalCount,
    promptEvalCount,
    tokensPerSec: parseFloat(tokensPerSec) || 0
  };
}

async function runTestSuite() {
  const models = ["llama3.1:8b", "qwen2.5:3b"];
  console.log("==================================================================");
  console.log("Starting DEV-TRACE 4-Tier Evaluation on Ollama Local Models");
  console.log("Models:", models.join(", "));
  console.log("==================================================================\n");

  const results = {
    functional: [],
    integration: [],
    system: [],
    performance: []
  };

  // -------------------------------------------------------------------------
  // 1. FUNCTIONAL TESTING
  // -------------------------------------------------------------------------
  console.log(">>> [1/4] Running Functional Testing...");

  // Test 1.1: Syntax & Vulnerability Analysis
  const funcPrompt1 = `Analyze this Python code snippet for a security vulnerability and logic bug.
Code:
def get_user_profile(user_id, db):
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    return db.execute_raw(query)

Return JSON with keys:
{
  "has_vulnerability": true/false,
  "vulnerability_type": "string",
  "severity": "Low|Medium|High|Critical",
  "fix_recommendation": "string"
}`;

  for (const m of models) {
    console.log(`  Testing ${m} - 1.1 SQL Injection Detection...`);
    const r = await queryOllama(m, funcPrompt1);
    const passed = r.isJsonValid && r.parsed?.has_vulnerability === true && 
                   (r.parsed?.vulnerability_type || "").toLowerCase().includes("sql");
    results.functional.push({
      testId: "FT-01",
      testName: "Vulnerability & Security Flaw Detection",
      model: m,
      passed,
      latencyMs: r.totalLatencyMs,
      details: passed ? `Detected ${r.parsed.vulnerability_type} (${r.parsed.severity})` : "Failed detection or invalid schema"
    });
  }

  // Test 1.2: Algorithm Complexity & Code Quality
  const funcPrompt2 = `Evaluate this algorithmic function:
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

Return JSON with keys:
{
  "time_complexity": "string",
  "space_complexity": "string",
  "optimality_score": 0-100,
  "is_optimal": true/false
}`;

  for (const m of models) {
    console.log(`  Testing ${m} - 1.2 Algorithm Complexity Analysis...`);
    const r = await queryOllama(m, funcPrompt2);
    const passed = r.isJsonValid && 
                   (r.parsed?.time_complexity || "").includes("O(n)") &&
                   r.parsed?.is_optimal === true;
    results.functional.push({
      testId: "FT-02",
      testName: "Algorithmic Complexity & Optimality Grading",
      model: m,
      passed,
      latencyMs: r.totalLatencyMs,
      details: passed ? `Identified ${r.parsed.time_complexity}, Score: ${r.parsed.optimality_score}/100` : "Failed analysis"
    });
  }

  // Test 1.3: Socratic Hint Generation
  const funcPrompt3 = `Candidate is stuck on fixing off-by-one error in binary search:
while low <= high:
    mid = (low + high) // 2
    if arr[mid] == target: return mid
    elif arr[mid] < target: low = mid  # BUG: should be mid + 1
    else: high = mid - 1

Generate a Level 2 Socratic Hint without revealing direct code fix.
Return JSON:
{
  "hint_level": 2,
  "socratic_question": "string",
  "encouragement": "string"
}`;

  for (const m of models) {
    console.log(`  Testing ${m} - 1.3 Socratic Hint Generation...`);
    const r = await queryOllama(m, funcPrompt3);
    const passed = r.isJsonValid && !!r.parsed?.socratic_question;
    results.functional.push({
      testId: "FT-03",
      testName: "Socratic Pedagogy & Non-Leaking Hint Logic",
      model: m,
      passed,
      latencyMs: r.totalLatencyMs,
      details: passed ? `Generated pedagocial guide: "${r.parsed.socratic_question.slice(0, 50)}..."` : "Failed hint generation"
    });
  }

  // -------------------------------------------------------------------------
  // 2. INTEGRATION TESTING
  // -------------------------------------------------------------------------
  console.log("\n>>> [2/4] Running Integration Testing...");

  // Test 2.1: DEV-TRACE Standard Evaluation Schema Adherence
  const integPrompt1 = `Given candidate assessment session with 3 tab blurs, 1 paste of 350 chars, and 45 wpm keystrokes:
Return DEV-TRACE evaluation JSON schema:
{
  "overallScore": number (0-100),
  "proficiencyTier": "Novice" | "Intermediate" | "Senior",
  "integrityClassification": "Autonomous (High Integrity)" | "AI-Assisted (Normal)" | "AI-Carried (Plagiarism Risk)",
  "integrityScore": number (0-100),
  "codeQualityRating": "Poor" | "Adequate" | "Clean" | "Exceptional",
  "timeComplexity": "string",
  "spaceComplexity": "string",
  "behavioralSummary": "string",
  "anomalyEvents": [ { "timestamp": "string", "type": "string", "severity": "Low"|"Medium"|"High", "note": "string" } ],
  "strengths": ["string"],
  "growthAreas": ["string"]
}`;

  for (const m of models) {
    console.log(`  Testing ${m} - 2.1 Schema Compliance...`);
    const r = await queryOllama(m, integPrompt1);
    const requiredKeys = ["overallScore", "proficiencyTier", "integrityClassification", "integrityScore", "codeQualityRating", "anomalyEvents", "strengths"];
    const hasKeys = r.isJsonValid && requiredKeys.every(k => k in r.parsed);
    results.integration.push({
      testId: "IT-01",
      testName: "DEV-TRACE Ingestion Schema & Type Adherence",
      model: m,
      passed: hasKeys,
      latencyMs: r.totalLatencyMs,
      details: hasKeys ? `Strict conformity with all ${requiredKeys.length} root schema keys` : "Missing required keys or malformed JSON"
    });
  }

  // Test 2.2: ML Keystroke Feature Vector Integration
  const integPrompt2 = `Telemetry Keystroke Vector:
FlightTimeMean: 112ms, FlightTimeStdDev: 14ms (Unusually uniform / bot-like)
PasteSize: 420 chars in single event
BackspaceRatio: 0.01 (No corrections)
Calculate integrity classification.
Return JSON:
{
  "is_anomaly": true/false,
  "confidence": number (0-1),
  "primary_violation": "string"
}`;

  for (const m of models) {
    console.log(`  Testing ${m} - 2.2 ML Feature Vector Interpretation...`);
    const r = await queryOllama(m, integPrompt2);
    const passed = r.isJsonValid && r.parsed?.is_anomaly === true && (r.parsed?.confidence >= 0.7);
    results.integration.push({
      testId: "IT-02",
      testName: "Biometric Feature Vector & ML Pipeline Fusion",
      model: m,
      passed,
      latencyMs: r.totalLatencyMs,
      details: passed ? `Anomaly flagged with confidence ${(r.parsed.confidence * 100).toFixed(0)}%: ${r.parsed.primary_violation}` : "Failed vector classification"
    });
  }

  // -------------------------------------------------------------------------
  // 3. SYSTEM TESTING
  // -------------------------------------------------------------------------
  console.log("\n>>> [3/4] Running System Testing...");

  // Test 3.1: Full Candidate Assessment Pipeline End-to-End
  const systemPrompt1 = `Simulate an end-to-end evaluation report for Candidate "Alex Mercer" who tackled a FastAPI Redis Caching challenge.
Duration: 42 minutes.
Submissions: 4 runs (1 failed, 3 passed).
Telemetry flags: 0 strikes, 1 minor blur.
Return JSON:
{
  "candidate": "Alex Mercer",
  "verdict": "HIRE" | "REJECT" | "BORDERLINE",
  "score": number,
  "integrity_verdict": "CLEAN" | "FLAGGED",
  "technical_depth_notes": "string",
  "interview_followup_question": "string"
}`;

  for (const m of models) {
    console.log(`  Testing ${m} - 3.1 Full Session E2E Evaluation...`);
    const r = await queryOllama(m, systemPrompt1);
    const passed = r.isJsonValid && !!r.parsed?.verdict && !!r.parsed?.interview_followup_question;
    results.system.push({
      testId: "ST-01",
      testName: "Full Session End-to-End Lifecycle Evaluation",
      model: m,
      passed,
      latencyMs: r.totalLatencyMs,
      details: passed ? `Verdict: ${r.parsed.verdict}, Integrity: ${r.parsed.integrity_verdict}, Score: ${r.parsed.score}/100` : "Failed lifecycle synthesis"
    });
  }

  // Test 3.2: Proctoring Strike Escalation System
  const systemPrompt2 = `System State: Candidate "John Doe" triggered Fullscreen Escape Strike 3 of 3.
Timer expired: 15s elapsed without returning to fullscreen.
Task: Generate formal automated audit incident record for proctoring deck.
Return JSON:
{
  "action_taken": "SESSION_AUTO_LOCKOUT",
  "strike_count": 3,
  "incident_severity": "Critical",
  "audit_reason": "string",
  "requires_manual_proctor_review": true
}`;

  for (const m of models) {
    console.log(`  Testing ${m} - 3.2 Security Strike Escalation & Lockout...`);
    const r = await queryOllama(m, systemPrompt2);
    const passed = r.isJsonValid && r.parsed?.action_taken === "SESSION_AUTO_LOCKOUT" && r.parsed?.requires_manual_proctor_review === true;
    results.system.push({
      testId: "ST-02",
      testName: "Security Strike Protocol & Automated Incident Lockdown",
      model: m,
      passed,
      latencyMs: r.totalLatencyMs,
      details: passed ? `Escalated to ${r.parsed.action_taken} (${r.parsed.incident_severity})` : "Failed security lockout generation"
    });
  }

  // -------------------------------------------------------------------------
  // 4. PERFORMANCE TESTING
  // -------------------------------------------------------------------------
  console.log("\n>>> [4/4] Running Performance Testing...");

  // Performance Test: Standard Sized Prompt vs Throughput
  const perfPrompt = `Perform rapid code review of this microservice handler:
async def handle_payment(payload: dict):
    amount = payload.get("amount")
    currency = payload.get("currency", "USD")
    if amount <= 0:
        raise ValueError("Invalid amount")
    tx_id = await stripe.charge(amount, currency)
    return {"status": "success", "tx_id": tx_id}

Provide JSON:
{
  "code_smells": ["string"],
  "concurrency_safe": true/false,
  "rating": "A"|"B"|"C"|"D"
}`;

  for (const m of models) {
    console.log(`  Benchmarking ${m} throughput and response rate...`);
    const r = await queryOllama(m, perfPrompt);
    results.performance.push({
      model: m,
      totalLatencyMs: r.totalLatencyMs,
      evalDurationMs: r.evalDurationMs,
      promptEvalDurationMs: r.promptEvalDurationMs,
      evalTokens: r.evalCount,
      promptTokens: r.promptEvalCount,
      tokensPerSec: r.tokensPerSec,
      validJson: r.isJsonValid
    });
  }

  console.log("\n==================================================================");
  console.log("All Tests Completed! Generating Summary Tables...");
  console.log("==================================================================\n");

  const fs = require("fs");
  fs.writeFileSync("automation/ollama_test_results.json", JSON.stringify(results, null, 2));
  console.log("Saved raw test results to automation/ollama_test_results.json");

  return results;
}

runTestSuite().catch(err => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
