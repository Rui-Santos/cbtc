module.exports = function(mongoose, MinuteBar) {
  // var MinuteBar = require('min_bar')(mongoose);

  // get last 30 minutes of data
  var get_historical_data = function() {
    MinuteBar.find().sort( {date: -1} ).limit(30).lean().exec(
      function(err, docs) {
        if (!err && docs) {
          console.log(docs);
          return docs[0];
        } else {
          console.log("Tried to select last 30min of data but got nothing :(");
          return {};
        }
      }
    );
  };

  return get_historical_data;
}
