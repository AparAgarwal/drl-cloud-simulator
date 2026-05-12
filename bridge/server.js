const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
})

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
