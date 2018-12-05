const WebSocket = require('ws');
const diff = require('ansi-diff-stream')();

function noop() { }

const server1 = new WebSocket.Server({ port: 9001 });
const server2 = new WebSocket.Server({ port: 9002 });

function heartbeat() {
  this.isAlive = true;
}

server1.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    const { reqid, ...payload } = JSON.parse(data);
    console.log('wss1msg:', payload);
    const resp = {
      desc: '服务1'
    };
    ws.send(JSON.stringify({ reqid, payload: resp }));
  });
});

server2.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    const { reqid, ...payload } = JSON.parse(data);
    console.log('wss2msg:', payload);
    const resp = {
      desc: '服务2'
    };
    ws.send(JSON.stringify({ reqid, payload: { resp, ...payload } }));
  });
});

// 心跳
setInterval(function ping() {
  diff.write('wss1.clients:' + server1.clients.size + ' wss2.clients:' + server2.clients.size);
  // console.log('wss1.clients:' + server1.clients.size + ' wss2.clients:' + server2.clients.size);
  server1.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
  server2.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 1000);

diff.pipe(process.stdout);
