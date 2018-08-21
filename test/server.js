const WebSocket = require('ws');
function noop() { }

const wss1 = new WebSocket.Server({ port: 9001 });
const wss2 = new WebSocket.Server({ port: 9002 });

function heartbeat() {
  console.log('wss1.clients:' + wss1.clients.size);
  console.log('wss2.clients:' + wss2.clients.size);
  this.isAlive = true;
}

wss1.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    console.log( 'wss1msg:', data);
    const req = JSON.parse(data);
    ws.send(JSON.stringify({
      reqid: req.reqid,
      payload: {
        delta: Date.now() - req.payload.reqtime,
        req: req.payload,
        resp: {
          desc: '资讯服务'
        }
      }
    }));
  });
});

wss2.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.on('message', function(data) {
    console.log('wss2msg:', data);
    const req = JSON.parse(data);
    ws.send(JSON.stringify({
      reqid: req.reqid,
      payload: {
        delta: Date.now() - req.payload.reqtime,
        req: req.payload,
        resp: {
          desc: '行情服务'
        }
      }
    }));
  });
});

// 心跳
setInterval(function ping() {
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
