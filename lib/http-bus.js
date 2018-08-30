const EventEmitter = require('events');
const http = require('http');
const WebSocket = require('ws');
const qs = require('querystring');
const serveHandler = require('serve-handler');
const url = require('url');
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
      let { reqid, payload } = JSON.parse(data);
      this.emit('response', payload);
      let _reqid = Number(reqid);
      // no alive reqid exists
      if (!this.forwards.has(_reqid)) {
        this.emit('error', ERRORS.ERR_REQID);
        return;
      }
      const res = this.forwards.get(_reqid);
      this.forwards.delete(_reqid);
      res.end(JSON.stringify(payload));
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

  // send request to backward server and save response stream
  sendToBackward(res, { reqlink = 0, ...payload }) {
    // log
    this.emit('request', { reqlink, ...payload });
    // exist reqlink but value is not a number
    if (isNaN(reqlink)) {
      return res.end(JSON.stringify(ERRORS.ERR_REQLINK));
    }
    let _reqlink = Number(reqlink);
    // check if backwards exist
    if (!this.backwards.has(_reqlink)) {
      return res.end(JSON.stringify(ERRORS.ERR_REQLINK));
    }

    let reqid = this.getReqID();
    this.forwards.set(reqid, res);
    this.backwards.get(_reqlink).send(JSON.stringify({ reqid, payload }));
  }

  // start a forward server and listen dist tcp port
  serve(port) {
    const httpServer = http.createServer((req, res) => {
      // static file serve
      if (!this.prefix.test(req.url)) {
        return serveHandler(req, res, {
          public: this.rootDir
        });
      }

      // set response headers
      res.setHeader('content-type', 'application/json;charset=utf8');

      // relay request
      if (req.method === 'GET') {
        const { query } = url.parse(req.url, true);
        this.sendToBackward(res, query);
        return;
      }

      if (req.method === 'POST') {
        let body = [];
        req
          .on('data', chunk => body.push(chunk))
          .on('end', () => {
            body = qs.parse(decodeURI(Buffer.concat(body).toString()));
            this.sendToBackward(res, body);
          });
      }
    });

    httpServer.listen(port);
  }
}

module.exports = HttpBus;
