// start mgox streaming
module.exports = function(mongoose, Trade) {
  // var Trade = require('./trades')(mongoose);
  console.log("trying to start_mtgox_stream");
  var Readable  = require('./../readable');
  var Websocket = require('ws');
  var xtend     = require('xtend');
  var inherits  = require('util').inherits;

  // var defaultOptions = {
  //         currency: 'USD'
  //       , ticker: false
  //       , depth: false
  //       , trade: true
  //       , lag: false
  //     };



  var MtGoxStream = function() {
    // console.log("creating new mtgox connection");
    // options = xtend(defaultOptions, options);
    var options = {
          currency: 'USD'
        , ticker: false
        , depth: false
        , trade: true
        , lag: false
      };

    Readable.call(this, { objectMode: true });

    var self = this;
    var ws = null;

    var initializeStream = function(url) {
      var wsStream = new Websocket(url);

      wsStream.on('open', function() {
        console.log('connected to:', url)
        if (options.ticker) subscribe('ticker.BTC' + options.currency)
        if (options.depth) subscribe('depth.BTC' + options.currency)
        if (options.trade) subscribe('trade.BTC')
        if (options.lag) subscribe('trade.lag')
      });

      wsStream.on('message', function(data) {
        if (isValid(data)) { output(data) }
      });

      wsStream.on('close', function() {
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("MtGox stream disconnected");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");
        console.log("----------------------------");

        // wsStream = initializeStream(url);
      });
      return wsStream;
    };

    this._read = function () {
      if (ws) {
        return
      } else {
        var url = 'wss://websocket.mtgox.com';
        console.log("url: " + url);
        ws = initializeStream(url);
      }
    };

    function isValid(data) {
      try {
        var obj = JSON.parse(data);
        if (obj.channel && obj.channel_name) {
          if ('trade.BTC' !== obj.channel_name) {
            return true;
          }
          return obj.trade.price_currency === options.currency;
        }
      } catch (err) {
        console.log('invalid json data', data);
      }
      return false;
    };

    function output(data) {
      var trade = new Trade(JSON.parse(data)["trade"]);
      trade.date = (trade.date * 1000);
      trade.save( function (err, trade_object) {
        if (err) {
          // god i hope we dont get errors
          console.log("error logging trade data " + err);
        } else {
          console.log("a trade for " + trade_object.amount + " happened at " + trade_object.date);
          // this is where we could send the trade to jorges front end for the current price
        }
      });
    };

    function subscribe(channel) {
      console.log('subscribing to channel:', channel);
      ws.send(JSON.stringify({ op: 'mtgox.subscribe', channel: channel }));
    };
  };

  inherits(MtGoxStream, Readable);

  function createStream(options) {
    var gox = new MtGoxStream();
    gox._read();
    return gox;
  };



  // function currencies() {
  //   return [
  //       'USD'
  //     , 'AUD'
  //     , 'CAD'
  //     , 'CHF'
  //     , 'CNY'
  //     , 'DKK'
  //     , 'EUR'
  //     , 'GBP'
  //     , 'HKD'
  //     , 'JPY'
  //     , 'NZD'
  //     , 'PLN'
  //     , 'RUB'
  //     , 'SEK'
  //     , 'SGD'
  //     , 'THB'
  //   ]
  // }

  // var start_mtgox_stream = function () {
  //   // if (!module.parent) {
  //     var usd = new MtGoxStream({ticker: false, depth: false, trade: true});
  //     // usd.pipe(process.stdout);
  //   // }
  // };

  return createStream;
}

