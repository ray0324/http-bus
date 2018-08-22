const EventEmitter = require('events');
const http = require('http');
const WebSocket = require('ws');
const querystring = require('querystring');
const serveHandler = require('serve-handler');
const ERRORS = require('./errors');

class HttpBus extends EventEmitter {
  constructor(config) {
    super();
    this.forwards = new Map;
    this.backwards = new Map;
    this._reqid = 1;
    this.prefix = config.prefix;
    this.rootDir = config.rootDir || './';
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

    // connect to websocket bus
    hosts.forEach((_host, index) => this._handleConnect(_host, index));
  }

  _handleConnect(host, index) {
    // connect to backwards websocket bus;
    const ws = new WebSocket(`ws://${host}`);
    // response to http client
    ws.on('message', data => {
      this.emit('info', data);
      let { reqid, payload } = JSON.parse(data);
      let _reqid = Number(reqid);
      // 没有存活的客户端指定链接
      if (!this.forwards.has(_reqid)) {
        this.emit('error', ERRORS.ERR_REQID);
        return;
      }
      this.forwards.get(_reqid).end(JSON.stringify(payload));
      this.forwards.delete(_reqid);
    });

    ws.on('open', () => {
      this.emit('info', `[connected] ws://${host}`);
    });

    ws.on('close', () => {
      this.emit('info', `[disconnected] ws://${host}`);
    });

    ws.on('error', err => {
      this.emit('info', `[connect errpr]ws://${host}`);
    });
    // save this ws socket
    this.backwards.set(index, ws);
  }

  serve(port) {
    const httpServer = http.createServer();
    httpServer.on('request', (req, res) => {
      console.log(req.url);
      console.log(req.method);
      // 静态文件服务
      if (!this.prefix.test(req.url)) {
        return serveHandler(req, res, {
          public: this.rootDir
        });
      }

      res.setHeader('Content-Type', 'application/json;charset=utf8');

      // 接口转发服务
      if (req.method === 'POST') {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
          const { reqlink, ...payload } = querystring.parse(decodeURI(data));
          let _reqlink = Number(reqlink);
          if (reqlink && !this.backwards.has(_reqlink)) {
            return res.end(JSON.stringify(ERRORS.REQLINK_ERR));
          }
          let reqid = this.getReqID();
          const ws = this.backwards.get(_reqlink || 0);
          this.forwards.set(reqid, res);
          ws.send(JSON.stringify({ reqid, payload }));
        });
      }
    });

    httpServer.listen(port);
  }
}

module.exports = HttpBus;
