var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    res.render('addmip', { name: req.session.user.engineer_name });
  }
});

router.post('/addmip', async function(req, res, next) {
  const pool = req.pool;
  const mipName = req.body.mipName;
  const paths = req.body.paths;

  try {
    await pool.query('BEGIN');

    const mipQueryText = 'INSERT INTO mip(mip_name) VALUES($1) RETURNING mip_id';
    const mipRes = await pool.query(mipQueryText, [mipName]);
    const mipId = mipRes.rows[0].mip_id;

    for (let path of paths) {
      const pathQueryText = 'INSERT INTO learningpath(mip_id, name) VALUES($1, $2) RETURNING learningpath_id';
      const pathRes = await pool.query(pathQueryText, [mipId, path.pathName]);
      const pathId = pathRes.rows[0].learningpath_id;

      for (let step of path.steps) {
        const stepQueryText = 'INSERT INTO learningpathsteps(lp_id, lp_step_name) VALUES($1, $2) RETURNING lp_step_id';
        const stepRes = await pool.query(stepQueryText, [pathId, step]);
        const stepId = stepRes.rows[0].lp_step_id;

        const engLpStepCompQueryText = 'INSERT INTO englpstepcompletion(lp_step_id, engineer_id, iscomplete) VALUES($1, $2, $3)';
        await pool.query(engLpStepCompQueryText, [stepId, null, false]);
      }
    }

    await pool.query('COMMIT');
    res.status(200).json({ message: 'MIP created successfully.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error in transaction', error.stack);
    res.status(500).json({ message: 'Error occurred while creating MIP.' });
  }
});


module.exports = router;
