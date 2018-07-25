const EventEmitter = require('events');
const http = require('http');
const WebSocket = require('ws');

const DEFAULT_LINK = Symbol('default');

class HttpBus extends EventEmitter {
  constructor(config) {
    super();
    // http响应队列
    this.reqList = new Map();
    // 后端socket列表
    this.sockets = new Map();
    // 后端链路
    this.links = new Map().set(DEFAULT_LINK, new Set);
    // 透传参数
    this.reqid = 1;
    // http路径前缀
    this.prefix = config.prefix;
    this.connect(config.hosts);
    this.serve(config.port);
  }

  getReqID() {
    return this.reqid < Number.MAX_SAFE_INTEGER ? this.reqid++ : this.reqid = 1;
  }

  connect(hosts) {
    if (!Array.isArray(hosts)) {
      throw new Error('hosts must configed as an array');
    }

    hosts.forEach((item, index) => {
      const ws = new WebSocket(`ws://${item.host}:${item.port}`);

      ws.on('open', () => this.emit('log', `connected:ws://${item.host}:${item.port}`));
      ws.on('close', () => this.emit('log', `disconnected:ws://${item.host}:${item.port})`));

      ws.on('message', data => {
        let { reqid, payload } = JSON.parse(data);
        console.log(data);
        this.emit('log', payload);
        const res = this.reqList.get(reqid);
        if (res) {
          res.setHeader('Content-Type', 'application/json;charset=utf8');
          res.end(JSON.stringify(payload));
        };
        this.reqList.delete(reqid);
      });

      if (!item.link) { // 默认链路
        this.links.get(DEFAULT_LINK).add(ws);
        return;
      }

      if (!this.links.get(item.link)) { // 创建新的链路
        this.links.set(item.link, new Set().add(ws));
        return;
      }

      // 为链路添加新节点
      this.links.get(item.link).add(ws);
    });
  }

  serve(port) {
    const httpserver = http.createServer((req, res) => {
      if (!new RegExp(`^${this.prefix}`).test(req.url)) {
        return res.end('static file service');
      }

      console.log(req);

      // 请求日志
      this.emit('log:req', req.url);

      const reqid = this.getReqID();

      req.link = '1';

      const linkSet = this.links.get(req.link) || this.links.get(DEFAULT_LINK);

      if (!linkSet) {
        return res.end('请求链路参数错误');
      }

      const ws = [...linkSet][Math.floor(linkSet.size * Math.random())];

      ws.send(JSON.stringify({
        reqid,
        payload: {
          reqtime: Date.now(),
          url: req.url
        }
      }));

      this.reqList.set(reqid, res);
    });

    httpserver.listen(port);
  }
}

module.exports = HttpBus;
