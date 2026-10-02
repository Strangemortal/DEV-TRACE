import { TerminalLine } from "@/components/MockTerminal";

export interface FileData {
  name: string;
  language: string;
  content: string;
  readOnly?: boolean;
}

export interface ExecutionResult {
  passed: boolean;
  message: string;
}

export interface Repository {
  id: string;
  name: string;
  category: "python" | "cpp" | "java" | "web" | "node";
  framework?: "django" | "flask" | "fastapi" | "express" | "spring-boot" | "nextjs" | "vanilla" | "none";
  environmentLabel?: string;
  testCommand?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  activeFile: string;
  fileOrder: string[];
  readOnlyFiles?: string[];
  files: Record<string, FileData>;
  validateSave: (filename: string, src: string, ts: string) => TerminalLine[];
  checkExecution?: (stdout: string, stderr: string) => ExecutionResult;
}

export function isReadOnlyFile(filename: string, repo?: any): boolean {
  if (!filename) return false;
  if (filename === "README.md" || filename.endsWith(".md")) return true;
  if (repo?.readOnlyFiles && Array.isArray(repo.readOnlyFiles) && repo.readOnlyFiles.includes(filename)) return true;
  if (repo?.files?.[filename]?.readOnly) return true;
  
  // Read-only test files and runner infrastructure
  const lower = filename.toLowerCase();
  if (
    lower.startsWith("test_") ||
    lower.endsWith("_test.py") ||
    lower.endsWith(".test.ts") ||
    lower.endsWith(".test.js") ||
    lower === "tests.py" ||
    lower === "test.js" ||
    lower === "test_actions.js" ||
    lower === "test_main.py" ||
    lower === "test_app.py" ||
    lower === "orderapplicationtests.java" ||
    lower === "manage.py" ||
    lower === "settings.py"
  ) {
    return true;
  }
  return false;
}

export const REPOSITORIES: Repository[] = [
  // ── 1. DJANGO FRAMEWORK CHALLENGES ─────────────────────────────────────────
  {
    id: "django-orm-store",
    name: "Django Store & Coupon Calculator (Django)",
    category: "python",
    framework: "django",
    environmentLabel: "Django 5.0 + SQLite Sandbox",
    testCommand: "python manage.py test",
    difficulty: "Intermediate",
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "models.py", "views.py", "tests.py", "settings.py", "manage.py"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Django Store & Coupon Calculator

Welcome to the **DevTrace Django Assessment Environment**!

This challenge runs in an **isolated Django test environment** configured with an in-memory SQLite database and the standard Django test runner.

## 🎯 The Mission
The e-commerce checkout service in \`models.py\` is failing test assertions and crashing on checkout.

Fix the following bugs:
1. **Subtotal Calculation** in \`OrderItem.get_subtotal()\`: It is adding price and quantity instead of multiplying them.
2. **Coupon Percentage Calculation** in \`Coupon.apply_discount()\`: The discount percentage is not being divided by 100.
3. **Inactive Coupon Leak**: \`Coupon.apply_discount()\` does not verify if \`self.is_active\` is \`True\`. If inactive, return the original price.
4. **Null Coupon Crash** in \`Order.calculate_total()\`: Calling \`self.coupon.apply_discount()\` crashes with an \`AttributeError\` when \`self.coupon\` is \`None\`.

---

## 🧪 Running Tests
Press **Save & Run** (or \`Ctrl+S\` / \`Cmd+S\`) to trigger \`python manage.py test\` inside the Django sandbox.
All 4 test cases in \`tests.py\` must pass!
`
      },
      "models.py": {
        name: "models.py",
        language: "python",
        content: `from django.db import models

class Coupon(models.Model):
    code = models.CharField(max_length=20, unique=True)
    discount_percentage = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "store"

    def apply_discount(self, original_price):
        # BUG 1: Missing check for self.is_active (if inactive, should return original_price)
        # BUG 2: Not dividing discount_percentage by 100.0
        discount_amount = original_price * self.discount_percentage
        return original_price - discount_amount

class OrderItem(models.Model):
    name = models.CharField(max_length=100)
    unit_price = models.FloatField()
    quantity = models.IntegerField(default=1)

    class Meta:
        app_label = "store"

    def get_subtotal(self):
        # BUG 3: Added unit_price and quantity instead of multiplying them
        return self.unit_price + self.quantity

class Order(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        app_label = "store"

    def calculate_total(self, items):
        total = sum(item.get_subtotal() for item in items)
        # BUG 4: Crashes with AttributeError when self.coupon is None
        total = self.coupon.apply_discount(total)
        return round(total, 2)
`
      },
      "views.py": {
        name: "views.py",
        language: "python",
        content: `from models import Coupon, Order, OrderItem

def create_order_summary(items_data, coupon_code=None):
    items = []
    for item in items_data:
        items.append(OrderItem(
            name=item.get("name", "Item"),
            unit_price=float(item.get("price", 0.0)),
            quantity=int(item.get("quantity", 1))
        ))
    
    coupon = None
    if coupon_code:
        try:
            coupon = Coupon.objects.get(code=coupon_code)
        except Coupon.DoesNotExist:
            coupon = None

    order = Order(coupon=coupon)
    return {
        "item_count": len(items),
        "total": order.calculate_total(items),
        "coupon_applied": coupon.code if (coupon and coupon.is_active) else None
    }
`
      },
      "tests.py": {
        name: "tests.py",
        language: "python",
        content: `from django.test import TestCase
from models import Coupon, Order, OrderItem
from views import create_order_summary

class DjangoStoreTests(TestCase):
    def setUp(self):
        self.coupon_20 = Coupon.objects.create(code="SAVE20", discount_percentage=20.0, is_active=True)
        self.expired_coupon = Coupon.objects.create(code="EXPIRED50", discount_percentage=50.0, is_active=False)

    def test_item_subtotal_multiplication(self):
        item = OrderItem(name="Keyboard", unit_price=45.0, quantity=3)
        self.assertEqual(item.get_subtotal(), 135.0, "Subtotal must be unit_price * quantity (45.0 * 3 = 135.0)")

    def test_coupon_discount_calculation(self):
        discounted = self.coupon_20.apply_discount(100.0)
        self.assertEqual(discounted, 80.0, "20% discount on $100.0 must be $80.0")
        
        inactive_result = self.expired_coupon.apply_discount(100.0)
        self.assertEqual(inactive_result, 100.0, "Inactive coupon should return original price with 0 discount")

    def test_order_total_without_coupon(self):
        items = [
            OrderItem(name="Mouse", unit_price=25.0, quantity=2),
            OrderItem(name="Pad", unit_price=10.0, quantity=1),
        ]
        order = Order(coupon=None)
        total = order.calculate_total(items)
        self.assertEqual(total, 60.0, "Total of $50 + $10 with no coupon must equal $60.0")

    def test_order_summary_service(self):
        items_payload = [
            {"name": "Laptop Stand", "price": 50.0, "quantity": 2},
        ]
        summary = create_order_summary(items_payload, coupon_code="SAVE20")
        self.assertEqual(summary["total"], 80.0)
        self.assertEqual(summary["coupon_applied"], "SAVE20")
`
      },
      "settings.py": {
        name: "settings.py",
        language: "python",
        content: `SECRET_KEY = "django-insecure-devtrace-key"
DEBUG = True
ALLOWED_HOSTS = ["*"]
INSTALLED_APPS = ["django.contrib.contenttypes", "django.contrib.auth", "store"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
USE_TZ = True
`
      },
      "manage.py": {
        name: "manage.py",
        language: "python",
        content: `#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      const allOutput = (stdout + " " + stderr);
      if (allOutput.includes("OK") || (allOutput.includes("Ran 4 tests") && !allOutput.includes("FAIL") && !allOutput.includes("ERROR"))) {
        return { passed: true, message: "All Django TestCase assertions passed! In-memory DB tests successful." };
      }
      return { passed: false, message: "Django test assertions failed. Check models and calculations." };
    }
  },

  // ── 2. NODE.JS / EXPRESS FRAMEWORK CHALLENGE ───────────────────────────────
  {
    id: "express-auth-api",
    name: "Express.js REST API & Rate Limiter (Node.js)",
    category: "node",
    framework: "express",
    environmentLabel: "Node 20 + Express.js Sandbox",
    testCommand: "node test.js",
    difficulty: "Intermediate",
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "app.js", "middleware.js", "routes.js", "test.js"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Express.js REST API & Rate Limiter

Welcome to the **Node.js / Express Assessment Sandbox**!

## 🎯 The Mission
The authentication and rate limiting layer in \`middleware.js\` and \`routes.js\` is failing test assertions.

Fix the following bugs:
1. **Bearer Token Extraction** in \`middleware.js\`: It splits \`req.headers.authorization\` by comma (\`,\`) instead of space (\` \`).
2. **Rate Limiter Count** in \`middleware.js\`: It resets request counts incorrectly instead of incrementing. If request count exceeds \`maxLimit\`, return HTTP \`429\` status with \`{ error: "Too Many Requests" }\`.
3. **User Profile Lookup** in \`routes.js\`: Returns \`200\` with empty body instead of \`404\` when user ID is not found.
`
      },
      "app.js": {
        name: "app.js",
        language: "javascript",
        content: `const express = require('express');
const { authMiddleware, rateLimiter } = require('./middleware');
const { router } = require('./routes');

const app = express();
app.use(express.json());
app.use('/api', rateLimiter(10), router);

module.exports = app;
`
      },
      "middleware.js": {
        name: "middleware.js",
        language: "javascript",
        content: `const requestCounts = new Map();

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  // BUG 1: Splits by comma instead of whitespace
  const parts = header.split(",");
  if (parts.length !== 2 || parts[0].trim() !== "Bearer") {
    return res.status(401).json({ error: "Invalid token format" });
  }

  req.token = parts[1].trim();
  next();
}

function rateLimiter(maxRequests = 5) {
  return (req, res, next) => {
    const ip = req.ip || "127.0.0.1";
    const current = requestCounts.get(ip) || 0;

    // BUG 2: Sets to 1 instead of incrementing (current + 1)
    // BUG 3: Does not return 429 when current >= maxRequests
    requestCounts.set(ip, 1);
    
    next();
  };
}

module.exports = { authMiddleware, rateLimiter, requestCounts };
`
      },
      "routes.js": {
        name: "routes.js",
        language: "javascript",
        content: `const express = require('express');
const { authMiddleware } = require('./middleware');
const router = express.Router();

const usersDb = {
  "u1": { id: "u1", name: "Alice", email: "alice@devtrace.io" },
  "u2": { id: "u2", name: "Bob", email: "bob@devtrace.io" }
};

router.get('/profile/:id', authMiddleware, (req, res) => {
  const user = usersDb[req.params.id];
  // BUG 4: Returns 200 even if user is not found
  if (!user) {
    return res.status(200).json({}); // Fix: return res.status(404).json({ error: "User not found" });
  }
  res.status(200).json(user);
});

module.exports = { router };
`
      },
      "test.js": {
        name: "test.js",
        language: "javascript",
        content: `const assert = require('assert');
const { authMiddleware, rateLimiter, requestCounts } = require('./middleware');

console.log("Running Express.js Test Suite...");

// Test 1: Auth Bearer token extraction
{
  let nextCalled = false;
  const req = { headers: { authorization: "Bearer secret_jwt_token_123" } };
  const res = { status: (code) => ({ json: (d) => {} }) };
  authMiddleware(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, true, "Valid Bearer header should invoke next()");
  assert.strictEqual(req.token, "secret_jwt_token_123", "Bearer token must be extracted cleanly");
  console.log("✓ Test 1 Passed: Bearer Token Parser");
}

// Test 2: Invalid Auth Header
{
  let statusCode = 0;
  const req = { headers: { authorization: "Basic username:password" } };
  const res = { status: (code) => { statusCode = code; return { json: () => {} }; } };
  authMiddleware(req, res, () => {});
  assert.strictEqual(statusCode, 401, "Non-bearer authorization must return 401");
  console.log("✓ Test 2 Passed: Invalid Auth Rejection");
}

// Test 3: Rate Limiter tracking and limit rejection
{
  requestCounts.clear();
  const limiter = rateLimiter(2);
  let blocked = false;
  const req = { ip: "192.168.1.50" };
  const res = { status: (code) => ({ json: () => { if (code === 429) blocked = true; } }) };

  limiter(req, res, () => {}); // req 1
  limiter(req, res, () => {}); // req 2
  limiter(req, res, () => {}); // req 3 - should be rejected

  assert.strictEqual(blocked, true, "3rd request exceeding maxLimit(2) must return 429 Too Many Requests");
  console.log("✓ Test 3 Passed: Rate Limiting Enforcement");
}

console.log("\nALL 3 EXPRESS.JS TESTS PASSED SUCCESSFULLY! (OK)");
`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.includes("ALL 3 EXPRESS.JS TESTS PASSED") || stdout.includes("(OK)")) {
        return { passed: true, message: "All Express.js API and middleware test assertions passed!" };
      }
      return { passed: false, message: "Express test assertions failed. Check middleware and status codes." };
    }
  },

  // ── 3. JAVA / SPRING BOOT FRAMEWORK CHALLENGE ──────────────────────────────
  {
    id: "spring-boot-order-service",
    name: "Spring Boot Order Service & Tax Calc (Java)",
    category: "java",
    framework: "spring-boot",
    environmentLabel: "Java 17 + Spring Boot Sandbox",
    testCommand: "javac *.java && java OrderApplicationTests",
    difficulty: "Advanced",
    estimatedTime: "30m",
    activeFile: "README.md",
    fileOrder: ["README.md", "OrderService.java", "OrderController.java", "OrderApplicationTests.java"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Spring Boot Order Service & Tax Calculation

Welcome to the **Spring Boot & Java Assessment Sandbox**!

## 🎯 The Mission
The e-commerce service layer in \`OrderService.java\` contains arithmetic and validation bugs:
1. **Tax Calculation**: \`calculateTax(subtotal, taxRate)\` multiplies \`subtotal * taxRate\` directly without dividing \`taxRate / 100.0\`.
2. **Discount Clamping**: \`applyDiscount(subtotal, discountAmount)\` allows negative totals when discount exceeds subtotal.
3. **Empty Item Protection**: \`calculateSubtotal(prices)\` throws \`NullPointerException\` if the list is null.

Fix the bugs in \`OrderService.java\` and run the Java test suite!
`
      },
      "OrderService.java": {
        name: "OrderService.java",
        language: "java",
        content: `import java.util.List;

public class OrderService {

    // BUG 1: Returns 0 or crashes if prices is null
    public double calculateSubtotal(List<Double> prices) {
        double sum = 0.0;
        for (Double price : prices) {
            sum += price;
        }
        return sum;
    }

    // BUG 2: Tax rate percentage is multiplied directly (e.g. subtotal * 10 instead of subtotal * 0.10)
    public double calculateTax(double subtotal, double taxRatePercentage) {
        return subtotal * taxRatePercentage; // Fix: subtotal * (taxRatePercentage / 100.0)
    }

    // BUG 3: Allows negative total if discount exceeds subtotal
    public double applyDiscount(double subtotal, double discountAmount) {
        return subtotal - discountAmount; // Fix: Math.max(0.0, subtotal - discountAmount)
    }

    public double calculateFinalTotal(List<Double> prices, double taxRate, double discount) {
        double subtotal = calculateSubtotal(prices);
        double discounted = applyDiscount(subtotal, discount);
        double tax = calculateTax(discounted, taxRate);
        return Math.round((discounted + tax) * 100.0) / 100.0;
    }
}
`
      },
      "OrderController.java": {
        name: "OrderController.java",
        language: "java",
        content: `import java.util.List;

public class OrderController {
    private final OrderService orderService = new OrderService();

    public double checkout(List<Double> itemPrices, double taxRate, double discount) {
        return orderService.calculateFinalTotal(itemPrices, taxRate, discount);
    }
}
`
      },
      "OrderApplicationTests.java": {
        name: "OrderApplicationTests.java",
        language: "java",
        content: `import java.util.Arrays;
import java.util.Collections;

public class OrderApplicationTests {

    public static void main(String[] args) {
        OrderService service = new OrderService();
        int passed = 0;

        // Test 1: Subtotal with null check
        try {
            double nullTotal = service.calculateSubtotal(null);
            if (nullTotal == 0.0) {
                System.out.println("✓ Test 1 Passed: Null price list handled safely");
                passed++;
            } else {
                System.err.println("✕ Test 1 Failed: Null list should return 0.0");
            }
        } catch (NullPointerException e) {
            System.err.println("✕ Test 1 Failed: NullPointerException on null list");
        }

        // Test 2: Tax calculation
        double tax = service.calculateTax(100.0, 8.5); // 8.5% tax on 100 = 8.5
        if (Math.abs(tax - 8.5) < 0.001) {
            System.out.println("✓ Test 2 Passed: Tax percentage calculation accurate");
            passed++;
        } else {
            System.err.println("✕ Test 2 Failed: Expected 8.5 tax, got: " + tax);
        }

        // Test 3: Discount clamping
        double clamped = service.applyDiscount(50.0, 75.0);
        if (clamped == 0.0) {
            System.out.println("✓ Test 3 Passed: Excessive discount clamped to 0.0");
            passed++;
        } else {
            System.err.println("✕ Test 3 Failed: Total went negative: " + clamped);
        }

        // Test 4: Final Total Integration
        double finalTotal = service.calculateFinalTotal(Arrays.asList(40.0, 60.0), 10.0, 20.0);
        // (100 - 20) = 80. Tax = 8. Total = 88.0
        if (Math.abs(finalTotal - 88.0) < 0.01) {
            System.out.println("✓ Test 4 Passed: Final order calculation integration accurate");
            passed++;
        } else {
            System.err.println("✕ Test 4 Failed: Expected 88.0, got: " + finalTotal);
        }

        if (passed == 4) {
            System.out.println("\nALL 4 SPRING BOOT ORDER TESTS PASSED! (OK)");
        } else {
            System.exit(1);
        }
    }
}
`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.includes("ALL 4 SPRING BOOT ORDER TESTS PASSED") || stdout.includes("(OK)")) {
        return { passed: true, message: "All Spring Boot / Java order service tests passed!" };
      }
      return { passed: false, message: "Java order service tests failed. Check calculations and null checks." };
    }
  },

  // ── 4. FASTAPI FRAMEWORK CHALLENGE ─────────────────────────────────────────
  {
    id: "fastapi-async-crud",
    name: "FastAPI Async CRUD & Pydantic Validator (FastAPI)",
    category: "python",
    framework: "fastapi",
    environmentLabel: "Python 3.11 + FastAPI Sandbox",
    testCommand: "python test_main.py",
    difficulty: "Intermediate",
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.py", "schemas.py", "test_main.py"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# FastAPI Async Endpoints & Schema Validation

Welcome to the **FastAPI Sandbox**!

## 🎯 The Mission
The item catalog service in \`schemas.py\` and \`main.py\` is failing validation tests:
1. **Pydantic Validation** in \`schemas.py\`: \`price\` validator allows negative numbers.
2. **Missing Item Status** in \`main.py\`: \`get_item(item_id)\` returns \`200\` with \`None\` instead of raising \`HTTPException(status_code=404)\`.
3. **Default Pagination** in \`main.py\`: \`limit\` defaults to \`0\` which returns an empty list instead of defaulting to \`10\`.
`
      },
      "schemas.py": {
        name: "schemas.py",
        language: "python",
        content: `class ValidationError(Exception):
    pass

class ItemCreate:
    def __init__(self, title: str, price: float, tags: list = None):
        self.title = title
        self.price = price
        self.tags = tags or []
        self.validate()

    def validate(self):
        if not self.title or len(self.title.strip()) < 2:
            raise ValidationError("Title must be at least 2 characters.")
        # BUG 1: Allows negative prices
        if self.price < -100: # Fix: if self.price <= 0:
            raise ValidationError("Price must be greater than zero.")
`
      },
      "main.py": {
        name: "main.py",
        language: "python",
        content: `from schemas import ItemCreate, ValidationError

items_db = {
    1: {"id": 1, "title": "Mechanical Keyboard", "price": 89.99},
    2: {"id": 2, "title": "Ergonomic Mouse", "price": 49.99},
}

def get_items(skip: int = 0, limit: int = 0): # BUG 2: limit defaults to 0 instead of 10
    all_items = list(items_db.values())
    if limit <= 0:
        return []
    return all_items[skip : skip + limit]

def get_item_by_id(item_id: int):
    # BUG 3: Returns 200 None instead of raising error/404 dict
    if item_id not in items_db:
        return {"status_code": 200, "data": None} # Fix: return {"status_code": 404, "error": "Not Found"}
    return {"status_code": 200, "data": items_db[item_id]}

def create_item(item_data: dict):
    try:
        validated = ItemCreate(**item_data)
        new_id = max(items_db.keys()) + 1
        items_db[new_id] = {"id": new_id, "title": validated.title, "price": validated.price}
        return {"status_code": 201, "data": items_db[new_id]}
    except ValidationError as e:
        return {"status_code": 422, "error": str(e)}
`
      },
      "test_main.py": {
        name: "test_main.py",
        language: "python",
        content: `from main import get_items, get_item_by_id, create_item
from schemas import ItemCreate, ValidationError

print("Running FastAPI Test Suite...")

# Test 1: Negative Price Validation
try:
    ItemCreate(title="Test Item", price=-15.0)
    print("✕ Test 1 Failed: Negative price was accepted")
    exit(1)
except ValidationError:
    print("✓ Test 1 Passed: Negative price rejected by schema")

# Test 2: Item Not Found 404 Status
res = get_item_by_id(999)
assert res["status_code"] == 404, f"Expected 404, got {res['status_code']}"
print("✓ Test 2 Passed: 404 Returned for non-existent item")

# Test 3: Default Pagination
items = get_items()
assert len(items) > 0, "Default get_items() should return populated list"
print("✓ Test 3 Passed: Pagination defaults functioning")

print("\nALL 3 FASTAPI TESTS PASSED! (OK)")
`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.includes("ALL 3 FASTAPI TESTS PASSED") || stdout.includes("(OK)")) {
        return { passed: true, message: "All FastAPI endpoint and schema tests passed successfully!" };
      }
      return { passed: false, message: "FastAPI tests failed. Check Pydantic validation and 404 status." };
    }
  },

  // ── 5. FLASK RESTFUL INVENTORY (PYTHON) ────────────────────────────────────
  {
    id: "flask-inventory-api",
    name: "Flask RESTful Inventory & Blueprint (Flask)",
    category: "python",
    framework: "flask",
    environmentLabel: "Python 3.11 + Flask Sandbox",
    testCommand: "python test_app.py",
    difficulty: "Beginner",
    estimatedTime: "20m",
    activeFile: "README.md",
    fileOrder: ["README.md", "app.py", "routes.py", "test_app.py"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Flask RESTful Inventory Service

Welcome to the **Flask Assessment Sandbox**!

## 🎯 The Mission
Fix two bugs in the Flask inventory tracking blueprint in \`routes.py\`:
1. **Stock Depletion**: \`decrement_stock(item_id, quantity)\` allows stock to go below zero. If stock is insufficient, return \`{"error": "Insufficient stock"}, 400\`.
2. **Item Addition Status**: \`add_item()\` returns HTTP \`200\` instead of standard REST \`201 Created\`.
`
      },
      "app.py": {
        name: "app.py",
        language: "python",
        content: `from routes import inventory_blueprint

class FlaskMockApp:
    def __init__(self):
        self.blueprints = []
        self.register_blueprint(inventory_blueprint)

    def register_blueprint(self, bp):
        self.blueprints.append(bp)

app = FlaskMockApp()
`
      },
      "routes.py": {
        name: "routes.py",
        language: "python",
        content: `inventory_db = {
    "sku_1": {"name": "USB-C Cable", "stock": 10},
    "sku_2": {"name": "HDMI Adapter", "stock": 2},
}

class InventoryBlueprint:
    def decrement_stock(self, sku: str, amount: int):
        if sku not in inventory_db:
            return {"error": "Item not found"}, 404
            
        item = inventory_db[sku]
        # BUG 1: Does not check if amount > item["stock"]
        item["stock"] -= amount # Fix: check if item["stock"] < amount -> return {"error": "Insufficient stock"}, 400
        return {"sku": sku, "remaining_stock": item["stock"]}, 200

    def add_item(self, sku: str, name: str, stock: int):
        inventory_db[sku] = {"name": name, "stock": stock}
        # BUG 2: Returns 200 instead of 201
        return {"sku": sku, "status": "created"}, 200 # Fix: return ..., 201

inventory_blueprint = InventoryBlueprint()
`
      },
      "test_app.py": {
        name: "test_app.py",
        language: "python",
        content: `from routes import inventory_blueprint, inventory_db

print("Running Flask Test Suite...")

# Test 1: Over-depletion check
inventory_db["sku_2"]["stock"] = 2
res, status = inventory_blueprint.decrement_stock("sku_2", 5)
assert status == 400, f"Expected 400 for out-of-stock, got {status}"
assert inventory_db["sku_2"]["stock"] == 2, "Stock must not become negative"
print("✓ Test 1 Passed: Over-depletion prevented")

# Test 2: Valid decrement
res, status = inventory_blueprint.decrement_stock("sku_2", 1)
assert status == 200
assert res["remaining_stock"] == 1
print("✓ Test 2 Passed: Valid stock decrement")

# Test 3: 201 Created status
res, status = inventory_blueprint.add_item("sku_3", "Monitor Stand", 15)
assert status == 201, f"Expected 201 Created, got {status}"
print("✓ Test 3 Passed: 201 Created status returned")

print("\nALL 3 FLASK TESTS PASSED! (OK)")
`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.includes("ALL 3 FLASK TESTS PASSED") || stdout.includes("(OK)")) {
        return { passed: true, message: "All Flask inventory API tests passed successfully!" };
      }
      return { passed: false, message: "Flask test assertions failed. Check stock depletion and status codes." };
    }
  },

  // ── 6. NEXT.JS APP ROUTER & SERVER CACHING CHALLENGE ───────────────────────
  {
    id: "nextjs-api-cache",
    name: "Next.js 15 Server Actions & API Cache (Next.js)",
    category: "node",
    framework: "nextjs",
    environmentLabel: "Next.js 15 App Router Sandbox",
    testCommand: "node test_actions.js",
    difficulty: "Intermediate",
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "route.js", "actions.js", "test_actions.js"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Next.js 15 Server Actions & Cache Control

Welcome to the **Next.js 15 Assessment Sandbox**!

## 🎯 The Mission
Fix caching and validation bugs in \`route.js\` and \`actions.js\`:
1. **Cache Control Headers** in \`route.js\`: The \`s-maxage\` cache header is set to \`0\` instead of \`60\`.
2. **Server Action Form Validation** in \`actions.js\`: Missing email validation before writing to database.
`
      },
      "route.js": {
        name: "route.js",
        language: "javascript",
        content: `function GET() {
  const data = { timestamp: Date.now(), status: "operational" };
  
  // BUG 1: s-maxage is set to 0 instead of 60
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, s-maxage=0, stale-while-revalidate=30" // Fix: s-maxage=60
  };

  return { status: 200, body: JSON.stringify(data), headers };
}

module.exports = { GET };
`
      },
      "actions.js": {
        name: "actions.js",
        language: "javascript",
        content: `const subscribers = [];

async function subscribeNewsletter(formData) {
  'use server';
  const email = formData.get('email');
  
  // BUG 2: Accepts empty email or invalid email without @
  if (!email) { // Fix: if (!email || !email.includes('@'))
    return { success: false, error: "Valid email is required" };
  }

  subscribers.push(email.trim().toLowerCase());
  return { success: true, count: subscribers.length };
}

module.exports = { subscribeNewsletter, subscribers };
`
      },
      "test_actions.js": {
        name: "test_actions.js",
        language: "javascript",
        content: `const assert = require('assert');
const { GET } = require('./route');
const { subscribeNewsletter, subscribers } = require('./actions');

console.log("Running Next.js 15 Test Suite...");

// Test 1: Cache Control Header
const response = GET();
assert(response.headers['Cache-Control'].includes('s-maxage=60'), "Cache-Control must specify s-maxage=60 for edge caching");
console.log("✓ Test 1 Passed: Edge Cache Headers Valid");

// Test 2: Invalid Email Rejection
(async () => {
  const invalidForm = new Map([['email', 'not-an-email']]);
  const res = await subscribeNewsletter(invalidForm);
  assert.strictEqual(res.success, false, "Invalid email must be rejected");
  console.log("✓ Test 2 Passed: Server Action Email Validation");

  console.log("\nALL NEXT.JS 15 TESTS PASSED! (OK)");
})();
`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.includes("ALL NEXT.JS 15 TESTS PASSED") || stdout.includes("(OK)")) {
        return { passed: true, message: "All Next.js 15 App Router & cache tests passed!" };
      }
      return { passed: false, message: "Next.js tests failed. Check cache headers and validation." };
    }
  },

  // ── 7. STANDARD PYTHON CHALLENGES ──────────────────────────────────────────
  {
    id: "python-challenge",
    name: "Python Algorithmic Challenge (Backend)",
    category: "python",
    framework: "none",
    environmentLabel: "Python 3.9 Alpine Sandbox",
    difficulty: "Beginner",
    estimatedTime: "15m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.py"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: "# Python Challenge\nWrite a Python function that takes a string as input and returns the string reversed. Do not use any built-in `reverse` methods.\n\nEdit `main.py` and press `Cmd/Ctrl+S` or click Save to run your code."
      },
      "main.py": {
        name: "main.py",
        language: "python",
        content: `def reverse_string(s):
    pass

# Test cases
print(reverse_string("hello")) # Should print "olleh"
print(reverse_string("DevTrace")) # Should print "ecarTveD"`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      const hasOlleh = stdout.includes("olleh");
      const hasDevTrace = stdout.includes("ecarTveD");
      if (hasOlleh && hasDevTrace) {
        return { passed: true, message: "Perfect! All test cases passed for string reversal." };
      }
      return { passed: false, message: "The output doesn't match the expected reversed strings." };
    }
  },

  // ── 8. C++ CHALLENGES ──────────────────────────────────────────────────────
  {
    id: "cpp-array-reversal",
    name: "Array Reversal Bug (C++)",
    category: "cpp",
    framework: "none",
    environmentLabel: "GCC 12 Isolated Container",
    difficulty: "Beginner",
    estimatedTime: "15m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.cpp"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Array Reversal Bug\n\nThe \`reverseArray\` function should reverse \`{1, 2, 3, 4, 5}\` to print \`5 4 3 2 1\`, but it has two bugs that cause a crash and wrong output.\n\nEdit \`main.cpp\` and press Save to compile & run inside a GCC container.`
      },
      "main.cpp": {
        name: "main.cpp",
        language: "cpp",
        content: `#include <iostream>\nusing namespace std;\n\nvoid reverseArray(int arr[], int n) {\n    for (int i = 0; i < n; i++) {\n        int temp = arr[i];\n        arr[i]   = arr[n - i];\n        arr[n-i] = temp;\n    }\n}\n\nint main() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int n = 5;\n    reverseArray(arr, n);\n    for (int i = 0; i < n; i++) {\n        cout << arr[i];\n        if (i < n - 1) cout << " ";\n    }\n    cout << endl;\n    return 0;\n}`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.trim() === "5 4 3 2 1") {
        return { passed: true, message: "Perfect! Array reversed correctly." };
      }
      return { passed: false, message: "Expected '5 4 3 2 1'." };
    }
  },

  // ── 9. VANILLA WEB CHALLENGES ──────────────────────────────────────────────
  {
    id: "acme-corp",
    name: "AcmeCorp Landing (CSS/JS)",
    category: "web",
    framework: "vanilla",
    environmentLabel: "Web Live Preview Browser",
    difficulty: "Beginner",
    estimatedTime: "10m",
    activeFile: "README.md",
    fileOrder: ["README.md", "index.html", "style.css", "script.js"],
    files: {
      "index.html": {
        name: "index.html",
        language: "html",
        content: `<header class="header">Office Dashboard</header>\n<button id="send-btn">Send Message</button>`,
      },
      "style.css": {
        name: "style.css",
        language: "css",
        content: `.header {\n  position: fixed;\n  z-index: -1;\n  background: white;\n}`,
      },
      "script.js": {
        name: "script.js",
        language: "javascript",
        content: `document.getElementById('msg-btn').addEventListener('click', () => {\n  alert('Message Sent!');\n});`,
      },
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `Mission: The 'Send Message' button is broken and the layout is hidden. Fix the header layering and make the button work.`,
      },
    },
    validateSave: (filename, src, ts) => []
  }
];

export const BROKEN_REPO = REPOSITORIES[0].files;
export const FILE_ORDER = REPOSITORIES[0].fileOrder;
