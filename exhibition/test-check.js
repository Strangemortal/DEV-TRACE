const fs = require('fs');

const html = fs.readFileSync('exhibition/index.html', 'utf8');
const js = fs.readFileSync('exhibition/app.js', 'utf8');
const css = fs.readFileSync('exhibition/style.css', 'utf8');

console.log('--- HTML Validation ---');
const requiredIds = [
  'engineStatusPill',
  'statusDot',
  'statusText',
  'playgroundInput',
  'keystrokeCount',
  'wpmCount',
  'stabilityScore',
  'stabilityBarFill',
  'stabilityBadge',
  'eventFeed',
  'radarCanvas',
  'archetypeName',
  'archetypeBadge',
  'archetypeDesc',
  'pipelineBadge',
  'pipelineMetric',
  'pipelineTitle',
  'pipelineDesc',
  'pipelineCode'
];

let allIdsFound = true;
for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) {
    console.error(`Missing ID: ${id}`);
    allIdsFound = false;
  }
}
if (allIdsFound) {
  console.log('✓ All 19 required DOM IDs found in index.html!');
}

console.log('\n--- JS Syntax Validation ---');
try {
  new Function(js);
  console.log('✓ app.js has zero syntax errors!');
} catch (e) {
  console.error('✗ Syntax Error in app.js:', e);
  process.exit(1);
}

console.log('\n--- Live API Connection Verification ---');
async function testEngine() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/me');
    console.log(`✓ Engine at http://localhost:3000/api/auth/me is reachable (HTTP ${res.status})!`);
  } catch (err) {
    console.error('✗ Engine not reachable:', err.message);
  }

  try {
    const demoRes = await fetch('http://localhost:3000/api/auth/demo?role=candidate', { redirect: 'manual' });
    console.log(`✓ Demo candidate endpoint returns HTTP ${demoRes.status} with location ${demoRes.headers.get('location')}`);
  } catch (err) {
    console.error('✗ Demo endpoint error:', err.message);
  }

  try {
    const demoAdmin = await fetch('http://localhost:3000/api/auth/demo?role=admin', { redirect: 'manual' });
    console.log(`✓ Demo admin endpoint returns HTTP ${demoAdmin.status} with location ${demoAdmin.headers.get('location')}`);
  } catch (err) {
    console.error('✗ Demo admin error:', err.message);
  }
}

testEngine();
