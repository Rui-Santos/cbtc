var Websocket = require('ws');

var CreateNewTransaction = function (transaction_data, geo_cord_array, io) {
  var transaction_size = JSON.parse(transaction_data)["x"]["out"][0]["value"]/100000000;
  var transaction_data_array = [geo_cord_array[0], geo_cord_array[1], transaction_size];
  // console.log("transaction_data_array " + transaction_data_array);
  io.sockets.emit('transactions', transaction_data_array);
};

var Blockchain = function(io) {
  var url = 'ws://ws.blockchain.info/inv';
  ws = new Websocket(url);

  ws.on('open', function() {
    console.log('connected to:', url);
    subscribe('blockchain');
   });

  ws.on('message', function(data) {
    output(data);
  });

  function output(data) {
    var geoip = require('geoip-lite');
    var ip_ping = eval("("+data+")").x.relayed_by;
    var geo = geoip.lookup(ip_ping);

    if(geo != null && geo["ll"]){
      geo = geoip.lookup(ip_ping);
      CreateNewTransaction(data,geo["ll"], io);
    }
  };

  function subscribe(channel) {
    console.log('subscribing to channel:', channel);
    ws.send(JSON.stringify({ op: 'unconfirmed_sub' }));
  };
};

module.exports = Blockchain;
