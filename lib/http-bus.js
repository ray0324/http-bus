const EventEmitter = require('events');
const http = require('http');
const WebSocket = require('ws');
const qs = require('querystring');
const serveHandler = require('serve-handler');
const url = require('url');
const ERRORS = require('./errors');
const debug = require('debug')('http-bus');

class HttpBus extends EventEmitter {
  constructor(config) {
    super();
    this.respQueue = new Map;

    this._reqid = 1;

    this.prefix = config.prefix;
    this.rootDir = config.rootDir || './';

    this.hosts = new Map;

    this.connect(config.hosts);

    this.serve(config.port);
  }

  getReqId() {
    return this._reqid < Number.MAX_SAFE_INTEGER ? this._reqid++ : this._reqid = 1;
  }

  connect(_hosts) {
    let hosts = [];
    // example: confog.host = '127.0.0.1:9001'
    if (typeof _hosts === 'string') {
      hosts.push({ host: _hosts, reqlink: '0' });
      // this.hosts.set(0, { host: _hosts });
    }

    // example: confog.host = [{ host: '127.0.0.1:9001', reqlink: '0' }, { host: '127.0.0.1:9002', reqlink: '1' }]
    if (Array.isArray(_hosts)) {
      hosts = _hosts;
    }

    hosts.forEach(_host => {
      debug('connecting to host: ' + _host.host + _host.reqlink);
      const ws = new WebSocket(`ws://${_host.host}`);

      ws.on('message', data => this.onWebSocketMessage(data));
      ws.on('open', () => this.onWebSocketOpen(`ws://${_host.host}`));
      ws.on('close', () => this.onWebSocketClose(`ws://${_host.host}`));
      ws.on('error', () => this.onWebSocketError(`ws://${_host.host}`));

      this.hosts.set(parseInt(_host.reqlink), {
        host: _host,
        ws
      });
    });
  }

  onWebSocketMessage(data) {
    let { reqid, payload } = JSON.parse(data);
    this.emit('response', { reqid, payload });
    let _reqid = parseInt(reqid);
    // no alive reqid exists
    if (!this.respQueue.has(_reqid)) {
      this.emit('error', ERRORS.ERR_REQID);
      return;
    }
    const res = this.respQueue.get(_reqid);
    this.respQueue.delete(_reqid);
    res.end(JSON.stringify(payload));
  }

  onWebSocketOpen(host) {
    this.emit('info', `[connected] ws://${host}`);
  }

  onWebSocketClose(host) {
    this.emit('info', `[disconnected] ws://${host}`);
  }

  onWebSocketError(host) {
    this.emit('info', `[connect errpr]ws://${host}`);
  }

  // send request to backward server and save response stream
  proxy(res, { reqlink = 0, ...payload }) {
    // exist reqlink but value is not a number
    if (isNaN(reqlink)) {
      return res.end(JSON.stringify(ERRORS.ERR_REQLINK));
    }

    let _reqlink = parseInt(reqlink);

    if (!this.hosts.has(_reqlink)) {
      return res.end(JSON.stringify(ERRORS.ERR_REQLINK));
    }

    let reqid = this.getReqId();

    debug('reqid' + ' ' + reqid);

    this.respQueue.set(reqid, res);

    const { ws } = this.hosts.get(_reqlink);

    ws.send(JSON.stringify({ reqid, payload }));
  }

  // start a forward server and listen dist tcp port
  serve(port) {
    http.createServer((req, res) => {
      // static file serve
      if (!this.prefix.test(req.url)) {
        debug('server static file: ' + req.url);
        return serveHandler(req, res, {
          public: this.rootDir
        });
      }
      // set response headers
      res.setHeader('content-type', 'application/json;charset=utf8');

      // relay request
      if (req.method === 'GET') {
        const { query } = url.parse(req.url, true);
        debug('GET', query);
        this.proxy(res, query);
        return;
      }

      if (req.method === 'POST') {
        let body = [];
        req
          .on('data', chunk => body.push(chunk))
          .on('end', () => {
            body = qs.parse(decodeURI(Buffer.concat(body).toString()));
            debug('POST', body);
            this.proxy(res, body);
          });
      }
    }).listen(port, () => {
      this.emit('info', `Server started at port ${port}`);
    });
  }
}

module.exports = HttpBus;
