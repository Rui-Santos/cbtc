/* GET all trades */

function transform(docs) {
  // transform
  return docs;
}

function chartIqTransform(docs) {
  // do saturday
}

exports.trades = function(db, TradeModel) {
  return function(req, res) {
    // var collection = Tr;
    TradeModel.find({}, {}, function(e, docs) {
      res.render('trades', {
        "trades" : transform(docs)
      })
    });
  };
};



exports.trade_data = function(trade_data) {
  return function(req, res) {
    // var collection = Tr;
    res.set('Content-Type', 'text/javacript');
    res.send("var trade_data = "+JSON.stringify(trade_data));
  };
};
