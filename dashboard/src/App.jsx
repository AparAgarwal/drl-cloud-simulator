import React, {useEffect, useState, useRef} from 'react'
import io from 'socket.io-client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts'
import logger from './logger'

const WS_URL = 'http://localhost:4000'

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map(line => line.split(',').map(v => v.trim()))
  return { headers, rows }
}

function parseTrainingCsv(text) {
  const { rows } = parseCsv(text)
  return rows.map(r => ({
    epoch: Number(r[0]),
    avgLoss: Number(r[1]),
    epsilon: Number(r[2])
  })).filter(d => Number.isFinite(d.epoch))
}

function parsePerformanceCsv(text) {
  const { rows } = parseCsv(text)
  return rows.map(r => ({
    epoch: Number(r[0]),
    avgTurnaround: Number(r[1])
  })).filter(d => Number.isFinite(d.epoch))
}

function loadCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch (e) { return [] }
}

function saveCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch (e) {}
}

export default function App(){
  const [connected, setConnected] = useState(false)
  const [time, setTime] = useState(0)
  const [logs, setLogs] = useState(() => logger.getEntries().slice(-200))
  const [level, setLevel] = useState('debug')
  const [lastEvent, setLastEvent] = useState(null)
  const [trainingData, setTrainingData] = useState(() => loadCache('training_metrics'))
  const [perfData, setPerfData] = useState(() => loadCache('java_performance'))
  const trainingInputRef = useRef(null)
  const perfInputRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(()=>{
    logger.setLevel(level)
  },[level])

  useEffect(()=>{
    const sock = io(WS_URL)
    socketRef.current = sock
    logger.setSocket(sock)

    sock.on('connect', ()=>{ setConnected(true); logger.info('Connected to bridge') })
    sock.on('disconnect', ()=>{ setConnected(false); logger.warn('Disconnected from bridge') })
    sock.on('tick', data => { setTime(data.time); logger.debug('tick', data) })
    sock.on('log', data => logger.log(data.level || 'info', data.msg))

    const interval = setInterval(()=>{
      const entries = logger.getEntries()
      setLogs(entries.slice(-200))
      setLastEvent(entries.length ? entries[entries.length - 1] : null)
    }, 1000)

    return ()=>{ clearInterval(interval); sock.disconnect() }
  },[])

  function startAgentSim(){
    logger.info('Requesting AgentSimulation start')
    socketRef.current?.emit('start_sim',{scenario:'AgentSimulation'})
  }

  function stopSim(){
    logger.info('Requesting stop')
    socketRef.current?.emit('stop_sim')
  }

  async function loadTrainingFile(file){
    const text = await file.text()
    const data = parseTrainingCsv(text)
    setTrainingData(data)
    saveCache('training_metrics', data)
    logger.info(`Loaded training CSV: ${file.name} (${data.length} rows)`)
  }

  async function loadPerformanceFile(file){
    const text = await file.text()
    const data = parsePerformanceCsv(text)
    setPerfData(data)
    saveCache('java_performance', data)
    logger.info(`Loaded performance CSV: ${file.name} (${data.length} rows)`)
  }

  function clearCache(){
    saveCache('training_metrics', [])
    saveCache('java_performance', [])
    setTrainingData([])
    setPerfData([])
    logger.warn('Cleared cached metrics')
  }

  const lastTrain = trainingData.length ? trainingData[trainingData.length - 1] : null
  const lastPerf = perfData.length ? perfData[perfData.length - 1] : null

  return (
    <div className="app">
      <div className="hero">
        <div className="titleBlock">
          <div className="badge">DRL CloudSim</div>
          <h1>Training Monitor</h1>
          <p>Live status + stored metrics. Load prior runs without re-simulating.</p>
        </div>
        <div className="statusRow">
          <span className={`pill ${connected ? 'ok' : 'bad'}`}>{connected ? 'Bridge online' : 'Bridge offline'}</span>
          <span className="pill">Sim time: {time.toFixed(2)}</span>
          <span className="pill">Last event: {lastEvent ? lastEvent.msg : '—'}</span>
        </div>
      </div>

      <main className="grid">
        <section className="panel controls">
          <h2>Controls</h2>
          <div className="buttonRow">
            <button onClick={startAgentSim}>Start Agent Simulation</button>
            <button onClick={stopSim}>Stop</button>
          </div>

          <div className="block">
            <h3>Load Stored Data</h3>
            <p>Use the CSVs created by previous runs: `training_metrics.csv` and `java_performance.csv`.</p>
            <div className="buttonRow">
              <button onClick={()=>trainingInputRef.current?.click()}>Load Training CSV</button>
              <button onClick={()=>perfInputRef.current?.click()}>Load Performance CSV</button>
              <button onClick={clearCache}>Clear Cache</button>
            </div>
            <input ref={trainingInputRef} type="file" accept=".csv" style={{display:'none'}} onChange={e=>e.target.files[0] && loadTrainingFile(e.target.files[0])} />
            <input ref={perfInputRef} type="file" accept=".csv" style={{display:'none'}} onChange={e=>e.target.files[0] && loadPerformanceFile(e.target.files[0])} />
          </div>

          <div className="block kpis">
            <div className="kpi">
              <span>Last Epoch</span>
              <strong>{lastTrain ? lastTrain.epoch : '—'}</strong>
            </div>
            <div className="kpi">
              <span>Avg Loss</span>
              <strong>{lastTrain ? lastTrain.avgLoss.toFixed(4) : '—'}</strong>
            </div>
            <div className="kpi">
              <span>Epsilon</span>
              <strong>{lastTrain ? lastTrain.epsilon.toFixed(3) : '—'}</strong>
            </div>
            <div className="kpi">
              <span>Avg Turnaround</span>
              <strong>{lastPerf ? lastPerf.avgTurnaround.toFixed(2) : '—'}</strong>
            </div>
          </div>

          <div className="block">
            <h3>Log Level</h3>
            <select value={level} onChange={e=>setLevel(e.target.value)}>
              <option value="debug">debug</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select>
          </div>
        </section>

        <section className="panel charts">
          <div className="chartCard">
            <h3>Training Metrics</h3>
            {trainingData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trainingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgLoss" stroke="#f4b400" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="epsilon" stroke="#00c2ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">Load training_metrics.csv to view loss + epsilon over epochs.</div>
            )}
          </div>

          <div className="chartCard">
            <h3>Average Turnaround</h3>
            {perfData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="avgTurnaround" stroke="#ff6f61" fill="#ff6f6133" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">Load java_performance.csv to view turnaround history.</div>
            )}
          </div>
        </section>

        <section className="panel logs">
          <div className="logsHeader">
            <h2>Runtime Logs</h2>
            <span>{logs.length} entries</span>
          </div>
          <div className="logBox">
            {logs.map((l,i)=>(
              <div key={i}>
                [{new Date(l.time).toLocaleTimeString()}] <b>{l.level}</b> — {l.msg}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
