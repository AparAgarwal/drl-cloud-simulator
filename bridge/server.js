const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { spawn } = require('child_process')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

let currentSimulation = null

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
  
  // Use java -cp to run the Java class directly from compiled classes
  currentSimulation = spawn('java', [
    '-cp', path.join(projectRoot, 'target', 'classes'),
    'AgentSimulation'
  ], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'pipe']
  })
  
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
    io.emit('log', { 
      level: 'error', 
      time: new Date().toISOString(),
      msg: `[Bridge] Failed to start simulation: ${err.message}` 
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
