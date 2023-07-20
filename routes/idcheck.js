var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  const selectQuery = 'SELECT * FROM engineer';
  
  req.pool.query(selectQuery, (error, results) => {
    if (error) {
      console.error(error);
      res.render('idcheck', { errorMessage: "Database error!" });
      return;
    } else {
      res.render('idcheck', { users: results.rows });
    }
  });
});

router.get('/search', function(req, res, next) {
    const searchText = req.query.search;
    
    const searchQuery = "SELECT * FROM engineer WHERE engineer_name ILIKE $1";
    
    req.pool.query(searchQuery, ['%' + searchText + '%'], (error, results) => {
      if (error) {
        console.error(error);
        res.render('idcheck', { errorMessage: "Database error!" });
        return;
      } else {
        res.render('idcheck', { users: results.rows });
      }
    });
  });

module.exports = router;