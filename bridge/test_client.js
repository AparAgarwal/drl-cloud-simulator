const io = require('socket.io-client');
const sock = io('http://localhost:4000');

sock.on('connect', ()=>{
  console.log('connected', sock.id);
  sock.emit('start_sim', { scenario: 'AgentSimulation' });
  setTimeout(()=>{
    console.log('emitted start_sim');
    sock.disconnect();
  }, 500);
});

sock.on('log', (d)=>{ console.log('LOG:', d); });
sock.on('connect_error', (e)=>{ console.error('connect_error', e.message); });
