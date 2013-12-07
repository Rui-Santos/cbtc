module.exports = function(mongoose) {
  var MinuteBarSchema = mongoose.Schema({
      high: Number,
      low: Number,
      open: Number,
      close: Number,
      date: String,
      volume: Number
    });

  var MinuteBar = mongoose.model('MinuteBar', MinuteBarSchema);

  return MinuteBar;
}
