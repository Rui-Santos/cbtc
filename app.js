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
var uristring = process.env.MONGOLAB_URI ||
                process.env.MONGOHQ_URL ||
                'mongodb://localhost/bitcoin';

mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
});
// commentssss
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
var theport = process.env.PORT || 8000;
server.listen(theport);

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

// create routes
var start_app = function () {


  app.get('/', routes.index());
  // app.get('/trades', trade_data( getHistoricalData ));
  app.get('/trades', function (req, res) {
    MinuteBar.find().sort( {date: -1} ).limit(200).lean().exec(
      function(err, docs) {
        if (!err && docs) {
          // console.log(docs);
          res.set('Content-Type', 'text/javacript');

          res.send("var trade_data = " + JSON.stringify(docs) + ";");
          // return docs[0];
        } else {
          res.send("Tried to select last 30min of data but got nothing :(");
          // return {};
        }
      }
    );
  });
    // var history = getHistoricalData();
    // console.log(history);
    // res.set('Content-Type', 'text/javacript');

    // res.send("var trade_data = " + JSON.stringify(history) + ";");
  // });

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

db.on('error', console.error.bind(console, ' database connection error:'));


// start database connection

db.once('open', function callback() {
  // start mtgox streaming
  // start_mtgox_stream();
  // start Blockchain transaction streaming
  Blockchain(io);
  // // create routes for dashboard
  start_app();
  // start sending up minute bars 1 minute after app starts
  // setTimeout(function() {
  //   runMinuteBarCalc(io)
  // }, 60 * 1000);
});



// all environments
