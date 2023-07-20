var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var router = express.Router();

router.use(session({
  secret: 'your_secret_key', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

router.use(bodyParser.urlencoded({ extended: true }));

router.get('/', function(req, res, next) {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');

    res.render('login', { title: 'Login' });
  } 
});

router.post('/login', function(req, res, next) {
  const pool = req.pool;
  const id = req.body.id;

  pool.query('SELECT * FROM engineer WHERE engineer_id = $1', [id], (error, results) => {
    if (error) {
      console.error(error);
      res.render('login', { errorMessage: 'Error occurred while connecting to the database.' });
    } else if (results.rows.length > 0) {
      req.session.user = results.rows[0];
      res.redirect('/dashboard');
    } else {
      res.render('login', { errorMessage: 'No such ID. Check "What is my ID?"' });
    }
  });
});

module.exports = router;
