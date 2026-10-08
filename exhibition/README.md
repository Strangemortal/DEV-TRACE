# DEV-TRACE Exhibition Showcase Website

This directory contains the standalone **Exhibition Showcase Website** for the **DEV-TRACE** technical assessment engine.

---

## 🚀 Running the Exhibition Showcase

You can run the exhibition website in two ways:

### Option 1: Direct File / Static Server (Zero Dependency)
You can directly open `index.html` in any modern web browser, or serve it with Python / npx:
```bash
# From this directory (c:/Users/BharatBK/Documents/projectss/dev/exhibition)
npx serve .
# Or Python
python -m http.server 5173
```

### Option 2: Vite Development Server
```bash
# Install dependencies (only Vite required)
npm install

# Start Vite dev server
npm run dev
```

---

## 🔗 Connecting to the Main DevTrace Project

The exhibition website connects to the main DevTrace Next.js engine running at `http://localhost:3000`.

To start the main DevTrace engine:
```bash
# From the project root (c:/Users/BharatBK/Documents/projectss/dev)
npm run dev
```

### Interactive Features Connected to DevTrace Core:
1. **Engine Health Status Indicator**: Live ping in the top navbar shows when the core backend is online (`http://localhost:3000`).
2. **1-Click Interactive Demo Launchers**:
   - **Candidate Sandbox IDE**: Instant authentication and launch into Monaco IDE (`/api/auth/demo?role=candidate`).
   - **Invigilator Telemetry Deck**: Direct access to real-time telemetry streaming and event analysis (`/api/auth/demo?role=admin`).
   - **Interviewer Evaluation Portal**: Direct access to candidate management and scorecards (`/api/auth/demo?role=interviewer`).
   - **Production Auth Portals**: Direct gateway to `/login` and `/login/staff`.
3. **Interactive Anti-Cheat & Telemetry Lab**: Interactive simulator testing LLM copy-paste injection, window blurs, full-screen escape penalties, and real-time biometric stability scoring.
4. **6-Axis Biometric Radar Visualizer**: Interactive HTML5 Canvas chart displaying model evaluation profiles for different candidate archetypes.
5. **5-Stage Architecture Pipeline**: Live technical inspector for sandboxes, telemetry streamers, edge route guards, ML models, and executive dossiers.
