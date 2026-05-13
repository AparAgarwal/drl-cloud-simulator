# Startup Scripts - Quick Reference

## Available Scripts

### 1. **run-quick-start** (Recommended for quick setup)
Starts Bridge and Dashboard only - minimal setup for testing and development.

**Windows (PowerShell):**
```powershell
.\scripts\run-quick-start.ps1
```

**macOS/Linux:**
```bash
./scripts/run-quick-start.sh
```

**What it does:**
- Installs npm dependencies (if not already installed)
- Starts Bridge API server on http://localhost:4000
- Starts Dashboard frontend on http://localhost:5173
- Waits for dashboard commands to trigger training

---

### 2. **run-connections-only** (Full system setup)
Starts Bridge and Dashboard with Maven Java project compilation.

**Windows (PowerShell):**
```powershell
.\scripts\run-connections-only.ps1
```

**macOS/Linux:**
```bash
./scripts/run-connections-only.sh
```

**What it does:**
- Installs npm dependencies (if not already installed)
- Compiles Java project with Maven
- Starts Bridge API server
- Starts Dashboard frontend
- Shows all available dashboard actions

---

## Access Points

Once running:

| Component | URL | Purpose |
|-----------|-----|---------|
| **Dashboard** | http://localhost:5173 | Web UI for training & visualization |
| **Bridge Health** | http://localhost:4000/health | API health check |

---

## Dashboard Actions (After Starting)

- **Start Agent Simulation** → Runs DRL training
- **Load Training CSV** → View past training metrics
- **Load Performance CSV** → View past performance metrics
- **Load Baseline CSV** → Compare algorithms side-by-side
- **Stop** → Stops current simulation

---

## Troubleshooting

### Port Already in Use
- Bridge (4000): `netstat -ano | findstr :4000` (Windows) or `lsof -i :4000` (Mac/Linux)
- Dashboard (5173): `netstat -ano | findstr :5173` (Windows) or `lsof -i :5173` (Mac/Linux)

### Node Modules Issues
Delete `node_modules` folders and rerun the script:
```bash
rm -r bridge/node_modules dashboard/node_modules
```

### Maven Build Issues
Clean and rebuild:
```bash
mvn clean compile
```

---

## File Structure

```
scripts/
  ├── run-quick-start.ps1        (Windows - quick start)
  ├── run-quick-start.sh          (macOS/Linux - quick start)
  ├── run-connections-only.ps1   (Windows - full system)
  └── run-connections-only.sh    (macOS/Linux - full system)

bridge/
  ├── server.js
  └── package.json

dashboard/
  ├── src/
  │   └── App.jsx (with comparison charts)
  └── package.json
```
