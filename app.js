
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
var Readable  = require('./readable')
var Websocket = require('ws')
var xtend     = require('xtend')
var inherits  = require('util').inherits

var app = express();

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
    console.log(JSON.parse(data)["trade"]);
    var a_trade = new Trade(JSON.parse(data)["trade"]);
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

db.once('open', function callback () {
  console.log('yayyyy');
  start_app(Trade);
  start_mtgox_stream();
});

var start_app = function (Trade) {

  app.get('/', routes.index);
  app.get('/trades', trades(db, Trade));

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });


};
// all environments

