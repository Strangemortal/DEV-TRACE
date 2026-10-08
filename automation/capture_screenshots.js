/**
 * DEV-TRACE High-Resolution Screenshot Capture Engine
 * Captures clean, pixel-perfect 1920x1080 screenshots of all primary DEV-TRACE modules:
 *   1. Exhibition Showcase Hub (http://localhost:5173)
 *   2. Candidate Assessment IDE & Proctoring Interface
 *   3. Security Integrity & Fullscreen Alert Modal
 *   4. Admin Invigilator Dashboard & Telemetry Radar
 *   5. Comparative Benchmark Infographic Graph
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = path.join(process.cwd(), "automation", "screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function takeScreenshot(url, outputFilename, delaySec = 2) {
  const outputPath = path.join(SCREENSHOT_DIR, outputFilename);
  console.log(`[Capture] Navigating to ${url} -> ${outputFilename}...`);

  const cmd = `Start-Process '${CHROME_PATH}' -ArgumentList '--headless=new', '--disable-gpu', '--window-size=1920,1080', '--virtual-time-budget=5000', '--screenshot="${outputPath}"', '${url}' -Wait`;
  try {
    execSync(`powershell -Command "${cmd}"`, { stdio: "inherit" });
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`  ✓ Successfully captured ${outputFilename} (${(stats.size / 1024).toFixed(1)} KB)`);
      return outputPath;
    } else {
      console.warn(`  ✕ Screenshot file not found: ${outputFilename}`);
      return null;
    }
  } catch (err) {
    console.error(`  ✕ Error capturing ${outputFilename}:`, err.message);
    return null;
  }
}

async function run() {
  console.log("========================================================================");
  console.log("          DEV-TRACE AUTOMATED REPORT SCREENSHOT GENERATOR               ");
  console.log("========================================================================\n");

  // 1. Exhibition Showcase Hub
  takeScreenshot("http://localhost:5173", "01_exhibition_showcase_hub.png");

  // 2. Candidate Fullscreen Invigilation & IDE Launch
  takeScreenshot("http://localhost:3000/api/auth/demo?role=candidate", "02_candidate_ide_invigilation.png");

  // 3. Admin Evaluation Dashboard & Candidate Roster
  takeScreenshot("http://localhost:3000/api/auth/demo?role=admin", "03_admin_dashboard_roster.png");

  // 4. Admin Telemetry & Real-Time Biometric Radar
  takeScreenshot("http://localhost:3000/admin/telemetry", "04_admin_telemetry_radar.png");

  // 5. Comparative Benchmark Graph
  const graphHtml = path.join(process.cwd(), "automation", "comparison_graph.html").replace(/\\/g, "/");
  takeScreenshot(`file:///${graphHtml}`, "05_comparative_benchmark_graph.png");

  // 6. Login & Authentication Portal
  takeScreenshot("http://localhost:3000/login", "06_login_portal.png");

  console.log("\n========================================================================");
  console.log("Screenshot capture cycle completed! All files saved in automation/screenshots/");
  console.log("========================================================================\n");
}

run();
