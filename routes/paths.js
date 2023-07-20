var express = require('express');
var router = express.Router();

router.get('/:mip_id', function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const mipId = req.params.mip_id;
    req.pool.query('SELECT * FROM learningpath WHERE mip_id=$1',[mipId], (error, results) => {
      if (error) {
        console.error(error);
        res.render('paths', {name: req.session.user.engineer_name,  pathsList: [], error: error});
      }
      else {
        res.render('paths', {name: req.session.user.engineer_name,  pathsList: results.rows, error: null });
      }
    });
  }
});

module.exports = router;
