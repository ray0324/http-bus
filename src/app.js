const HttpBus = require('../lib/http-bus');

const httpbus = new HttpBus({
  port: 8001,
  hosts: [
    { link: '1', host: 'localhost', port: 9001 },
    { link: '2', host: 'localhost', port: 9002 }
  ],
  prefix: '/reqxml',
  staticRoot: 'E:\\hlcrm\\dist',
  defaultIndex: 'index.html'
});

// 写日志
httpbus.on('log', function(data) {
  console.log(data);
});
