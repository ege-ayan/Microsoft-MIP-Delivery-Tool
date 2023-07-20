var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('register');
});

router.post('/', function(req, res, next) {
  let firstName = req.body.firstName;
  let lastName = req.body.lastName;

  firstName = firstName.split(' ').map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()).join(' ');
  lastName = lastName.split(' ').map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()).join(' ');

  const engineerName = `${firstName} ${lastName}`;

  const insertQuery = 'INSERT INTO engineer (engineer_name) VALUES ($1)';

  req.pool.query(insertQuery, [engineerName], (error, results) => {
    if (error) {
      console.error(error);
      res.render('register', { errorMessage: "Database error!" });
      return;
    } else {
      res.redirect('/login');
    }
  });
});

module.exports = router;

