var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    req.pool.query('SELECT * FROM mip ORDER BY mip_id', (error, results) => {
      if (error) {
        console.error(error);
        res.render('dashboard', { name: req.session.user.engineer_name, mipList: [], title: "Database Error", error: true });
      }
      else {
        res.render('dashboard', { name: req.session.user.engineer_name, mipList: results.rows, title: "Listing All MIPs", error: false });
      }
    });  
  }
});

router.post('/search', function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    var searchQuery = "%" + req.body.search + "%";
    req.pool.query('SELECT * FROM mip WHERE mip_name ILIKE $1', [searchQuery], (error, results) => {
      if (error) {
        console.error(error);
        res.render('dashboard', { name: req.session.user.engineer_name, mipList: [], title: "Database Error", error: true });
      } 
      else {
        var searchTitle = results.rows.length > 0 ? `${results.rows.length} results found for "${req.body.search}"` : `No results found for "${req.body.search}"`;
        res.render('dashboard', { name: req.session.user.engineer_name, mipList: results.rows, title: searchTitle, error: false });
      }
    });
  }
});

router.get('/logout', function(req, res){
  req.session.destroy(function(err) {
     if(err) {
        console.log(err);
     } else {
        res.redirect('/login');
     }
  });
});

module.exports = router;