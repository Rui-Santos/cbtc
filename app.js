
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

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bitcoin');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log('yayyyy');
  start_app();

});

var start_app = function () {
  console.log("into start app");

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

  console.log('schema created');
  var Trade = mongoose.model('Trade', TradeSchema);


  console.log("past trade creation");

  app.get('/', routes.index);
  app.get('/trades', trades(db, Trade));

  var a_trade = new Trade( start_mtgox );
  console.log(a_trade.modelName);

  console.log('past trade');

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });


};
// all environments

