const EventEmitter = require('events');
const http = require('http');
const WebSocket = require('ws');
const querystring = require('querystring');
const serveHandler = require('serve-handler');
const path = require('path');

class HttpBus extends EventEmitter {
  constructor(config) {
    super();
    this.resp = new Map;
    this.backwards = new Map;
    this._reqid = 1;
    this.prefix = config.prefix || /^\/api(\/.*)$/;
    this.connect(config.host);
    this.serve(config.port);
  }

  getReqID() {
    return this._reqid < Number.MAX_SAFE_INTEGER ? this._reqid++ : this._reqid = 1;
  }

  connect(host) {
    let hosts = [];

    // example: confog.host = '127.0.0.1:9001'
    if (typeof host === 'string') {
      hosts.push(host);
    }

    // example: confog.host = ['127.0.0.1:9001','127.0.0.1:9002']
    if (Array.isArray(host)) {
      hosts = host;
    }

    // connect to backward
    hosts.forEach((_host, index) => {
      // connect to backwards tcp bus;
      const ws = new WebSocket(`ws://${_host}`);
      // response to http client
      ws.on('message', data => {
        console.log('client:', data);
        let { reqid, payload } = JSON.parse(data);
        const resp = this.resp.get(parseInt(reqid));
        if (resp) {
          resp.setHeader('Content-Type', 'application/json;charset=utf8');
          resp.end(JSON.stringify(payload));
        }
        this.resp.delete(reqid);
      });

      ws.on('open', ()=>{
        this.emit('info', `[connected] ws://${_host}`);
      });

      ws.on('close', ()=>{
        this.emit('info', `[disconnected] ws://${_host}`);
      });

      ws.on('error', err=>{
        this.emit('info', `[connect errpr]ws://${_host}`);
      });
      // save this ws socket
      this.backwards.set(index, ws);
    });
  }

  serve(port) {
    const httpServer = http.createServer();
    httpServer.on('request', (req, res) => {
      // 静态文件服务
      if (!this.prefix.test(req.url)) {
        console.log(path.join(process.cwd(), 'E:\WebRoot'));
        return serveHandler(req, res, {
          public: path.resolve('E:\WebRoot')
        });
      }

      // 接口转发服务
      if (req.method === 'POST') {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
          data = decodeURI(data);
          let msg = querystring.parse(data);
          let reqid = this.getReqID();

          console.log(msg);

          const ws = this.backwards.get(parseInt(msg.reqlink) || 0);
          this.resp.set(reqid, res);
          ws.send(JSON.stringify({
            reqid,
            payload: {
              reqtime: Date.now()
            }
          }));
        });
      }
    });

    httpServer.listen(port);
  }
}

module.exports = HttpBus;
