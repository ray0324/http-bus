const WebSocket = require('ws');
function noop() { }

const wss1 = new WebSocket.Server({ port: 9001 });
const wss2 = new WebSocket.Server({ port: 9002 });

function heartbeat() {
  this.isAlive = true;
}

wss1.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    const { reqid, ...payload } = JSON.parse(data);
    console.log('wss1msg:', payload);
    const resp = {
      desc: '行情服务'
    };
    ws.send(JSON.stringify({ reqid, payload: resp }));
  });
});

wss2.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    const { reqid, ...payload } = JSON.parse(data);
    console.log('wss2msg:', payload);
    const resp = {
      desc: '资讯服务'
    };
    ws.send(JSON.stringify({ reqid, payload: resp }));
  });
});

// 心跳
setInterval(function ping() {
  console.log('wss1.clients:' + wss1.clients.size + ' wss2.clients:' + wss2.clients.size);
  wss1.clients.forEach(function each(ws) {
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
