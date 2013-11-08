var CreateTradeSchema = function () {
    var trades = mongoose.Schema({
        type: String,
        date: Date,
        price_currency: String,
        trade_type: String,
        primary: String,
        properties: String,
        tid: String,
        amount: Double,
        amount_int: String,
        price: Double,
        price_int: String,
        item: String
      });
    return trades;
};

exports.CreateTradeSchema = CreateTradeSchema;
