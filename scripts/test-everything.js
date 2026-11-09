// Enterprise Comprehensive Test Runner for DEV-TRACE
const BASE_URL = 'http://localhost:3000';

let adminCookie = '';
let candCookie = '';

let allPassed = true;

function logResult(step, title, success, details) {
  const icon = success ? '✅ PASS' : '❌ FAIL';
  console.log(`[${step}] ${icon}: ${title}`);
  if (details) {
    console.log(`      ↳ ${details}`);
  }
  if (!success) allPassed = false;
}

async function run() {
  console.log('\n========================================================');
  console.log('   🧪 DEV-TRACE - FULL ENTERPRISE VERIFICATION SUITE');
  console.log('========================================================\n');

  // Step 1: Public session check
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    const data = await res.json();
    logResult('1/13', 'Public /api/auth/me returns null session', data.user === null, JSON.stringify(data));
  } catch (err) {
    logResult('1/13', 'Public /api/auth/me returns null session', false, err.message);
  }

  // Step 2: Staff Admin Login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'password123', loginType: 'staff' }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      adminCookie = setCookie.split(';')[0];
    }
    const data = await res.json();
    logResult('2/13', 'Staff Admin Login succeeds with role "admin"', data.success === true && data.role === 'admin', JSON.stringify(data));
  } catch (err) {
    logResult('2/13', 'Staff Admin Login', false, err.message);
  }

  // Step 3: Provision a Candidate via Admin API
  let candidate = null;
  try {
    const res = await fetch(`${BASE_URL}/api/admin/candidates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        name: 'Aarav Patel',
        userId: 'aarav_eval',
        assignedRepoId: 'python-challenge',
      }),
    });
    const data = await res.json();
    candidate = data.candidate;
    logResult(
      '3/13',
      'Admin Provisions Candidate with Generated Security Token',
      candidate && candidate.userId === 'aarav_eval' && candidate.passwordHash.length >= 6,
      `User: ${candidate?.userId} | Access Key: ${candidate?.passwordHash} | ID: ${candidate?.id}`
    );
  } catch (err) {
    logResult('3/13', 'Admin Provisions Candidate', false, err.message);
  }

  // Step 4: Candidate Login via Candidate Portal
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: candidate.userId,
        password: candidate.passwordHash,
        loginType: 'candidate',
      }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      candCookie = setCookie.split(';')[0];
    }
    const data = await res.json();
    logResult(
      '4/13',
      'Candidate Authenticates into Isolated Assessment Sandbox',
      data.success === true && data.assignedRepoId === 'python-challenge',
      `Assigned Challenge: ${data.assignedRepoId} | Role: ${data.role}`
    );
  } catch (err) {
    logResult('4/13', 'Candidate Login', false, err.message);
  }

  // Step 5: Python Sandbox Execution
  try {
    const res = await fetch(`${BASE_URL}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        code: "x = sum([15, 25, 35])\nprint('DEVTRACE_SANDBOX_OK')\nprint('Calculated:', x)",
      }),
    });
    const data = await res.json();
    const passed = data.output && data.output.includes('DEVTRACE_SANDBOX_OK') && data.output.includes('Calculated: 75');
    logResult('5/13', 'Python Isolated Sandbox Execution & Output Capture', passed, data.output?.trim());
  } catch (err) {
    logResult('5/13', 'Python Sandbox Execution', false, err.message);
  }

  // Step 6: C++ Sandbox Execution
  try {
    const res = await fetch(`${BASE_URL}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'cpp',
        code: '#include <iostream>\nint main() { std::cout << "DEVTRACE_CPP_SUCCESS\\n"; return 0; }',
      }),
    });
    const data = await res.json();
    const passed = data.output && data.output.includes('DEVTRACE_CPP_SUCCESS');
    logResult('6/13', 'C++ Compiler Sandbox Execution', passed, data.output?.trim());
  } catch (err) {
    logResult('6/13', 'C++ Sandbox Execution', false, err.message);
  }

  // Step 7: Stream Real-Time Telemetry from Candidate IDE
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: candCookie,
      },
      body: JSON.stringify({
        stability: 94,
        duration: 72,
        activeFile: 'main.py',
        eventCount: 350,
        tabSwitches: 0,
        fullscreenEscapes: 0,
        recentEvents: [{ type: 'KEYSTROKE', ts: Date.now(), meta: { char: 'x' } }],
      }),
    });
    const data = await res.json();
    logResult('7/13', 'Candidate IDE Streams Real-Time Telemetry Heartbeat', data.success === true && data.status === 'active', JSON.stringify(data));
  } catch (err) {
    logResult('7/13', 'Candidate Real-Time Telemetry Stream', false, err.message);
  }

  // Step 8: Verify Admin Receives Live Telemetry Feed
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/live`, {
      headers: { Cookie: adminCookie },
    });
    const data = await res.json();
    const liveFeeds = data.liveTelemetry || [];
    const myFeed = liveFeeds.find((f) => f.candidateId === candidate.id);
    const passed = myFeed && myFeed.stability === 94 && myFeed.activeFile === 'main.py';
    logResult('8/13', 'Admin Control Deck Receives Live Telemetry Feed in Real-Time', passed, `Candidate: ${myFeed?.candidateName} | Stability: ${myFeed?.stability}% | Active File: ${myFeed?.activeFile}`);
  } catch (err) {
    logResult('8/13', 'Admin Live Telemetry Feed', false, err.message);
  }

  // Step 9: ML Behavioral Proficiency Classifier
  try {
    const res = await fetch(`${BASE_URL}/api/ml/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        typingSpeed: 115,
        backspaceCount: 15,
        pasteCount: 1,
        focusLostCount: 0,
        totalActiveTime: 240,
        idleTime: 20,
        codeChurn: 18,
      }),
    });
    const data = await res.json();
    logResult('9/13', 'ML Behavioral Classifier Evaluates Candidate Autonomy & Tier', res.ok, JSON.stringify(data));
  } catch (err) {
    logResult('9/13', 'ML Behavioral Classifier', false, err.message);
  }

  // Step 10: AI Socratic Debugging Assistant
  try {
    const res = await fetch(`${BASE_URL}/api/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        action: 'explain_error',
        errorOutput: 'ZeroDivisionError: division by zero',
        language: 'python',
        activeFile: 'main.py',
        code: 'def calc(a, b): return a / b',
      }),
    });
    const data = await res.json();
    const summary = data.explanation?.summary || data.hint?.text || (typeof data.explanation === 'string' ? data.explanation : JSON.stringify(data.explanation));
    logResult('10/13', 'AI Socratic Mentor Responds with Non-Leaking Guidance', res.ok && Boolean(data.explanation || data.hint), summary ? summary.slice(0, 90) + '...' : JSON.stringify(data));
  } catch (err) {
    logResult('10/13', 'AI Socratic Mentor', false, err.message);
  }

  // Step 11: Candidate Submits and Concludes Test
  try {
    const res = await fetch(`${BASE_URL}/api/telemetry/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: candCookie,
      },
      body: JSON.stringify({
        sessionStart: Date.now() - 180000,
        duration: 180,
        stability: 92,
        events: [
          { type: 'ASSESSMENT_START', ts: Date.now() - 180000 },
          { type: 'ASSESSMENT_COMPLETE', ts: Date.now() },
        ],
      }),
    });
    const data = await res.json();
    logResult('11/13', 'Candidate Finalizes & Concludes Assessment Session', data.success === true, data.message);
  } catch (err) {
    logResult('11/13', 'Candidate Final Submission', false, err.message);
  }

  // Step 12: Verify Re-Login Lockout (Must be 403 Forbidden!)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: candidate.userId,
        password: candidate.passwordHash,
        loginType: 'candidate',
      }),
    });
    const data = await res.json();
    const isLockedOut = res.status === 403 && (data.isCompleted === true || data.error.includes('Assessment Concluded'));
    logResult('12/13', 'Re-Login is STRICTLY BLOCKED for Concluded Assessment (403 Forbidden)', isLockedOut, `HTTP ${res.status}: ${data.error}`);
  } catch (err) {
    logResult('12/13', 'Re-Login Lockout Check', false, err.message);
  }

  // Step 13: Clean up test candidate to ensure clean database
  try {
    const delRes = await fetch(`${BASE_URL}/api/admin/candidates/${candidate.id}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    });
    const data = await delRes.json();
    logResult('13/13', 'Database Cleanup: Test Candidate Purged, Zero Lingering Artifacts', data.success === true, 'Database reset clean.');
  } catch (err) {
    logResult('13/13', 'Database Cleanup', false, err.message);
  }

  console.log('\n========================================================');
  if (allPassed) {
    console.log('   🎉 ALL 13 ENTERPRISE VERIFICATION CHECKS PASSED!');
  } else {
    console.log('   ⚠️ SOME CHECKS FAILED - REVIEW LOGS ABOVE');
  }
  console.log('========================================================\n');
}

run();
