module.exports = function(mongoose, MinuteBar) {
  // var MinuteBar = require('min_bar')(mongoose);

  // get last 30 minutes of data
  var get_historical_data = function() {
    MinuteBar.find().sort( {date: 1} ).limit(30).exec(
      function(err, docs) {
        if (!err && docs) {
          return docs;
        } else {
          return {};
        }
      }
    );
  };

  return get_historical_data;
}
