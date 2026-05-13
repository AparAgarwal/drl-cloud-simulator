const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

let currentSimulation = null

function resolveBundledMaven(projectRoot) {
  const toolsDir = path.join(projectRoot, '.tools')
  if (!fs.existsSync(toolsDir)) return null

  const mavenDirs = fs.readdirSync(toolsDir)
    .filter((name) => name.startsWith('apache-maven-'))
    .sort()
    .reverse()

  for (const dir of mavenDirs) {
    const candidate = path.join(toolsDir, dir, 'bin', process.platform === 'win32' ? 'mvn.cmd' : 'mvn')
    if (fs.existsSync(candidate)) return candidate
  }

  return null
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  // Handle start simulation request
  socket.on('start_sim', (data) => {
    const scenario = data?.scenario || 'AgentSimulation'
    console.log(`[Socket] Received start_sim request for scenario: ${scenario}`)
    
    if (currentSimulation) {
      console.log('[Socket] Simulation already running, killing previous process')
      currentSimulation.kill()
    }
    
    startJavaSimulation(scenario, io)
  })
  
  // Handle stop simulation request
  socket.on('stop_sim', () => {
    console.log('[Socket] Received stop_sim request')
    if (currentSimulation) {
      console.log('[Socket] Killing simulation process')
      currentSimulation.kill('SIGTERM')
      currentSimulation = null
      io.emit('log', { 
        level: 'warn', 
        time: new Date().toISOString(),
        msg: '[Bridge] Simulation stopped by user' 
      })
    }
  })
  
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
})

// Start Java simulation
function startJavaSimulation(scenario, io) {
  const projectRoot = path.resolve(__dirname, '..')
  
  console.log(`[Java] Starting ${scenario}...`)
  io.emit('log', { 
    level: 'info', 
    time: new Date().toISOString(),
    msg: `[Bridge] Starting ${scenario}` 
  })
  
  const bundledMvn = resolveBundledMaven(projectRoot)
  const mvnCmd = bundledMvn || 'mvn'
  console.log('[Java] Using mvn command:', mvnCmd)

  // On Windows with spaces in path, invoke .cmd through PowerShell safely.
  if (process.platform === 'win32' && mvnCmd.toLowerCase().endsWith('.cmd')) {
    const psCommand = `& '${mvnCmd}' -DskipTests compile exec:java -Dexec.mainClass='${scenario}'`
    currentSimulation = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } else {
    currentSimulation = spawn(mvnCmd, ['-DskipTests', 'compile', 'exec:java', `-Dexec.mainClass=${scenario}`], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    })
  }
  
  // Handle stdout
  currentSimulation.stdout.on('data', (data) => {
    const output = data.toString().trim()
    if (output) {
      console.log(`[Java] ${output}`)
      io.emit('log', { 
        level: 'info', 
        time: new Date().toISOString(),
        msg: `[Java] ${output}` 
      })
    }
  })
  
  // Handle stderr
  currentSimulation.stderr.on('data', (data) => {
    const output = data.toString().trim()
    if (output) {
      console.error(`[Java ERROR] ${output}`)
      io.emit('log', { 
        level: 'error', 
        time: new Date().toISOString(),
        msg: `[Java] ${output}` 
      })
    }
  })
  
  // Handle process exit
  currentSimulation.on('close', (code) => {
    console.log(`[Java] Process exited with code ${code}`)
    io.emit('log', { 
      level: 'info', 
      time: new Date().toISOString(),
      msg: `[Java] Simulation completed with exit code ${code}` 
    })
    currentSimulation = null
  })
  
  currentSimulation.on('error', (err) => {
    console.error('[Java] Error starting process:', err.message)
    const message = err.code === 'ENOENT' && mvnCmd === 'mvn'
      ? 'mvn not found in PATH; consider running the project via scripts/run-quick-start.ps1 or ensure Maven is installed.'
      : err.message
    io.emit('log', { 
      level: 'error', 
      time: new Date().toISOString(),
      msg: `[Bridge] Failed to start simulation: ${message}` 
    })
    currentSimulation = null
  })
}

// Receive logs from any component and broadcast to dashboard clients
app.post('/log', (req, res) => {
  const payload = req.body || {}
  const level = payload.level || 'info'
  const msg = payload.msg || ''
  const source = payload.source || 'unknown'
  const time = new Date().toISOString()
  const log = { time, level, msg: `[${source}] ${msg}` }
  io.emit('log', log)
  console.log(`${time} ${level.toUpperCase()} [${source}] ${msg}`)
  res.status(200).json({ ok: true })
})

// Simple health
app.get('/health', (req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4000
server.listen(PORT, () => console.log(`Bridge listening on http://localhost:${PORT}`))
