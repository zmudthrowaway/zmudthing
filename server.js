
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
// var webtelnet = require('webtelnet');
var webtelnet = require('./webtelnet-proxy.js');

var conf = {
    telnet: {
      host: 'zombiemud.org',
      port: 3000,
    },
    web: {
      host: '10.0.0.1',
      port: 4321,
    },
    www: 'www',
    logTraffic: true,
  };

var app = express().use(express.static(conf.www));
var httpserver = http.createServer(app);
httpserver.listen(conf.web.port, conf.web.host, function(){
  console.log('listening on ' + conf.web.host + ':' + conf.web.port);
});

// create socket io 
var io = socketio.listen(httpserver);

// create webtelnet proxy and bind to io 
var webtelnetd = webtelnet(io, conf.telnet.port, conf.telnet.host);