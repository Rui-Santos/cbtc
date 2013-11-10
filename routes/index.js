
/*
 * GET home page.
 */

exports.index = function(){
  return function(req, res) {
    res.render('index');
  };
};

