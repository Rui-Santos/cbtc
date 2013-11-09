
/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var trades = require('./routes/trades').trades; // a function
var http = require('http');
var path = require('path');
var models = require('./models/models');
var start_mtgox = require('./models/gox').start_mtgox_stream;
var Readable  = require('./readable');
var Websocket = require('ws');
var xtend     = require('xtend');
var inherits  = require('util').inherits;
var timer = require('timers');

var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(80);

// app.get('/', function (req, res) {
//   res.sendfile(__dirname + '/index.html');
// });

io.sockets.on('connection', function (socket) {
  socket.emit('trades', { hello: 'world' });
});

app.set('port', process.env.PORT || 3000);
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

module.exports = {
    createStream: createStream
  , currencies: currencies
}

var defaultOptions = {
        currency: 'USD'
      , ticker: true
      , depth: false
      , trade: false
      , lag: false
    }

function createStream(options) {
  return new MtGoxStream(options)
}

function MtGoxStream(options) {
  options = xtend(defaultOptions, options)

  Readable.call(this, { objectMode: true })

  var self = this
  var ws = null

  this._read = function () {
    if (ws) return

    var url = 'wss://websocket.mtgox.com'
    ws = new Websocket(url)

    ws.on('open', function() {
      console.log('connected to:', url)
      if (options.ticker) subscribe('ticker.BTC' + options.currency)
      if (options.depth) subscribe('depth.BTC' + options.currency)
      if (options.trade) subscribe('trade.BTC')
      if (options.lag) subscribe('trade.lag')
    })

    ws.on('message', function(data) {
      if (isValid(data)) output(data)
    })
  }

  function isValid(data) {
    try {
      var obj = JSON.parse(data)
      if (obj.channel && obj.channel_name) {
        if ('trade.BTC' !== obj.channel_name) {
          return true
        }
        return obj.trade.price_currency === options.currency
      }
    } catch (err) {
      console.log('invalid json data', data)
    }
    return false
  }

  function output(data) {
    // console.log(JSON.parse(data)["trade"]);
    var a_trade = new Trade(JSON.parse(data)["trade"]);
    a_trade.date = (a_trade.date * 1000);
    a_trade.save( function (err, trade_object) {
      if (err) {
        // god i hope we dont get errors
      } else {
        console.log("a trade for " + trade_object.amount + " happened at " + trade_object["date"]);
        io.sockets.on('connection', function (socket) {
          console.log(trade_object)
          socket.emit('trades', trade_object);
        });
        // this is where we could send the trade to jorges front end for the current price
      }
    });
  }

  function subscribe(channel) {
    console.log('subscribing to channel:', channel)
    ws.send(JSON.stringify({ op: 'mtgox.subscribe', channel: channel }))
  }
}

inherits(MtGoxStream, Readable)

function currencies() {
  return [
      'USD'
    , 'AUD'
    , 'CAD'
    , 'CHF'
    , 'CNY'
    , 'DKK'
    , 'EUR'
    , 'GBP'
    , 'HKD'
    , 'JPY'
    , 'NZD'
    , 'PLN'
    , 'RUB'
    , 'SEK'
    , 'SGD'
    , 'THB'
  ]
}

var start_mtgox_stream = function () {
  if (!module.parent) {
    var usd = new MtGoxStream({ticker: false, depth: false, trade: true})
    usd.pipe(process.stdout)
    // var eur = new MtGoxStream({ currency: 'EUR', ticker: false, depth: true })
    // eur.pipe(require('fs').createWriteStream('EUR'))
  }
};




// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bitcoin');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

var TradeSchema = mongoose.Schema({
    type: String,
    date: Date,
    price_currency: String,
    trade_type: String,
    primary: String,
    properties: String,
    tid: String,
    amount: Number,
    amount_int: String,
    price: Number,
    price_int: String,
    item: String
});
var Trade = mongoose.model('Trade', TradeSchema);

var MinuteBarSchema = mongoose.Schema({
  high: Number,
  low: Number,
  open: Number,
  close: Number,
  date: Date,
  volume: Number
});

var MinuteBar = mongoose.model('MinuteBar', MinuteBarSchema);

var calculateNewMinuteBar = function (currentTime, timeBack) {
  var tradeArray = [];
  var lastMinuteOfTrades = undefined;
  Trade.find()
        .where('date').gte(currentTime - timeBack)
        .sort( { date: 1 })
        .exec( function (err, docs) {
          if (!err && docs) {
            lastMinuteOfTrades = docs;
            tradeArray.push(lastMinuteOfTrades);
            // console.log("trades set in query " + lastMinuteOfTrades);

            if (lastMinuteOfTrades.length > 0) {
              var count = 0;
              var newMinuteBar = new MinuteBar();
              newMinuteBar.date = currentTime;
              newMinuteBar.open = lastMinuteOfTrades[0].price;
              newMinuteBar.close = lastMinuteOfTrades[lastMinuteOfTrades.length - 1 ].price;

              lastMinuteOfTrades.forEach( function(trade) {

                newMinuteBar.volume = 0;
                // console.log("this is a trade " + trade);
                if (newMinuteBar.high === undefined || trade.price > newMinuteBar.high) {
                  newMinuteBar.high = trade.price;
                }
                if (newMinuteBar.low === undefined || trade.price < newMinuteBar.low ) {
                  newMinuteBar.low = trade.price;
                }
                newMinuteBar.volume += trade.amount;
                count ++;
              });
              // console.log(newMinuteBar + " this is th abarrrrrrrrr")
              newMinuteBar.save( function( err, minbar ) {
                if (err) {
                  // console.log("error in save" + minbar);
                  console.log(err + " this is the error");
                } else {
                  console.log("minute bar was created at " + minbar.date + "high amount was " + minbar.high);
                  // console.log("minute bar was created at " + minbar.date + "low amount was " + minbar.low);
                  console.log(count + " trades happened in the last minute!!!");
                  // send min bar to jorge nowwww
                }
              });
            }
          }
        })
  ;
  console.log( "is this an array of trades? " + tradeArray.toString());


};

var runMinuteBarCalc = function () {
  setInterval(function() {
    var date = new Date();
    var time = 60 * 1000;
    calculateNewMinuteBar(date, time)
    } , 60 * 1000);
};

db.once('open', function callback () {
  startDate = new Date();
  console.log(startDate);
  start_app(Trade);
  start_mtgox_stream();
});

var start_app = function (Trade) {

  app.get('/', routes.index);
  app.get('/trades', trades(db, Trade));

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });

  runMinuteBarCalc();

};
// all environments



