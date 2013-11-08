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
