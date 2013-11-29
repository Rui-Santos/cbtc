module.exports = function(mongoose) {
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

  return Trade;
}
