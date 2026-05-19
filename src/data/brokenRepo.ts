import { TerminalLine } from "@/components/MockTerminal";

export interface FileData {
  name: string;
  language: string;
  content: string;
}

export interface ExecutionResult {
  passed: boolean;
  message: string;
}

export interface Repository {
  id: string;
  name: string;
  category: "python" | "cpp" | "java" | "web";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  activeFile: string;
  fileOrder: string[];
  files: Record<string, FileData>;
  validateSave: (filename: string, src: string, ts: string) => TerminalLine[];
  checkExecution?: (stdout: string, stderr: string) => ExecutionResult;
}

export const REPOSITORIES: Repository[] = [
  {
    id: "python-challenge",
    name: "Python Algorithmic Challenge (Backend)",
    category: "python",
    difficulty: "Beginner",
    estimatedTime: "15m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.py"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: "# Python Challenge\nWrite a Python function that takes a string as input and returns the string reversed. Do not use any built-in `reverse` methods.\n\nEdit \`main.py\` and press \`Cmd/Ctrl+S\` or click Save to run your code."
      },
      "main.py": {
        name: "main.py",
        language: "python",
        content: `def reverse_string(s):
    # Write your code here to reverse the string 's'
    pass

# Test cases
print(reverse_string("hello")) # Should print "olleh"
print(reverse_string("DevTrace")) # Should print "ecarTveD"`
      }
    },
    validateSave: (filename, src, ts) => {
      return [];
    },
    checkExecution: (stdout, stderr) => {
      const hasOlleh = stdout.includes("olleh");
      const hasDevTrace = stdout.includes("ecarTveD");
      if (hasOlleh && hasDevTrace) {
        return { passed: true, message: "Perfect! All test cases passed for string reversal." };
      }
      return { passed: false, message: "The output doesn't match the expected reversed strings." };
    }
  },
  {
    id: "python-data-analyzer",
    name: "Data Analyzer Pro (Python Fixes)",
    category: "python",
    difficulty: "Intermediate",
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.py"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Broken Data Analyzer\n\nOur new data analyzer script \`main.py\` is supposed to calculate the average age of a list of users, but it's crashing in production!`
      },
      "main.py": {
        name: "main.py",
        language: "python",
        content: `def calculate_average_age(users):
    total_age = 0
    count = 0
    
    for user in users:
        # BUG 1: 'age' might be missing from some user dictionaries
        # BUG 2: 'age' might be a string instead of an integer
        total_age += user['age']
        count += 1
        
    # BUG 3: Potential ZeroDivisionError if users list is empty
    return total_age / count

# Test Data
users_data = [
    {"name": "Alice", "age": 25},
    {"name": "Bob", "age": "30"},
    {"name": "Charlie"} # Missing age
]

print("Starting analysis...")
avg = calculate_average_age(users_data)
print(f"Average Age: {avg}")`
      }
    },
    validateSave: (filename, src, ts) => {
      return [];
    },
    checkExecution: (stdout, stderr) => {
      // 25 + 30 = 55. Average of 2 people = 27.5
      if (stdout.includes("Average Age: 27.5")) {
        return { passed: true, message: "Success! The analyzer is now handling messy data correctly." };
      }
      if (stderr) {
        return { passed: false, message: "The script is still crashing with errors." };
      }
      return { passed: false, message: "The calculated average age is incorrect." };
    }
  },
  {
    id: "python-secret-validator",
    name: "Secret Code Validator (Regex/Strings)",
    category: "python",
    difficulty: "Advanced",
    estimatedTime: "30m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.py"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Secret Code Validator\n\nFix the bugs to pass the validation tests.`
      },
      "main.py": {
        name: "main.py",
        language: "python",
        content: `def validate_secret_code(code):
    if not code:
        return False
        
    # BUG 1: Case sensitive bug, checking for 'dev' instead of 'DEV'
    if not code.startswith('dev'): 
        return False
    
    # BUG 2: code[-1] is a string, it will never be of type int!
    if type(code[-1]) != int: 
        return False
        
    return True

print("Test 1:", validate_secret_code("DEV-9X4")) # Should be True
print("Test 2:", validate_secret_code("dev-abc")) # Should be False
print("Test 3:", validate_secret_code("DEV-XYZ7")) # Should be True
print("Test 4:", validate_secret_code("DEV-ONLY")) # Should be False`
      }
    },
    validateSave: (filename, src, ts) => {
      return [];
    },
    checkExecution: (stdout, stderr) => {
      const results = stdout.match(/Test \d+: (True|False)/g);
      if (results && results.length === 4) {
        const expected = ["Test 1: True", "Test 2: False", "Test 3: True", "Test 4: False"];
        const matches = expected.every((val, i) => results[i] === val);
        if (matches) return { passed: true, message: "Great job! Your validator logic is now perfect." };
      }
      return { passed: false, message: "Some validation tests are still failing." };
    }
  },
  {
    id: "acme-corp",
    name: "AcmeCorp Landing (CSS/JS)",
    category: "web",
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
        content: `.header {\n  position: fixed;\n  z-index: -1; /* BUG: Header is trapped behind the main content */\n  background: white;\n}`,
      },
      "script.js": {
        name: "script.js",
        language: "javascript",
        content: `// BUG: Trying to select 'msg-btn' but HTML uses 'send-btn'\ndocument.getElementById('msg-btn').addEventListener('click', () => {\n  alert('Message Sent!');\n});`,
      },
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `Mission: The 'Send Message' button is broken and the layout is hidden. Fix the header layering and make the button work.`,
      },
    },
    validateSave: (filename: string, src: string, ts: string) => {
      const lines: TerminalLine[] = [];
      if (filename === "style.css") {
        const hasZIndex = /z-index\s*:\s*-/.test(src);
        if (hasZIndex) lines.push({ type: "error", text: "style.css: z-index with negative value found (header hidden)", ts });
        else lines.push({ type: "success", text: "style.css: z-index looks good ✔", ts });
      }
      if (filename === "script.js") {
        const hasWrongId = /getElementById\s*\(\s*['"]msg-btn['"]\s*\)/.test(src);
        if (hasWrongId) lines.push({ type: "error", text: "script.js: Cannot read property 'addEventListener' of null", ts });
        else lines.push({ type: "success", text: "script.js: Event listener wired correctly ✔", ts });
      }
      return lines;
    }
  },
  {
    id: "todo-app",
    name: "TaskMaster Pro (Logic)",
    category: "web",
    difficulty: "Intermediate",
    estimatedTime: "15m",
    activeFile: "README.md",
    fileOrder: ["README.md", "index.html", "style.css", "script.js"],
    files: {
      "index.html": {
        name: "index.html",
        language: "html",
        content: `<div class="app-container">\n  <h1>My Tasks</h1>\n  <ul id="task-list">\n    <li class="task-item">Buy groceries</li>\n  </ul>\n</div>`,
      },
      "style.css": {
        name: "style.css",
        language: "css",
        content: `.task-item {\n  opacity: 0; \n}`,
      },
      "script.js": {
        name: "script.js",
        language: "javascript",
        content: `const input = document.getElementById('new-task');\nconst taskText = input; // BUG: Missing .value`,
      },
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `Mission: Fix the visibility and the value binding.`,
      },
    },
    validateSave: (filename: string, src: string, ts: string) => {
      const lines: TerminalLine[] = [];
      if (filename === "style.css") {
        if (src.includes("opacity: 0")) lines.push({ type: "warning", text: "style.css: items are still invisible.", ts });
        else lines.push({ type: "success", text: "style.css: Output clarity restored ✔", ts });
      }
      if (filename === "script.js") {
        if (!src.includes("input.value")) lines.push({ type: "error", text: "script.js: Attempting to print the HTML node directly.", ts });
        else lines.push({ type: "success", text: "script.js: Input capture valid ✔", ts });
      }
      return lines;
    }
  },
  {
    id: "weather-dash",
    name: "WeatherDash (API Errors)",
    category: "web",
    difficulty: "Advanced",
    estimatedTime: "20m",
    activeFile: "README.md",
    fileOrder: ["README.md", "index.html", "script.js"],
    files: {
      "README.md": { name: "README.md", language: "markdown", content: "# Fix WeatherDash" },
      "index.html": { name: "index.html", language: "html", content: "<div id='temp'></div>" },
      "script.js": { name: "script.js", language: "javascript", content: "const data = fetch('api.weather.com');" }
    },
    validateSave: (filename, src, ts) => {
      const lines: TerminalLine[] = [];
      if (filename === "script.js") {
        if (!src.includes("await fetch")) lines.push({ type: "warning", text: "script.js: fetch() returns a promise, you likely need await.", ts });
      }
      return lines;
    }
  },

  // ── C++ CHALLENGES ─────────────────────────────────────────────────────────
  {
    id: "cpp-array-reversal",
    name: "Array Reversal Bug (C++)",
    category: "cpp",
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
        content: `#include <iostream>\nusing namespace std;\n\nvoid reverseArray(int arr[], int n) {\n    // BUG 1: Loop goes to n (should be n/2) — reverses twice, ending up original\n    // BUG 2: arr[n-i] causes out-of-bounds when i=0 (should be arr[n-1-i])\n    for (int i = 0; i < n; i++) {\n        int temp = arr[i];\n        arr[i]   = arr[n - i];   // fix: arr[n - 1 - i]\n        arr[n-i] = temp;         // fix: arr[n - 1 - i]\n    }\n}\n\nint main() {\n    int arr[] = {1, 2, 3, 4, 5};\n    int n = 5;\n    reverseArray(arr, n);\n    for (int i = 0; i < n; i++) {\n        cout << arr[i];\n        if (i < n - 1) cout << " ";\n    }\n    cout << endl;\n    return 0;\n}`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      if (stdout.trim() === "5 4 3 2 1") {
        return { passed: true, message: "Perfect! Array reversed correctly." };
      }
      if (stderr) return { passed: false, message: "Compilation or runtime error — check the terminal." };
      return { passed: false, message: `Expected '5 4 3 2 1' but got: ${stdout.trim() || "(empty)"}` };
    }
  },
  {
    id: "cpp-linked-list",
    name: "Linked List Sum Fix (C++)",
    category: "cpp",
    difficulty: "Intermediate",
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.cpp"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Linked List Sum Fix\n\nThe linked list \`10 -> 20 -> 30\` should produce \`Sum: 60\` and \`Length: 3\`.\n\nBoth functions have a loop-condition bug that skips the last node and crashes on a null head.`
      },
      "main.cpp": {
        name: "main.cpp",
        language: "cpp",
        content: `#include <iostream>\nusing namespace std;\n\nstruct Node {\n    int data;\n    Node* next;\n    Node(int d, Node* n = nullptr) : data(d), next(n) {}\n};\n\n// BUG 1: head->next != nullptr skips the last node\n// FIX: change condition to head != nullptr\nint sumList(Node* head) {\n    int sum = 0;\n    while (head->next != nullptr) {\n        sum += head->data;\n        head = head->next;\n    }\n    return sum;\n}\n\n// BUG 2: Same off-by-one, and crashes if head is null\nint lengthList(Node* head) {\n    int count = 0;\n    while (head->next != nullptr) {\n        count++;\n        head = head->next;\n    }\n    return count;\n}\n\nint main() {\n    Node* list = new Node(10, new Node(20, new Node(30)));\n    cout << "Sum: "    << sumList(list)    << endl;\n    cout << "Length: " << lengthList(list) << endl;\n    return 0;\n}`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      const okSum = stdout.includes("Sum: 60");
      const okLen = stdout.includes("Length: 3");
      if (okSum && okLen) return { passed: true, message: "Linked list traversal fixed correctly!" };
      if (stderr) return { passed: false, message: "Compilation/runtime error — check the terminal." };
      return { passed: false, message: "Output incorrect. Expected 'Sum: 60' and 'Length: 3'." };
    }
  },
  {
    id: "cpp-shape-calculator",
    name: "Shape Calculator OOP (C++)",
    category: "cpp",
    difficulty: "Advanced",
    estimatedTime: "30m",
    activeFile: "README.md",
    fileOrder: ["README.md", "main.cpp"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Shape Calculator OOP\n\nPolymorphism is broken. Fix three bugs:\n1. \`getArea()\` in the base class is not virtual — wrong method gets dispatched.\n2. Circle uses \`3.14\` instead of \`M_PI\`.\n3. Rectangle uses \`+\` instead of \`*\` for area.\n\nExpected output:\n\`\`\`\nCircle: 78.54\nRectangle: 24.00\n\`\`\``
      },
      "main.cpp": {
        name: "main.cpp",
        language: "cpp",
        content: `#include <iostream>\n#include <cmath>\n#include <cstdio>\nusing namespace std;\n\nclass Shape {\npublic:\n    // BUG 1: Missing 'virtual' — polymorphism doesn't work\n    double getArea() { return 0.0; }\n    virtual ~Shape() {}\n};\n\nclass Circle : public Shape {\n    double radius;\npublic:\n    Circle(double r) : radius(r) {}\n    // BUG 2: Use M_PI instead of 3.14\n    double getArea() override { return 3.14 * radius * radius; }\n};\n\nclass Rectangle : public Shape {\n    double w, h;\npublic:\n    Rectangle(double w, double h) : w(w), h(h) {}\n    // BUG 3: Should multiply, not add\n    double getArea() override { return w + h; }\n};\n\nint main() {\n    Shape* shapes[2] = { new Circle(5.0), new Rectangle(4.0, 6.0) };\n    printf("Circle: %.2f\\n",    shapes[0]->getArea());\n    printf("Rectangle: %.2f\\n", shapes[1]->getArea());\n    for (int i = 0; i < 2; i++) delete shapes[i];\n    return 0;\n}`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      const okCircle = stdout.includes("Circle: 78.54");
      const okRect   = stdout.includes("Rectangle: 24.00");
      if (okCircle && okRect) return { passed: true, message: "OOP polymorphism fixed! All areas correct." };
      if (stderr) return { passed: false, message: "Compilation error — check the terminal." };
      return { passed: false, message: "Output incorrect. Expected 'Circle: 78.54' and 'Rectangle: 24.00'." };
    }
  },

  // ── JAVA CHALLENGES ────────────────────────────────────────────────────────
  {
    id: "java-string-ops",
    name: "String Operations Fix (Java)",
    category: "java",
    difficulty: "Beginner",
    estimatedTime: "15m",
    activeFile: "README.md",
    fileOrder: ["README.md", "Main.java"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Java String Operations\n\nTwo classic Java string bugs to fix:\n1. \`==\` compares object references, not content — use \`.equals()\`.\n2. The word-reversal loop iterates forward instead of backward.\n\nExpected output:\n\`\`\`\ntrue\nWorld Java Hello\n\`\`\``
      },
      "Main.java": {
        name: "Main.java",
        language: "java",
        content: `public class Main {\n\n    // BUG 1: == compares references, not values. Use .equals() instead.\n    public static boolean isValidCode(String code) {\n        String validCode = new String("DEVTRACE");\n        return code == validCode;\n    }\n\n    // BUG 2: Loop goes forward (0..length-1) instead of backward\n    public static String reverseWords(String sentence) {\n        String[] words = sentence.split(" ");\n        StringBuilder result = new StringBuilder();\n        for (int i = 0; i < words.length; i++) {\n            if (i > 0) result.append(" ");\n            result.append(words[i]);\n        }\n        return result.toString();\n    }\n\n    public static void main(String[] args) {\n        System.out.println(isValidCode("DEVTRACE"));       // Should print: true\n        System.out.println(reverseWords("Hello Java World")); // Should print: World Java Hello\n    }\n}`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      const lines = stdout.trim().split("\n").map(l => l.trim());
      if (lines[0] === "true" && lines[1] === "World Java Hello") {
        return { passed: true, message: "String bugs fixed! .equals() and loop direction correct." };
      }
      if (stderr) return { passed: false, message: "Compilation error — check the terminal." };
      return { passed: false, message: "Output incorrect. Expected 'true' then 'World Java Hello'." };
    }
  },
  {
    id: "java-grade-calculator",
    name: "Grade Calculator Bug (Java)",
    category: "java",
    difficulty: "Intermediate",
    estimatedTime: "25m",
    activeFile: "README.md",
    fileOrder: ["README.md", "Main.java"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Java Grade Calculator\n\nTwo arithmetic bugs to fix:\n1. Integer division truncates the decimal — cast to \`double\` before dividing.\n2. The max-finder loop stops one element too early (\`length - 1\` instead of \`length\`).\n\nExpected output:\n\`\`\`\nAverage: 87.8\nHighest: 96\n\`\`\``
      },
      "Main.java": {
        name: "Main.java",
        language: "java",
        content: `public class Main {\n\n    // BUG 1: Integer division — total/length truncates to int\n    // FIX: cast total to double before dividing\n    public static double getAverage(int[] scores) {\n        int total = 0;\n        for (int score : scores) total += score;\n        return total / scores.length;\n    }\n\n    // BUG 2: Loop bound is scores.length - 1, so last element is never checked\n    public static int getHighest(int[] scores) {\n        int max = scores[0];\n        for (int i = 1; i < scores.length - 1; i++) {\n            if (scores[i] > max) max = scores[i];\n        }\n        return max;\n    }\n\n    public static void main(String[] args) {\n        int[] scores = {85, 92, 78, 96, 88};\n        System.out.println("Average: " + getAverage(scores)); // Should print: Average: 87.8\n        System.out.println("Highest: " + getHighest(scores)); // Should print: Highest: 96\n    }\n}`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      const okAvg = stdout.includes("Average: 87.8");
      const okMax = stdout.includes("Highest: 96");
      if (okAvg && okMax) return { passed: true, message: "Both bugs fixed! Arithmetic is correct." };
      if (stderr) return { passed: false, message: "Compilation error — check the terminal." };
      return { passed: false, message: "Output incorrect. Expected 'Average: 87.8' and 'Highest: 96'." };
    }
  },
  {
    id: "java-bank-account",
    name: "Bank Account OOP (Java)",
    category: "java",
    difficulty: "Advanced",
    estimatedTime: "30m",
    activeFile: "README.md",
    fileOrder: ["README.md", "Main.java"],
    files: {
      "README.md": {
        name: "README.md",
        language: "markdown",
        content: `# Java Bank Account OOP\n\nThree bugs to fix in this banking system:\n1. No null-check before accessing account — causes NullPointerException.\n2. Interest rate is applied as-is (5.0%) but should be divided by 100.\n3. Overdraft check uses \`>\` instead of \`>=\` allowing balance to go negative.\n\nExpected output:\n\`\`\`\nBalance: 1050.0\nWithdrawal successful\n\`\`\``
      },
      "Main.java": {
        name: "Main.java",
        language: "java",
        content: `public class Main {\n\n    static class BankAccount {\n        String owner;\n        double balance;\n        BankAccount(String owner, double balance) {\n            this.owner   = owner;\n            this.balance = balance;\n        }\n    }\n\n    // BUG 1: No null-check — crashes with NullPointerException if account is null\n    public static void applyInterest(BankAccount account, double ratePercent) {\n        account.balance += account.balance * ratePercent; // BUG 2: should be ratePercent / 100.0\n    }\n\n    // BUG 3: > should be >= so balance cannot go negative (currently allows 0 withdrawal)\n    public static String withdraw(BankAccount account, double amount) {\n        if (amount > account.balance) {\n            return "Insufficient funds";\n        }\n        account.balance -= amount;\n        return "Withdrawal successful";\n    }\n\n    public static void main(String[] args) {\n        BankAccount acc = new BankAccount("Alice", 1000.0);\n        applyInterest(acc, 5.0);                           // Should add 50.0 → balance 1050\n        System.out.println("Balance: " + acc.balance);    // Should print: Balance: 1050.0\n        System.out.println(withdraw(acc, 200.0));          // Should print: Withdrawal successful\n    }\n}`
      }
    },
    validateSave: (filename, src, ts) => [],
    checkExecution: (stdout, stderr) => {
      const okBal  = stdout.includes("Balance: 1050.0");
      const okWith = stdout.includes("Withdrawal successful");
      if (okBal && okWith) return { passed: true, message: "Bank account system fully fixed!" };
      if (stderr) return { passed: false, message: "Runtime error — check the terminal for stack trace." };
      return { passed: false, message: "Output incorrect. Expected 'Balance: 1050.0' and 'Withdrawal successful'." };
    }
  }
];

export const BROKEN_REPO = REPOSITORIES[0].files;
export const FILE_ORDER = REPOSITORIES[0].fileOrder;
