const HttpBus = require('../lib/http-bus');

const httpbus = new HttpBus({
  port: 8001,
  host: ['127.0.0.1:9001', '127.0.0.1:9002'],
  prefix: /^\/api([\/\?].*)?$/,
  rootDir: 'E:\\WebRoot',
  defaultIndex: 'index.html'
});

// 写日志
httpbus.on('info', function(data) {
  console.log(data);
});
