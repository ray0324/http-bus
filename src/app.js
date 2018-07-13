const HttpBus = require('../lib/http-bus');

const httpbus = new HttpBus({
  port: 8001,
  hosts: [
    { label: 'hq', host: 'localhost', port: 9001 },
    { label: 'jy', host: 'localhost', port: 9002 }
  ],
  prefix: '/reqxml',
  staticRoot: 'E:\\hlcrm\\dist',
  defaultIndex: 'index.html'
});

// 写日志
httpbus.on('log', function(data) {
  console.log(data);
});
