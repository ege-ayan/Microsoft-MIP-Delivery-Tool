var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const user = req.session.user;
    req.pool.query('SELECT COUNT(*) FROM mip', (error, result) => {
      if (error) return next(error);
      const totalAccreditation = result.rows[0].count;

      req.pool.query('SELECT COUNT(*) FROM learningpath', (error, result) => {
        if (error) return next(error);
        const totalPaths = result.rows[0].count;

        req.pool.query('SELECT COUNT(*) FROM learningpathsteps', (error, result) => {
          if (error) return next(error);
          const totalSteps = result.rows[0].count;

          req.pool.query('SELECT COUNT(*) FROM accreditation WHERE engineer_id = $1 AND isaccredited = true', [user.engineer_id], (error, result) => {
            if (error) return next(error);
            const accreditationComplete = result.rows[0].count;

            req.pool.query('SELECT COUNT(*) FROM accreditation WHERE engineer_id = $1 AND isaccredited = false', [user.engineer_id], (error, result) => {
              if (error) return next(error);
              const accreditationIncomplete = result.rows[0].count;

              req.pool.query('SELECT COUNT(*) FROM engineerlp WHERE eng_id = $1', [user.engineer_id], (error, result) => {
                if (error) return next(error);
                const userPaths = result.rows[0].count;

                req.pool.query('SELECT COUNT(*) FROM englpstepcompletion WHERE engineer_id = $1', [user.engineer_id], (error, result) => {
                  if (error) return next(error);
                  const userSteps = result.rows[0].count;

                  req.pool.query('SELECT COUNT(*) FROM engineer', (error, result) => {
                    if (error) return next(error);
                    const totalEngineers = result.rows[0].count;

                    const systemStats = {
                      totalAccreditation: totalAccreditation,
                      totalPaths: totalPaths,
                      totalSteps: totalSteps,
                      totalEngineers: totalEngineers,
                    };

                    const personalStats = {
                      totalAccreditation: accreditationComplete + accreditationIncomplete,
                      accreditationComplete: accreditationComplete,
                      accreditationIncomplete: accreditationIncomplete,
                      totalPaths: userPaths,
                      totalSteps: userSteps,
                    };
                    
                    res.render('statistics', { systemStats, personalStats, name: req.session.user.engineer_name });
                  });
                });
              });
            });
          });
        });
      });
    });
  }
});


module.exports = router;
