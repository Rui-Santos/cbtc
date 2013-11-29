/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var test = require('./routes/test').test;
var trade_data = require('./routes/trades').trade_data; // a function
var http = require('http');
var path = require('path');
var models = require('./models/models');
var start_mtgox = require('./models/gox').start_mtgox_stream;
var Readable  = require('./readable');
var Websocket = require('ws');
var xtend     = require('xtend');
var inherits  = require('util').inherits;
var timer = require('timers');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bitcoin');
var db = mongoose.connection;
// var socket = require('socket.io-client')('http://localhost');

var app = express()
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8080);

// app.get('/', function (req, res) {
//   res.sendfile(__dirname + '/index.jade');
// });

// io.sockets.on('connection', function (socket) {
//   socket.emit('trades', { hello: 'world' });
// });

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


var socket_connections = [];

io.sockets.on("connection", function(socket) {
  socket_connections.push(socket);
});

var CreateNewTransaction = function (transaction_data, geo_cord_array) {
  var transaction_size = JSON.parse(transaction_data)["x"]["out"][0]["value"]/100000000;
  var transaction_data_array = [geo_cord_array[0], geo_cord_array[1], transaction_size];
  console.log("transaction_data_array"+transaction_data_array);
  io.sockets.emit('transactions', transaction_data_array);
  // console.log("CREATE NEW TRANSACTION")
  // var a_transaction = new Transaction();
  //   a_transaction.date = JSON.parse(transaction_data)["x"]["time"];
  //   a_transaction.value = JSON.parse(transaction_data)["x"]["out"][0]["value"]/100000000;
  //   a_transaction.geo_location = geo_cord_array;
  //   a_transaction.save( function (err, transaction_object) {
  //     if (err) {
  //       console.log("error while saving transaction " + err)
  //     } else {
  //       console.log("a transaction for " + transaction_object.value + " bitcoins happened at " + transaction_object["date"]);
  //       // io.sockets.on('connection', function (socket) {
  //         console.log("transaction emitted " + transaction_object.value);
          // io.sockets.emit('transactions', geo_cord_array);
        // });
        // this is where we could send the trade to jorges front end for the current price
    //   }
    // });
};

function Blockchain(options) {

  var url = 'ws://ws.blockchain.info/inv'
  ws = new Websocket(url)

  ws.on('open', function() {
    console.log('connected to:', url)
    subscribe('blockchain')
   })

  ws.on('message', function(data) {
    output(data)
  })

  function output(data) {
    // console.log(JSON.parse(data));
    var geoip = require('geoip-lite');

    var ip_ping = eval("("+data+")").x.relayed_by;
    console.log(ip_ping);
    var geo = geoip.lookup(ip_ping);
    if(geo != null && geo["ll"]){
      geo = geoip.lookup(ip_ping);
      console.log(geo["ll"]);
      CreateNewTransaction(data,geo["ll"]);
    }
  }

  function subscribe(channel) {
    console.log('subscribing to channel:', channel)
    ws.send(JSON.stringify({ op: 'unconfirmed_sub' }))
  }
};

// var TransactionSchema = mongoose.Schema({
//   geo_location: Array,
//   value: Number,
//   date: Date
// });

// var Transaction = mongoose.model('Transaction', TransactionSchema);

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
    return false;
  }

  function output(data) {
    // console.log(JSON.parse(data)["trade"]);
    var a_trade = new Trade(JSON.parse(data)["trade"]);
    a_trade.date = (a_trade.date * 1000);
    a_trade.save( function (err, trade_object) {
      if (err) {
        // god i hope we dont get errors
        console.log("error logging trade data " + err);
      } else {
        console.log("a trade for " + trade_object.amount + " happened at " + trade_object["date"]);
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
  date: String,
  volume: Number
});

var MinuteBar = mongoose.model('MinuteBar', MinuteBarSchema);

var calculateNewMinuteBar = function (currentTime, timeBack) {
  var addZero = function(dateObject) {
    if (dateObject.toString().length === 1) {
      return "0" + dateObject ;
    }
    return dateObject;
  };
  var formatted_date = addZero(currentTime.getFullYear()+"-"+addZero(currentTime.getMonth() + 1))+"-"+addZero(currentTime.getDate())+" "+addZero(currentTime.getHours())+":"+addZero(currentTime.getMinutes());
  console.log(formatted_date);
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
              newMinuteBar.date = formatted_date;
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
                  // io.sockets.on('connection', function (socket) {
                  io.sockets.emit('trades', minbar);
                  // });
                }
              });
            }
          }
        })
  ;
  // console.log( "is this an array of trades? " + tradeArray.toString());
};

var runMinuteBarCalc = function () {
  setInterval(function() {
    var date = new Date();
    var time = 20 * 1000;
    calculateNewMinuteBar(date, time)
    } , 20 * 1000);
};

db.once('open', function callback () {
  startDate = new Date();
  console.log(startDate);
  start_app(Trade);
  start_mtgox_stream();
  Blockchain();
});

// MinuteBar.find().sort({date: -1}).limit(1);

var start_app = function (Trade) {

  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  console.log("-----------------------------------------");
  // console.log(MinuteBar.find().sort( {date: -1} ).limit(1).exec(
  //   function(err, docs) {
  //     console.log(docs);
  //   }));

  app.get('/', routes.index());

  trade_data_obj = MinuteBar.find().sort( {date: 1} ).limit(3).exec(
    function(err, docs) {
      return docs;
    });

  // app.get('/trades', trades(db, Trade));
  app.get('/trades', trade_data(trade_data_obj));
  // app.get('/last', routes.last(MinuteBar.find().sort({date: -1}).limit(1)));
  app.get('/test', function (req, res) {
    res.sendfile(__dirname + '/views/test.html');
  });

  app.get('/last', function(req, res) {
    var lastTrade = MinuteBar.find().limit(1).exec();
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
        io.sockets.emit('trades', minbar);

    res.json(minbar);


  });






  // http.createServer(app).listen(app.get('port'), function(){
  //   console.log('Express server listening on port ' + app.get('port'));
  // });

  runMinuteBarCalc();

};
// all environments
