/**
 * Module dependencies.
 */
var express = require('express');
var http = require('http');
var path = require('path');
var timer = require('timers');

var routes = require('./routes');
var test = require('./routes/test').test;
var trade_data = require('./routes/trades').trade_data; // a function

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bitcoin');
var db = mongoose.connection;
var MinuteBar = require('./models/minute_bar')(mongoose);
var Trade = require('./models/trades')(mongoose);

var start_mtgox_stream = require('./models/gox')(mongoose, Trade);
var Blockchain = require('./models/blockchain');
var runMinuteBarCalc = require("./models/create_min_bar")(mongoose, Trade, MinuteBar);
var getHistoricalData = require("./models/get_historical_data")(mongoose, MinuteBar);

var app = express()
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8080);

// app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

io.sockets.on("connection", function(socket) {
  console.log("socket.io connected");
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

db.on('error', console.error.bind(console, ' database connection error:'));

// start database connection
db.once('open', function callback () {
  // start mtgox streaming
  start_mtgox_stream();
  // start Blockchain transaction streaming
  Blockchain(io);
  // // create routes for dashboard
  start_app();
  // start sending up minute bars 1 minute after app starts
  setTimeout(function() {
    runMinuteBarCalc(io)}, 61 * 1000);
});

// create routes
var start_app = function () {


  app.get('/', routes.index());
  app.get('/trades', trade_data( getHistoricalData() ));

  app.get('/test', function (req, res) {
    res.sendfile(__dirname + '/views/test.html');
  });

  app.get('/last', function(req, res) {
    var lastTrade = Trade.find().sort({date: 1}).limit(1).exec();
    res.json(lastTrade);
  });

  app.get('/fake_trade', function(req, res) {
    var minbar = {
      high: 350,
      low: 340,
      open: 340,
      close: 345,
      date: "2013-11-09 00:25",
      volume: 2000
    };
    // io.sockets.emit('trades', minbar);
    res.json(minbar);
  });
};
// all environments
