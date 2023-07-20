const express = require('express');
const router = express.Router();


router.get('/', async function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const engineerId = req.session.user.engineer_id;

    try {
      const completedQueryText = 'SELECT a.*, m.mip_name FROM accreditation a INNER JOIN mip m ON a.mip_id = m.mip_id WHERE a.engineer_id = $1 AND a.isaccredited = true';
      const completedResult = await req.pool.query(completedQueryText, [engineerId]);
      const completedAccreditations = completedResult.rows;

      const ongoingQueryText = 'SELECT a.*, m.mip_name FROM accreditation a INNER JOIN mip m ON a.mip_id = m.mip_id WHERE a.engineer_id = $1 AND a.isaccredited = false';
      const ongoingResult = await req.pool.query(ongoingQueryText, [engineerId]);
      const ongoingMips = ongoingResult.rows;

      res.render('accreditations', {
        completedAccreditations: completedAccreditations,
        ongoingMips: ongoingMips,
        error: null,
        name: req.session.user.engineer_name
      });
    } catch (error) {
      console.error(error);
      res.render('accreditations', {
        completedAccreditations: [],
        ongoingMips: [],
        error: 'Error occurred while fetching accreditations.',
        name: req.session.user.engineer_name
      });
    }
  }
});

module.exports = router;