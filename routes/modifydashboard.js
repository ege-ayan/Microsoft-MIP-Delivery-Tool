var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    req.pool.query('SELECT * FROM mip', (error, results) => {
      if (error) {
        console.error(error);
        res.render('modifydashboard', { name: req.session.user.engineer_name, mipList: [], title: "Database Error", error: true });
      } else {
        res.render('modifydashboard', { name: req.session.user.engineer_name, mipList: results.rows, title: "Listing All MIPs", error: false });
      }
    });  
  }
});

module.exports = router;