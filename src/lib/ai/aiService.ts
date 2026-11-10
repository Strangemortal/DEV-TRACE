import { FileData, Repository } from "@/data/brokenRepo";
import { predictCandidateIntegrity, MLPredictionResult } from "@/lib/ml/inference";

export interface AIChallengeRequest {
  prompt: string;
  framework?: "django" | "flask" | "fastapi" | "express" | "spring-boot" | "nextjs" | "vanilla" | "none";
  category?: "python" | "cpp" | "java" | "web" | "node";
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  scenario?: string;
}

export interface AIEvaluationRequest {
  candidateId: string;
  candidateName: string;
  repoId: string;
  durationSeconds: number;
  stabilityScore: number;
  events: Array<{ type: string; meta?: any; ts: string }>;
  finalFiles?: Record<string, string>;
}

export interface AIEvaluationResult {
  overallScore: number; // 0-100
  proficiencyTier: "Novice" | "Intermediate" | "Senior";
  integrityClassification: "Autonomous (High Integrity)" | "AI-Assisted (Normal)" | "AI-Carried (Plagiarism Risk)";
  integrityScore: number; // 0-100
  codeQualityRating: "Poor" | "Adequate" | "Clean" | "Exceptional";
  timeComplexity: string;
  spaceComplexity: string;
  behavioralSummary: string;
  anomalyEvents: Array<{ timestamp: string; type: string; severity: "Low" | "Medium" | "High"; note: string }>;
  strengths: string[];
  growthAreas: string[];
  interviewQuestions: Array<{ question: string; reason: string; expectedAnswerHint: string }>;
  mlPrediction?: MLPredictionResult;
  engineeringIndices?: {
    aoi: number; // Architectural Orientation Index (0-100)
    resilience: number; // Resilience Coefficient (0-100)
    codeHygiene: number; // Code Hygiene & Polish Index (0-100)
    aiSupervision: number; // AI Supervision Score S_AIS (0-100)
    aiSupervisionTier: "AI-Supervised (Senior Auditor)" | "AI-Assisted (Normal)" | "AI-Carried (Plagiarism Risk)" | "Pure Autonomous";
  };
}

export interface AISocraticHintRequest {
  challengeName: string;
  activeFile: string;
  code: string;
  errorOutput?: string;
  hintLevel: 1 | 2 | 3; // 1: Conceptual, 2: Location/Inspection, 3: Logic Clue
}

export interface AISocraticHintResult {
  hintLevel: 1 | 2 | 3;
  title: string;
  hintText: string;
  encouragement: string;
}

export interface AIExplainErrorRequest {
  errorOutput: string;
  framework?: string;
  language?: string;
  activeFile?: string;
  code?: string;
}

export interface AIExplainErrorResult {
  summary: string;
  rootCause: string;
  suggestedFixDirections: string[];
}

export interface AICopilotSnippetRequest {
  challengeId?: string;
  challengeName?: string;
  framework?: string;
  activeFile: string;
  code: string;
  userPrompt?: string;
}

export interface AICopilotSnippetResult {
  trapId: string;
  trapType: "SECURITY_SQLI" | "BOUNDARY_OFF_BY_ONE" | "COMPLEXITY_QUADRATIC" | "NULL_POINTER_DEREF";
  trapDescription: string;
  trapToken: string;
  snippet: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// 1. LLM API Integration (OpenRouter / Gemini / OpenAI with fallback)
// ---------------------------------------------------------------------------
async function callLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // 1. OpenRouter Integration
  if (openRouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
          "HTTP-Referer": "https://devtrace.io",
          "X-Title": "DEV-TRACE Assessment Platform",
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (err) {
      console.warn("OpenRouter API call failed, falling back to secondary providers:", err);
    }
  }

  // 2. Gemini Integration
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    } catch (err) {
      console.warn("Gemini API call failed, falling back to secondary providers:", err);
    }
  }

  // 3. OpenAI Integration
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || null;
      }
    } catch (err) {
      console.warn("OpenAI API call failed, falling back to built-in AI engine:", err);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 2. AI Challenge Generator Engine
// ---------------------------------------------------------------------------
export async function generateChallengeWithAI(req: AIChallengeRequest): Promise<Repository> {
  const framework = req.framework || "fastapi";
  const difficulty = req.difficulty || "Intermediate";
  const prompt = req.prompt.trim();

  const systemPrompt = `You are a Principal Staff Software Engineer & Technical Interview Architect at a tier-1 tech company (e.g. Stripe, Uber, Netflix).
Your task is to design a realistic, production-grade technical assessment repository for a developer candidate.

Guidelines for a world-class assessment challenge:
1. **Scenario-Driven**: Frame the problem as an active production incident, microservice bug fix, or mission-critical feature refactor.
2. **Multi-File Architecture**: Include 3 to 6 interconnected files with real imports, realistic classes, proper types/docstrings, and clean separation of concerns.
3. **Subtle Realistic Bugs**: Avoid naive typos. Seed realistic bugs such as concurrency race conditions, floating point rounding, unhandled boundary cases, broken state mutation, or cache staleness.
4. **Rich README.md**: Must contain:
   - # [Challenge Title]
   - ## 🚨 Incident Scenario / Problem Overview
   - ## 🏛️ Architecture & Component Responsibilities
   - ## 🐛 Bug Symptoms & Observed Failures
   - ## 🎯 Acceptance Criteria & Constraints
   - ## 🧪 Verification Guide
5. **Comprehensive Test Suite**: Include 3-5 unit tests with clear assert messages testing both the happy path and edge cases.

Respond ONLY with a valid JSON object matching this schema (NO MARKDOWN WRAPPERS, JUST PURE JSON):
{
  "id": "slug-challenge-id",
  "name": "Challenge Title (e.g. Idempotent Payment Webhook Processor)",
  "category": "python" | "cpp" | "java" | "web" | "node",
  "framework": "django" | "flask" | "fastapi" | "express" | "spring-boot" | "nextjs" | "vanilla" | "none",
  "environmentLabel": "Environment label (e.g. FastAPI 0.110 + Python 3.11)",
  "testCommand": "Test command (e.g. python -m unittest test_main.py)",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "estimatedTime": "25m",
  "activeFile": "README.md",
  "fileOrder": ["README.md", "services.py", "models.py", "test_main.py"],
  "files": {
    "filename": { "name": "filename", "language": "python|javascript|typescript|java|markdown", "content": "Full production file content" }
  },
  "bugs": ["Specific architectural bug description 1", "Specific bug description 2"],
  "checkString": "Substrings in test output that indicate success (e.g. OK, PASSED, ALL TESTS PASSED)"
}`;

  const userPrompt = `Generate a comprehensive ${difficulty}-level coding challenge for framework: "${framework}".
Specific Topic / Requirement: ${prompt || "High-throughput microservice debugging with subtle business logic, state mutation, and edge case bugs."}

Make the problem engaging, educational, and realistic for a candidate.`;

  const rawJson = await callLLM(systemPrompt, userPrompt);
  if (rawJson) {
    try {
      // Clean possible markdown code fences
      const cleaned = rawJson.replace(/^```json/m, "").replace(/^```/m, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.id && parsed.files && parsed.name) {
        const checkStr = parsed.checkString || "PASSED";
        return {
          id: parsed.id,
          name: parsed.name,
          category: parsed.category || (framework === "express" || framework === "nextjs" ? "node" : framework === "spring-boot" ? "java" : "python"),
          framework: parsed.framework || framework,
          environmentLabel: parsed.environmentLabel || `${framework.toUpperCase()} Sandbox`,
          testCommand: parsed.testCommand || (framework === "django" ? "python manage.py test" : framework === "spring-boot" ? "mvn test" : "python test_main.py"),
          difficulty: parsed.difficulty || difficulty,
          estimatedTime: parsed.estimatedTime || "25m",
          activeFile: parsed.activeFile || "README.md",
          fileOrder: parsed.fileOrder || Object.keys(parsed.files),
          files: parsed.files,
          validateSave: () => [],
          checkExecution: (stdout, stderr) => {
            const out = (stdout + " " + stderr).toUpperCase();
            if (out.includes(checkStr.toUpperCase()) || out.includes("OK") || (out.includes("PASSED") && !out.includes("0 PASSED"))) {
              return { passed: true, message: `All ${parsed.name} test assertions passed successfully!` };
            }
            return { passed: false, message: "Tests failed. Review logic against acceptance criteria." };
          },
        };
      }
    } catch (e) {
      console.warn("Failed to parse LLM generated challenge, using built-in generator:", e);
    }
  }

  // Built-in Intelligent Challenge Synthesizer (Zero-Config Fallback)
  const slugId = `ai-${framework}-${Date.now().toString(36)}`;
  return synthesizeBuiltinChallenge(slugId, prompt, framework, difficulty);
}

function synthesizeBuiltinChallenge(
  id: string,
  prompt: string,
  framework: string,
  difficulty: "Beginner" | "Intermediate" | "Advanced"
): Repository {
  const title = prompt ? prompt.trim() : `${framework.toUpperCase()} Microservice Reliability Incident`;

  if (framework === "django") {
    return {
      id,
      name: `Django: ${prompt ? prompt.slice(0, 32) : "Inventory Ledger & Cart Discount"}`,
      category: "python",
      framework: "django",
      environmentLabel: "Django 5.0 + SQLite Sandbox",
      testCommand: "python manage.py test",
      difficulty,
      estimatedTime: "25m",
      activeFile: "README.md",
      fileOrder: ["README.md", "models.py", "views.py", "tests.py", "settings.py", "manage.py"],
      files: {
        "README.md": {
          name: "README.md",
          language: "markdown",
          content: `# 🚨 Production Incident #3081: Inventory Ledger & Coupon Clamping

## 📌 Context
Our e-commerce checkout service experienced two critical revenue leaks during flash sales:
1. **Race Condition / Negative Stock**: Customers were able to purchase more items than currently in stock when multiple checkout requests landed simultaneously.
2. **Coupon Price Underflow**: Applying large percentage discount coupons on small carts resulted in a negative total amount (paying the customer).

## 🏗️ Module Responsibilities
- \`models.py\`: Data models for \`Product\` and \`Order\`. Contains \`reserve()\` and \`apply_discount()\`.
- \`views.py\`: Checkout handler coordinating product reservation and discount calculation.
- \`tests.py\`: Automated regression test suite.

## 🎯 Acceptance Criteria
1. Fix \`Product.reserve(qty)\` in \`models.py\` so it rejects quantities exceeding \`self.stock\` and returns \`False\`.
2. Fix \`Product.apply_discount(coupon_rate)\` in \`models.py\` so the price cannot fall below \`0.0\`.
3. Ensure all unit tests in \`tests.py\` pass with \`OK\` status.

## 🧪 Running Tests
Press **Ctrl+S** or run:
\`\`\`bash
python manage.py test
\`\`\`
`,
        },
        "models.py": {
          name: "models.py",
          language: "python",
          content: `from django.db import models

class Product(models.Model):
    title = models.CharField(max_length=100)
    price = models.FloatField()
    stock = models.IntegerField(default=0)

    class Meta:
        app_label = "store"

    def reserve(self, qty: int) -> bool:
        # BUG: Fails to validate if qty > self.stock before subtracting
        if qty <= 0:
            return False
        self.stock -= qty
        return True

    def calculate_discounted_price(self, discount_pct: float) -> float:
        # BUG: Does not clamp discount; negative values or >100% discount cause invalid prices
        discounted = self.price * (1.0 - discount_pct)
        return discounted
`,
        },
        "views.py": {
          name: "views.py",
          language: "python",
          content: `from models import Product

def checkout_product(product_id: int, qty: int, discount_pct: float = 0.0) -> dict:
    try:
        product = Product.objects.get(id=product_id)
        if not product.reserve(qty):
            return {"success": False, "error": "Insufficient stock"}
        
        final_price = product.calculate_discounted_price(discount_pct)
        return {
            "success": True,
            "product_id": product.id,
            "unit_price": final_price,
            "total": round(final_price * qty, 2),
            "remaining_stock": product.stock,
        }
    except Product.DoesNotExist:
        return {"success": False, "error": "Product not found"}
`,
        },
        "tests.py": {
          name: "tests.py",
          language: "python",
          content: `from django.test import TestCase
from models import Product
from views import checkout_product

class InventoryRegressionTests(TestCase):
    def setUp(self):
        self.gpu = Product.objects.create(title="NVIDIA RTX 4090", price=1600.0, stock=5)

    def test_valid_checkout(self):
        res = checkout_product(self.gpu.id, 2)
        self.assertTrue(res["success"])
        self.assertEqual(res["remaining_stock"], 3)
        self.assertEqual(res["total"], 3200.0)

    def test_prevent_overselling(self):
        res = checkout_product(self.gpu.id, 10)
        self.assertFalse(res["success"], "Should reject reservation exceeding available stock")

    def test_discount_clamping(self):
        # 120% promo code should clamp to 0.0, not negative
        res = checkout_product(self.gpu.id, 1, discount_pct=1.2)
        self.assertTrue(res["success"])
        self.assertGreaterEqual(res["unit_price"], 0.0, "Price must never be negative")
`,
        },
        "settings.py": {
          name: "settings.py",
          language: "python",
          content: `SECRET_KEY = "devtrace-secret-key"
INSTALLED_APPS = ["django.contrib.contenttypes", "django.contrib.auth", "store"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
USE_TZ = True
`,
        },
        "manage.py": {
          name: "manage.py",
          language: "python",
          content: `import os, sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
`,
        },
      },
      validateSave: () => [],
      checkExecution: (stdout, stderr) => {
        const out = stdout + " " + stderr;
        if (out.includes("OK") || (out.includes("Ran 3 tests") && !out.includes("FAIL"))) {
          return { passed: true, message: "All Django regression test assertions passed!" };
        }
        return { passed: false, message: "Django assertions failed. Inspect stock reservation & price clamping logic." };
      },
    };
  }

  if (framework === "fastapi") {
    return {
      id,
      name: `FastAPI: ${prompt ? prompt.slice(0, 32) : "Token Bucket Rate Limiter"}`,
      category: "python",
      framework: "fastapi",
      environmentLabel: "FastAPI 0.110 + Python 3.11 Sandbox",
      testCommand: "python test_main.py",
      difficulty,
      estimatedTime: "25m",
      activeFile: "README.md",
      fileOrder: ["README.md", "limiter.py", "main.py", "test_main.py"],
      files: {
        "README.md": {
          name: "README.md",
          language: "markdown",
          content: `# 🚨 Production Incident #5120: Async Token Bucket Rate Limiter Leak

## 📌 Context
Our API gateway uses an in-memory sliding token-bucket algorithm to protect microservices against DDoS attacks and brute-force spikes.
During peak traffic, clients observed that tokens were not replenishing over time, and burst requests were incorrectly blocked.

## 🏗️ Architecture
- \`limiter.py\`: In-memory TokenBucket implementation (\`consume()\`, \`refill()\`).
- \`main.py\`: FastAPI application endpoints with middleware rate limiting.
- \`test_main.py\`: Test suite validating token consumption, burst allowances, and time-based replenishment.

## 🎯 Acceptance Criteria
1. Fix \`TokenBucket.refill()\` in \`limiter.py\` to accurately compute elapsed time since \`last_refill\` and add \`elapsed * refill_rate\` tokens up to \`capacity\`.
2. Fix \`TokenBucket.consume(cost)\` to verify whether \`self.tokens >= cost\` before deducting.
3. Pass all assertion tests in \`test_main.py\`.
`,
        },
        "limiter.py": {
          name: "limiter.py",
          language: "python",
          content: `import time

class TokenBucket:
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate # tokens per second
        self.tokens = float(capacity)
        self.last_refill = time.time()

    def refill(self) -> None:
        now = time.time()
        # BUG: Uses multiplication instead of time difference
        elapsed = now
        new_tokens = elapsed * self.refill_rate
        self.tokens = min(float(self.capacity), self.tokens + new_tokens)
        self.last_refill = now

    def consume(self, cost: int = 1) -> bool:
        self.refill()
        # BUG: Deducts unconditionally without checking balance
        self.tokens -= cost
        return True
`,
        },
        "main.py": {
          name: "main.py",
          language: "python",
          content: `from limiter import TokenBucket

bucket = TokenBucket(capacity=10, refill_rate=2.0)

def handle_api_request(client_id: str, cost: int = 1) -> dict:
    if bucket.consume(cost):
        return {"status": 200, "message": "Request processed", "client": client_id}
    return {"status": 429, "error": "Too Many Requests", "retry_after": 1.0}
`,
        },
        "test_main.py": {
          name: "test_main.py",
          language: "python",
          content: `import time
from limiter import TokenBucket

def run_tests():
    # Test 1: Initial capacity burst
    tb = TokenBucket(capacity=5, refill_rate=1.0)
    for _ in range(5):
        assert tb.consume(1) is True, "Should allow up to capacity"

    # Test 2: Reject when empty
    assert tb.consume(1) is False, "Should reject when tokens exhausted"

    # Test 3: Replenishment over time
    time.sleep(1.1)
    assert tb.consume(1) is True, "Should replenish at least 1 token after 1.1 seconds"

    print("ALL FASTAPI RATE LIMITER TESTS PASSED (OK)")

if __name__ == "__main__":
    run_tests()
`,
        },
      },
      validateSave: () => [],
      checkExecution: (stdout, stderr) => {
        if (stdout.includes("ALL FASTAPI RATE LIMITER TESTS PASSED") || stdout.includes("(OK)")) {
          return { passed: true, message: "All FastAPI Token Bucket assertions passed!" };
        }
        return { passed: false, message: "FastAPI rate limiter test assertions failed." };
      },
    };
  }

  // Spring Boot / Express / Generic Default
  return {
    id,
    name: `${framework.toUpperCase()}: ${prompt ? prompt.slice(0, 32) : "Payment & Ledger Service"}`,
    category: framework === "spring-boot" ? "java" : framework === "express" || framework === "nextjs" ? "node" : "python",
    framework: (framework as any) || "fastapi",
    environmentLabel: `${framework.toUpperCase()} High-Availability Sandbox`,
    testCommand: framework === "spring-boot" ? "mvn test" : "npm test",
    difficulty,
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "service.js", "tests.js"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# 🚨 ${title}

## 📌 Context
During microservice stress testing, unexpected state anomalies and boundary errors were detected in the transactional pipeline.

## 🎯 Acceptance Criteria
1. Fix the calculation and boundary validation logic in \`service.js\`.
2. Ensure idempotent handling of duplicate events.
3. Pass all automated test assertions.
`,
      },
      "service.js": {
        name: "service.js",
        language: "javascript",
        content: `class TransactionService {
  constructor() {
    this.processedKeys = new Set();
  }

  processTransaction(idempotencyKey, amount) {
    // BUG: Missing idempotency check and boundary validation
    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }
    this.processedKeys.add(idempotencyKey);
    return { success: true, processedAmount: amount };
  }
}

module.exports = { TransactionService };
`,
      },
      "tests.js": {
        name: "tests.js",
        language: "javascript",
        content: `const { TransactionService } = require('./service');
const assert = require('assert');

const svc = new TransactionService();
const res1 = svc.processTransaction("tx-1", 100);
assert.strictEqual(res1.success, true);

const res2 = svc.processTransaction("tx-1", 100);
assert.strictEqual(res2.success, false, "Duplicate key must be rejected");

console.log("ALL TESTS PASSED (OK)");
`,
      },
    },
    validateSave: () => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.includes("ALL TESTS PASSED") || stdout.includes("(OK)")) {
        return { passed: true, message: "All challenge test assertions passed!" };
      }
      return { passed: false, message: "Test assertions failed." };
    },
  };
}

// ---------------------------------------------------------------------------
// 3. AI Candidate Behavioral Evaluator & Integrity Classifier
// ---------------------------------------------------------------------------
export async function evaluateCandidateSessionWithAI(req: AIEvaluationRequest): Promise<AIEvaluationResult> {
  const events = req.events || [];
  const pasteEvents = events.filter((e) => e.type === "PASTE" || e.type === "PASTE_DETECTED");
  const focusLostEvents = events.filter((e) => e.type === "FOCUS_LOST" || e.type === "WINDOW_BLUR");
  const keystrokeEvents = events.filter((e) => e.type === "KEYSTROKE_RAW" || e.type === "KEYSTROKE_BATCH");
  const testRuns = events.filter((e) => e.type === "RUN_TESTS" || e.type === "TEST_RUN");

  const totalCharsPasted = pasteEvents.reduce((acc, p) => acc + (p.meta?.length || p.meta?.diff || 100), 0);
  const pasteRatio = keystrokeEvents.length > 0 ? totalCharsPasted / (keystrokeEvents.length * 5 + totalCharsPasted) : 0;

  // 1. Execute Trained Random Forest Ensemble Model (Trained on 1,217 Sessions)
  const mlResult = predictCandidateIntegrity({
    stability: req.stabilityScore,
    duration: req.durationSeconds,
    events: req.events || [],
  });

  const integrityScore = Math.round(
    mlResult.predictedClass === 0
      ? Math.max(82, mlResult.confidence)
      : mlResult.predictedClass === 1
      ? Math.max(60, Math.min(80, 100 - mlResult.confidence * 0.3))
      : Math.min(55, Math.max(20, 100 - mlResult.confidence))
  );

  const classification = mlResult.classification;

  let proficiency: AIEvaluationResult["proficiencyTier"] = "Intermediate";
  if (req.stabilityScore >= 85 && req.durationSeconds < 900 && pasteRatio < 0.2) {
    proficiency = "Senior";
  } else if (req.stabilityScore < 60 || pasteRatio > 0.5) {
    proficiency = "Novice";
  }

  const systemPrompt = `You are a Principal Software Engineer evaluating an engineering candidate's test session and telemetry data.
Our Random Forest Machine Learning Model (60-Tree Ensemble trained on 1,217 sessions) classified this candidate as:
"${mlResult.classification}" with ${mlResult.confidence}% model confidence.
Top telemetry driving factors: ${JSON.stringify(mlResult.topContributingFeatures)}

Generate a comprehensive JSON assessment report matching this schema:
{
  "overallScore": 85,
  "proficiencyTier": "Senior" | "Intermediate" | "Novice",
  "integrityClassification": "Autonomous (High Integrity)" | "AI-Assisted (Normal)" | "AI-Carried (Plagiarism Risk)",
  "integrityScore": 92,
  "codeQualityRating": "Exceptional" | "Clean" | "Adequate" | "Poor",
  "timeComplexity": "O(N)",
  "spaceComplexity": "O(1)",
  "behavioralSummary": "Concise 2-sentence summary of developer behavior and proficiency.",
  "anomalyEvents": [{ "timestamp": "...", "type": "...", "severity": "Low" | "Medium" | "High", "note": "..." }],
  "strengths": ["...", "..."],
  "growthAreas": ["...", "..."],
  "interviewQuestions": [
    { "question": "Technical question to ask candidate", "reason": "Why this question tests their deep understanding", "expectedAnswerHint": "What good candidates say" }
  ]
}`;

  const userPrompt = `Candidate: ${req.candidateName}, Challenge: ${req.repoId}, Duration: ${req.durationSeconds}s, Stability: ${req.stabilityScore}%, Pastes: ${pasteEvents.length} (${totalCharsPasted} chars), Tab Switches: ${focusLostEvents.length}, Test Runs: ${testRuns.length}. ML Prediction: ${mlResult.classification} (${mlResult.confidence}% confidence).`;

  // -------------------------------------------------------------------------
  // Compute Enterprise Behavioral Indices: AOI, RC, CHR, S_AIS
  // -------------------------------------------------------------------------
  let readmeDurationSec = 0;
  const specFilesOpened = new Set<string>();
  let firstKeystrokeSec = req.durationSeconds;
  const sessionStartTs = events[0] ? new Date(events[0].ts).getTime() : 0;

  for (const e of events) {
    const elapsedSec = sessionStartTs > 0 ? (new Date(e.ts).getTime() - sessionStartTs) / 1000 : 0;
    if (e.type === "FILE_SWITCH") {
      const fn = e.meta?.fileName || e.meta?.file || "";
      if (fn.toLowerCase().includes("readme") || fn.toLowerCase().includes("spec") || fn.toLowerCase().includes("test")) {
        specFilesOpened.add(fn);
      }
    }
    if ((e.type === "KEYSTROKE_RAW" || e.type === "KEYSTROKE_BATCH" || e.type === "CODE_EDIT") && elapsedSec < firstKeystrokeSec) {
      firstKeystrokeSec = Math.max(1, elapsedSec);
    }
  }
  readmeDurationSec = Math.max(25, Math.min(firstKeystrokeSec, 120));
  const aoiRatio = Math.min(1.0, (
    0.50 * Math.min(1.0, readmeDurationSec / 60) +
    0.30 * Math.min(1.0, Math.max(1, specFilesOpened.size) / 3) +
    0.20 * (firstKeystrokeSec >= 30 ? 1.0 : 0.4)
  ));
  const aoi = Math.round(aoiRatio * 100);

  // 2. Resilience Coefficient (RC)
  const failingTests = testRuns.filter((t) => t.meta?.passed === false || t.meta?.status === "fail");
  let resilienceRatio = 0.88;
  if (testRuns.length > 0) {
    const lastTestPassed = testRuns[testRuns.length - 1]?.meta?.passed !== false;
    if (failingTests.length === 0) {
      resilienceRatio = 0.94;
    } else if (lastTestPassed) {
      resilienceRatio = Math.min(0.98, 0.76 + (failingTests.length * 0.05));
    } else {
      resilienceRatio = Math.max(0.45, 0.70 - (failingTests.length * 0.08));
    }
  }
  const resilience = Math.round(resilienceRatio * 100);

  // 3. Code Hygiene & Polish Index (CHR)
  let postGreenEdits = 0;
  let totalEdits = 0;
  let hasPassedGreen = false;
  for (const e of events) {
    if (e.type === "CODE_EDIT" || e.type === "KEYSTROKE_BATCH") totalEdits++;
    if (e.type === "TEST_RUN" && e.meta?.passed === true) hasPassedGreen = true;
    if (hasPassedGreen && (e.type === "CODE_EDIT" || e.type === "KEYSTROKE_BATCH")) {
      postGreenEdits++;
    }
  }
  const chrRatio = totalEdits > 0 ? (postGreenEdits / totalEdits) : 0.22;
  const codeHygiene = Math.round(Math.min(98, Math.max(60, 70 + (chrRatio * 80))));

  // 4. AI Supervision Score (S_AIS)
  const aiSnippetEvents = events.filter((e) => e.type === "AI_CODE_SUGGESTION_INSERTED");
  const aiTrapNeutralized = events.filter((e) => e.type === "AI_TRAP_NEUTRALIZED");
  let aiSupervision = 96;
  let aiSupervisionTier: "AI-Supervised (Senior Auditor)" | "AI-Assisted (Normal)" | "AI-Carried (Plagiarism Risk)" | "Pure Autonomous" = "Pure Autonomous";

  if (aiSnippetEvents.length > 0) {
    const trapNeutralized = aiTrapNeutralized.length > 0 || pasteRatio < 0.25;
    const nTrap = trapNeutralized ? 1.0 : 0.2;
    const mMut = Math.min(1.0, Math.max(0.2, (1 - pasteRatio) * 0.8));
    const vVerify = Math.min(1.0, testRuns.length / 2);
    const rDwell = Math.min(1.0, 0.8);
    const sAis = (0.40 * nTrap) + (0.25 * mMut) + (0.20 * vVerify) + (0.15 * rDwell);
    aiSupervision = Math.round(sAis * 100);
    if (aiSupervision >= 70 && nTrap >= 0.8) {
      aiSupervisionTier = "AI-Supervised (Senior Auditor)";
    } else if (aiSupervision >= 40) {
      aiSupervisionTier = "AI-Assisted (Normal)";
    } else {
      aiSupervisionTier = "AI-Carried (Plagiarism Risk)";
    }
  } else if (pasteRatio > 0.45) {
    aiSupervision = 35;
    aiSupervisionTier = "AI-Carried (Plagiarism Risk)";
  }

  const engineeringIndices = {
    aoi,
    resilience,
    codeHygiene,
    aiSupervision,
    aiSupervisionTier,
  };

  const rawJson = await callLLM(systemPrompt, userPrompt);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed.overallScore !== undefined && parsed.interviewQuestions) {
        parsed.mlPrediction = mlResult;
        parsed.engineeringIndices = engineeringIndices;
        return parsed;
      }
    } catch (e) {
      console.warn("LLM evaluation JSON parse error, using heuristic evaluator:", e);
    }
  }

  // Built-in Heuristic Evaluator Fallback with ML Model Enhancement
  const overallScore = Math.round((req.stabilityScore * 0.4) + (integrityScore * 0.6));
  const anomalies: AIEvaluationResult["anomalyEvents"] = [];

  if (pasteEvents.length > 0) {
    pasteEvents.slice(0, 3).forEach((p) => {
      anomalies.push({
        timestamp: p.ts || new Date().toISOString(),
        type: "Large Paste Burst",
        severity: (p.meta?.length || 100) > 300 ? "High" : "Medium",
        note: `Pasted ${p.meta?.length || "block of"} characters into editor.`,
      });
    });
  }

  if (focusLostEvents.length > 2) {
    anomalies.push({
      timestamp: focusLostEvents[0].ts || new Date().toISOString(),
      type: "Window Blur / Tab Switch",
      severity: "Low",
      note: `Candidate switched application window ${focusLostEvents.length} times during assessment.`,
    });
  }

  const dynamicQuestions = [
    {
      question: `In ${req.repoId}, how would your solution scale if the dataset grew from 1,000 items to 10,000,000 items?`,
      reason: "Tests architectural scalability and algorithmic big-O comprehension.",
      expectedAnswerHint: "Should discuss database indexing, batch pagination, or streaming iterators.",
    },
    {
      question: "Can you walk through how you diagnosed and fixed the primary failing test case?",
      reason: "Verifies authentic problem solving vs memorized code patterns.",
      expectedAnswerHint: "Should clearly trace the error stack trace to the exact mathematical or logic bug.",
    },
  ];

  if (aiSnippetEvents.length > 0) {
    dynamicQuestions.push({
      question: "You leveraged the AI Copilot during the session. What safety, boundary, or complexity risks did you audit before accepting the suggested code?",
      reason: "Forensic test of AI Supervision Benchmark and candidate code auditing vigilance.",
      expectedAnswerHint: "Candidate should detail the specific boundary edge case or security check they verified in the generated snippet.",
    });
  } else if (failingTests.length > 1) {
    dynamicQuestions.push({
      question: "We noted several test assertion failures during your iterations. How did your debugging strategy evolve to achieve a stable green test run?",
      reason: "Evaluates Resilience Coefficient (RC) and systematic failure recovery.",
      expectedAnswerHint: "Should describe step-by-step hypothesis validation rather than random trial-and-error edits.",
    });
  } else {
    dynamicQuestions.push({
      question: "How would your implementation behave under concurrent high-throughput request spikes or race conditions?",
      reason: "Probes distributed systems knowledge and thread safety awareness.",
      expectedAnswerHint: "Should mention atomic operations, transactional isolation, or distributed locking mechanisms.",
    });
  }

  return {
    overallScore,
    proficiencyTier: proficiency,
    integrityClassification: classification,
    integrityScore,
    codeQualityRating: proficiency === "Senior" ? "Exceptional" : proficiency === "Intermediate" ? "Clean" : "Adequate",
    timeComplexity: "O(N) Optimal",
    spaceComplexity: "O(1) Memory Efficient",
    behavioralSummary: `${req.candidateName} completed the assessment in ${Math.round(req.durationSeconds / 60)} minutes with a ${req.stabilityScore}% code stability rating. Classified by Random Forest as ${classification.toLowerCase()} (${mlResult.confidence}% confidence).`,
    anomalyEvents: anomalies,
    strengths: [
      "Systematic incremental debugging and test execution",
      "Clean adherence to framework coding conventions",
      "High solution stability under test validation",
    ],
    growthAreas: [
      "Could add explicit edge case assertions for null parameters",
      "Consider defensive programming around external boundary inputs",
    ],
    interviewQuestions: dynamicQuestions,
    mlPrediction: mlResult,
    engineeringIndices,
  };
}

export interface AISocraticHintRequest {
  challengeId?: string;
  challengeName: string;
  activeFile: string;
  code: string;
  errorOutput?: string;
  hintLevel: 1 | 2 | 3; // 1: Conceptual, 2: Location/Inspection, 3: Logic Clue
  framework?: string;
}

// ---------------------------------------------------------------------------
// 4. AI Socratic Hint Mentor & Error Explainer
// ---------------------------------------------------------------------------
export async function getSocraticHintWithAI(req: AISocraticHintRequest): Promise<AISocraticHintResult> {
  const levelNames = ["Conceptual Nudge", "Target Inspection", "Logic Clue"] as const;
  const currentTitle = levelNames[req.hintLevel - 1] || "Debugging Guidance";

  const systemPrompt = `You are a Socratic AI programming mentor for an engineering candidate.
The candidate is solving challenge: "${req.challengeName}" (${req.framework || "Standard"}).
Provide progressive guidance based on hintLevel (1 = gentle conceptual nudge, 2 = identify file and line area to inspect, 3 = explain logic bug without writing code).
DO NOT give the full code solution. Guide them Socratically.
Respond ONLY with JSON:
{
  "hintLevel": ${req.hintLevel},
  "title": "${currentTitle}",
  "hintText": "Socratic hint text with specific guidance for the problem.",
  "encouragement": "Encouraging short sentence."
}`;

  const userPrompt = `Active File: ${req.activeFile}\nFramework: ${req.framework || "Standard"}\nCode snippet:\n${req.code.slice(0, 1000)}\nError Output:\n${req.errorOutput || "None"}\nHint Level: ${req.hintLevel}`;

  const rawJson = await callLLM(systemPrompt, userPrompt);
  if (rawJson) {
    try {
      const cleaned = rawJson.replace(/^```json/m, "").replace(/^```/m, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.hintText) {
        return {
          hintLevel: req.hintLevel,
          title: parsed.title || currentTitle,
          hintText: parsed.hintText,
          encouragement: parsed.encouragement || "Keep investigating, you're making steady progress!",
        };
      }
    } catch (e) {
      console.warn("LLM Socratic hint parse error:", e);
    }
  }

  // Built-in Repository & Framework-Aware Intelligent Socratic Fallbacks
  const cName = (req.challengeName || "").toLowerCase();
  const fName = (req.framework || "").toLowerCase();
  const file = req.activeFile || "code";

  if (cName.includes("django") || fName.includes("django")) {
    if (req.hintLevel === 1) {
      return {
        hintLevel: 1,
        title: "Step 1: Conceptual Guidance",
        hintText: `Examine the arithmetic and coupon rules in \`models.py\`. Notice how subtotal calculation should multiply quantity by unit price, and discounts must be percentage fractions (divided by 100).`,
        encouragement: "Review each formula step-by-step to match real-world e-commerce expectations.",
      };
    } else if (req.hintLevel === 2) {
      return {
        hintLevel: 2,
        title: "Step 2: Area of Inspection",
        hintText: `In \`models.py\`, check: 1) \`OrderItem.get_subtotal()\`, 2) \`Coupon.apply_discount()\` for the active status check (\`self.is_active\`), and 3) \`Order.calculate_total()\` when \`self.coupon\` is None.`,
        encouragement: "Inspect the guard clauses before accessing object attributes.",
      };
    } else {
      return {
        hintLevel: 3,
        title: "Step 3: Logic Clue",
        hintText: `Fixes needed: 1) return \`self.unit_price * self.quantity\`, 2) \`discount_percentage / 100.0\`, 3) if \`not self.is_active\` return \`price\` untouched, 4) in \`calculate_total()\`, check \`if self.coupon:\` before calling \`apply_discount()\`.`,
        encouragement: "Make these adjustments and run 'python manage.py test' to watch the tests pass!",
      };
    }
  }

  if (cName.includes("express") || fName.includes("express") || cName.includes("node")) {
    if (req.hintLevel === 1) {
      return {
        hintLevel: 1,
        title: "Step 1: Conceptual Guidance",
        hintText: `Review standard HTTP Authorization header formatting ("Bearer <token>") and verify how in-memory request counting tracks incoming traffic.`,
        encouragement: "Think about how tokens are delimited and how counters accumulate over time.",
      };
    } else if (req.hintLevel === 2) {
      return {
        hintLevel: 2,
        title: "Step 2: Area of Inspection",
        hintText: `In \`middleware.js\`, check the delimiter used in \`header.split()\` and how \`requestCounts.set()\` is updating the count. In \`routes.js\`, verify the HTTP status code returned when a user record is missing.`,
        encouragement: "Check the exact string splitting method and HTTP 404/429 status requirements.",
      };
    } else {
      return {
        hintLevel: 3,
        title: "Step 3: Logic Clue",
        hintText: `1) Split \`header.split(" ")\` (space instead of comma), 2) In \`rateLimiter\`, increment \`requestCounts.set(ip, current + 1)\` and return \`res.status(429).json({ error: "Too Many Requests" })\` when exceeding limit, 3) Return \`res.status(404).json(...)\` for unknown users.`,
        encouragement: "Save & Run the tests to confirm all 3 Express assertions turn green!",
      };
    }
  }

  if (cName.includes("spring") || fName.includes("spring") || cName.includes("java")) {
    if (req.hintLevel === 1) {
      return {
        hintLevel: 1,
        title: "Step 1: Conceptual Guidance",
        hintText: `Look at percentage scaling for tax rates and ensure discount applications never produce invalid negative balances.`,
        encouragement: "Double-check how Java handles null collections and percentage calculations.",
      };
    } else if (req.hintLevel === 2) {
      return {
        hintLevel: 2,
        title: "Step 2: Area of Inspection",
        hintText: `In \`OrderService.java\`, inspect \`calculateSubtotal()\` when \`prices\` is null, \`calculateTax()\` for percentage conversion, and \`applyDiscount()\` to clamp negative balances.`,
        encouragement: "Add defensive guard checks for null references and negative bounds.",
      };
    } else {
      return {
        hintLevel: 3,
        title: "Step 3: Logic Clue",
        hintText: `1) Check \`if (prices == null) return 0.0;\`, 2) Multiply by \`(taxRatePercentage / 100.0)\`, 3) Return \`Math.max(0.0, subtotal - discountAmount)\` to prevent negative totals.`,
        encouragement: "Run the test runner to verify all Spring Boot test cases pass!",
      };
    }
  }

  if (cName.includes("fastapi") || fName.includes("fastapi") || cName.includes("crud")) {
    if (req.hintLevel === 1) {
      return {
        hintLevel: 1,
        title: "Step 1: Conceptual Guidance",
        hintText: `Review input validation rules in \`schemas.py\` and default pagination boundaries in \`main.py\`.`,
        encouragement: "Verify edge conditions like zero/negative numbers and missing lookup keys.",
      };
    } else if (req.hintLevel === 2) {
      return {
        hintLevel: 2,
        title: "Step 2: Area of Inspection",
        hintText: `In \`schemas.py\`, check the boundary condition on \`self.price\`. In \`main.py\`, inspect the default parameter value for \`limit\` and how missing items in \`items_db\` are handled.`,
        encouragement: "Examine the failing unit test assertions for exact expected outputs.",
      };
    } else {
      return {
        hintLevel: 3,
        title: "Step 3: Logic Clue",
        hintText: `1) In \`schemas.py\`, check \`if self.price <= 0: raise ValidationError(...)\`, 2) In \`main.py\`, default \`limit: int = 10\`, 3) If \`item_id not in items_db\`, return a 404 error dict or raise an appropriate exception.`,
        encouragement: "Save your changes and run the test suite to verify the fixes!",
      };
    }
  }

  // Universal Fallback
  if (req.hintLevel === 1) {
    return {
      hintLevel: 1,
      title: "Step 1: Conceptual Guidance",
      hintText: `Carefully review the function signatures and business logic in \`${file}\`. Verify that input types, calculation formulas, and edge cases match the problem specifications.`,
      encouragement: "Break down the failing assertions into individual logical steps.",
    };
  } else if (req.hintLevel === 2) {
    return {
      hintLevel: 2,
      title: "Step 2: Area of Inspection",
      hintText: `Inspect the return statements and branching conditions in \`${file}\`. Check for unhandled edge cases such as null/empty values, off-by-one errors, or incorrect operator usage.`,
      encouragement: "Check the terminal test output to see which specific assertion failed.",
    };
  } else {
    return {
      hintLevel: 3,
      title: "Step 3: Logic Clue",
      hintText: `Add defensive guard clauses (verifying object existence before calling methods or accessing properties) and ensure data transforms correctly without unintended side effects.`,
      encouragement: "Apply the guard check and trigger 'Save & Run' to verify all test cases pass!",
    };
  }
}

export async function explainErrorWithAI(req: AIExplainErrorRequest): Promise<AIExplainErrorResult> {
  const errorText = req.errorOutput || "Unknown execution error";

  const systemPrompt = `You are an expert compiler and runtime debugger. Explain this error message clearly and concisely to a software candidate.
Respond ONLY with JSON:
{
  "summary": "1-sentence plain English summary of what went wrong",
  "rootCause": "Why this specific error occurred in the execution context",
  "suggestedFixDirections": ["Actionable step 1", "Actionable step 2"]
}`;

  const userPrompt = `Language/Framework: ${req.language || "Python"} / ${req.framework || "Standard"}\nError:\n${errorText.slice(0, 1500)}`;

  const rawJson = await callLLM(systemPrompt, userPrompt);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed.summary && parsed.rootCause) return parsed;
    } catch (e) {
      console.warn("LLM explain error parse error:", e);
    }
  }

  // Built-in Error Explainer Fallback
  let summary = "The execution failed due to an assertion or runtime exception.";
  let rootCause = "The actual returned output did not match the expected assertion value in the test runner.";

  if (errorText.includes("AssertionError") || errorText.includes("assertEqual")) {
    summary = "Test Assertion Failed: Expected output did not match actual output.";
    rootCause = "A calculation or condition in your code produced an unexpected numeric value or status code.";
  } else if (errorText.includes("AttributeError") || errorText.includes("NullPointerException") || errorText.includes("TypeError")) {
    summary = "Null Pointer / Type Error encountered during execution.";
    rootCause = "A method or property was accessed on a variable that evaluates to None or null.";
  } else if (errorText.includes("SyntaxError") || errorText.includes("g++") || errorText.includes("javac")) {
    summary = "Compilation or Syntax Error.";
    rootCause = "The code failed to compile. Check for mismatched braces, missing semicolons, or invalid syntax.";
  }

  return {
    summary,
    rootCause,
    suggestedFixDirections: [
      "Check the exact line number referenced in the stack trace.",
      "Add guard checks to prevent calling methods on null/None objects.",
      "Verify mathematical formulas and return values against test expectations.",
    ],
  };
}

// ---------------------------------------------------------------------------
// 5. AI-Supervision Benchmark: Trap Injection Engine
// ---------------------------------------------------------------------------
export async function generateCopilotSnippetWithTrap(req: AICopilotSnippetRequest): Promise<AICopilotSnippetResult> {
  const challenge = (req.challengeName || req.challengeId || "").toLowerCase();
  const file = (req.activeFile || "").toLowerCase();
  const framework = (req.framework || "").toLowerCase();

  const trapId = `TRAP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

  // Pattern 1: Django / Python models & calculations -> Off-by-one / boundary edge case trap
  if (challenge.includes("django") || file.includes("models.py") || framework.includes("django")) {
    return {
      trapId,
      trapType: "BOUNDARY_OFF_BY_ONE",
      trapDescription: "Subtle coupon discount percentage bug: multiplies by raw percentage rather than dividing by 100, and allows negative total bounds.",
      trapToken: "discount_percentage * price",
      snippet: `    def apply_discount(self, price: float) -> float:
        # AI Copilot Suggested Implementation
        if not self.is_active:
            return price
        # Subtle calculation: verify fraction scaling
        discount_amount = price * (self.discount_percentage)
        return price - discount_amount`,
      explanation: "Computes order discount based on coupon active flag and percentage reduction.",
    };
  }

  // Pattern 2: FastAPI / TokenBucket Rate Limiter -> Starvation / Strict Inequality Boundary Trap
  if (challenge.includes("fastapi") || file.includes("limiter.py") || framework.includes("fastapi")) {
    return {
      trapId,
      trapType: "BOUNDARY_OFF_BY_ONE",
      trapDescription: "Boundary starvation bug: checks \`self.tokens > cost\` instead of \`>= cost\`, rejecting requests when tokens exactly equal cost.",
      trapToken: "if self.tokens > cost:",
      snippet: `    def consume(self, cost: int = 1) -> bool:
        # AI Copilot Suggested Implementation
        self.refill()
        # Verify boundary comparison:
        if self.tokens > cost:
            self.tokens -= cost
            return True
        return False`,
      explanation: "Atomically refills bucket and deducts cost when sufficient tokens are available.",
    };
  }

  // Pattern 3: Node / Express -> Missing Token Delimiter or SQL Injection
  if (challenge.includes("express") || file.includes("middleware.js") || file.includes("service.js")) {
    return {
      trapId,
      trapType: "SECURITY_SQLI",
      trapDescription: "Delimiter & sanitization trap: splits authorization header with comma delimiter instead of standard whitespace.",
      trapToken: 'header.split(",")',
      snippet: `function verifyAuthToken(req, res, next) {
  // AI Copilot Suggested Implementation
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "Missing token" });
  
  // Notice delimiter logic:
  const parts = header.split(",");
  const token = parts[1];
  if (!token) return res.status(401).json({ error: "Malformed auth header" });
  req.userToken = token;
  next();
}`,
      explanation: "Extracts and authenticates incoming Bearer token from authorization headers.",
    };
  }

  // Pattern 4: Spring Boot / Java -> Null Pointer Dereference Trap
  if (challenge.includes("spring") || file.includes(".java") || framework.includes("spring")) {
    return {
      trapId,
      trapType: "NULL_POINTER_DEREF",
      trapDescription: "Null pointer dereference: iterates prices collection without null guard check.",
      trapToken: "for (Double price : prices)",
      snippet: `    public double calculateSubtotal(List<Double> prices) {
        // AI Copilot Suggested Implementation
        double total = 0.0;
        // Direct iteration without checking for null input:
        for (Double price : prices) {
            total += price;
        }
        return total;
    }`,
      explanation: "Calculates total order sum across price collection elements.",
    };
  }

  // Universal Fallback: Quadratic O(N^2) Performance Trap
  return {
    trapId,
    trapType: "COMPLEXITY_QUADRATIC",
    trapDescription: "Quadratic scan trap: uses nested iteration over history list creating O(N^2) time complexity instead of an O(1) set lookup.",
    trapToken: "for past in history:",
    snippet: `def find_duplicate_records(records, history):
    # AI Copilot Suggested Implementation
    duplicates = []
    for item in records:
        # Nested scan introduces quadratic O(N^2) complexity:
        for past in history:
            if item.id == past.id:
                duplicates.append(item)
    return duplicates`,
    explanation: "Scans record list against historical entries to extract duplicate references.",
  };
}
