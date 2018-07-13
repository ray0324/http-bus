const EventEmitter = require('events');
const http = require('http');
const WebSocket = require('ws');


class HttpBus extends EventEmitter {
  constructor(config) {
    super();
    // http响应队列
    this.reqList = new Map();
    // 后端socket列表
    this.sockets = new Map();
    // 透传参数
    this.refID = 1;
    // http路径前缀
    this.prefix = config.prefix;
    this.connect(config.hosts);
    this.serve(config.port);
  }

  _getRefID() {
    return this.refID < Number.MAX_SAFE_INTEGER ? this.refID++ : this.refID = 1;
  }

  connect(hosts) {
    if (!Array.isArray(hosts)) {
      throw new Error('hosts must configed as an array');
    }

    const sockets = this.sockets;
    const reqList = this.reqList;

    hosts.forEach((item, index) => {
      const ws = new WebSocket(`ws://${item.host}:${item.port}`);

      ws.on('open', () => console.log(`CONNECTED: ws://${item.host}:${item.port}`));
      ws.on('close', () => console.log(`DISCONNECTED: ws://${item.host}:${item.port})`));

      ws.on('message', data => {
        let { refid, payload } = JSON.parse(data);
        this.emit('log', payload);
        const res = reqList.get(refid);
        reqList.delete(refid);
        if (res) {
          res.setHeader('Content-Type', 'application/json;charset=utf8');
          res.end(JSON.stringify(payload));
        };
      });

      sockets.set(item.label, ws);
    });
  }

  serve(port) {
    const sockets = this.sockets;
    const reqList = this.reqList;
    const prefix = this.prefix;
    const reg = new RegExp(`^${prefix}`);

    const httpserver = http.createServer((req, res) => {
      if (!reg.test(req.url)) {
        return res.end('static file service');
      }

      this.emit('log', req.url);
      // get loop no
      const refid = this._getRefID();
      const label = ['hq', 'jy'][Math.floor(Math.random() * 2)];
      const ws = sockets.get(label);

      ws.send(JSON.stringify({
        refid,
        payload: {
          reqtime: Date.now(),
          url: req.url
        }
      }));

      reqList.set(refid, res);
    });

    httpserver.listen(port);
  }
}

module.exports = HttpBus;
