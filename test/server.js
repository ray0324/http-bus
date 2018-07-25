const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 9001 });
const wss2 = new WebSocket.Server({ port: 9002 });

function noop() { }

function heartbeat() {
  console.log('Heartbeat:'+ Date.now());
  console.log('wss.clients:' + wss.clients.size);
  this.isAlive = true;
}

wss.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    console.log( 'wss:', data);
    const req = JSON.parse(data);
    ws.send(JSON.stringify({
      reqid: req.reqid,
      payload: {
        time: Date.now(),
        req: req.payload
      }
    }));
  });
});

wss2.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    console.log('wss2:', data);
    const req = JSON.parse(data);
    ws.send(JSON.stringify({
      reqid: req.reqid,
      payload: {
        time: Date.now(),
        req: req.payload
      }
    }));
  });
});

// 心跳
setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
  wss2.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(noop);
  });
}, 10000);
