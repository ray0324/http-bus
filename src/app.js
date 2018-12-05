const debug = require('debug')('app');
const HttpBus = require('../lib/http-bus');

const httpbus = new HttpBus({
  port: 8001,
  hosts: [{ host: '127.0.0.1:9001', reqlink: '0' }, { host: '127.0.0.1:9002', reqlink: '1' }],
  prefix: /^\/api([\/\?].*)?$/,
  rootDir: 'E:/WebRoot',
  defaultIndex: 'index.html'
});

httpbus.on('info', function(data) {
  debug('info:', data);
});

httpbus.on('request', function(data) {
  debug('request:', data);
});

httpbus.on('response', function(data) {
  debug('response:', data);
});
