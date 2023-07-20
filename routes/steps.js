var express = require('express');
var router = express.Router();

router.get('/:path_id', function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const pathId = req.params.path_id;
    const engineerId = req.session.user.engineer_id;

    // Check if rows exist in englpstepcompletion table for the given path and engineer
    req.pool.query('SELECT * FROM learningpathsteps LEFT JOIN englpstepcompletion ON learningpathsteps.lp_step_id = englpstepcompletion.lp_step_id WHERE learningpathsteps.lp_id = $1 AND engineer_id = $2 ORDER BY learningpathsteps.lp_step_id', [pathId, engineerId], (error, results) => {
      if (error) {
        console.error(error);
        res.render('steps', { name: req.session.user.engineer_name, stepsList: [], error: error });
      } else {
        const totalSteps = results.rows.length;
        const completedSteps = results.rows.filter(step => step.iscomplete).length;
        const completionRatio = totalSteps ? completedSteps / totalSteps : 0;

        // If rows don't exist, perform insert operation for each step
        if (totalSteps === 0) {
          req.pool.query('SELECT * FROM learningpathsteps WHERE lp_id = $1 ORDER BY lp_step_id', [pathId], (error, stepResults) => {
            if (error) {
              console.error(error);
              res.render('steps', { name: req.session.user.engineer_name, stepsList: [], completionRatio: 0, error: error });
            } else {
              const stepsList = stepResults.rows;
              const insertPromises = stepsList.map(step => {
                const insertQueryText = 'INSERT INTO englpstepcompletion (lp_step_id, engineer_id, iscomplete) VALUES ($1, $2, false)';
                return req.pool.query(insertQueryText, [step.lp_step_id, engineerId]);
              });

              Promise.all(insertPromises)
                .then(() => {
                  res.render('steps', { name: req.session.user.engineer_name, stepsList: stepsList, completionRatio: 0, error: null });
                })
                .catch(error => {
                  console.error(error);
                  res.render('steps', { name: req.session.user.engineer_name, stepsList: [], completionRatio: 0, error: error });
                });
            }
          });
        } else {
          const stepsList = results.rows;
          res.render('steps', { name: req.session.user.engineer_name, stepsList: stepsList, completionRatio: completionRatio, error: null });
        }
      }
    });
  }
});

  
router.get('/complete/:path_id/:step_id', async function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const stepId = req.params.step_id;
    const pathId = req.params.path_id;
    const engineerId = req.session.user.engineer_id;

    try {
      const mipQueryText = 'SELECT mip_id FROM learningpath WHERE learningpath_id = $1';
      const mipResult = await req.pool.query(mipQueryText, [pathId]);
      const mipId = mipResult.rows[0].mip_id;

      const isCompleteQueryText = 'SELECT iscomplete FROM englpstepcompletion WHERE lp_step_id = $1 AND engineer_id = $2';
      const isCompleteResult = await req.pool.query(isCompleteQueryText, [stepId, engineerId]);
      const isComplete = isCompleteResult.rows[0].iscomplete;

      const newStatus = isComplete ? false : true;
      const updateQueryText = 'UPDATE englpstepcompletion SET iscomplete = $1 WHERE lp_step_id = $2 AND engineer_id = $3';
      await req.pool.query(updateQueryText, [newStatus, stepId, engineerId]);

      if (newStatus && await areAllStepsCompleted(pathId, engineerId, req.pool)) {
        const engineerLpExistsQueryText = 'SELECT * FROM engineerlp WHERE lp_id = $1 AND eng_id = $2';
        const engineerLpExistsResult = await req.pool.query(engineerLpExistsQueryText, [pathId, engineerId]);

      if (engineerLpExistsResult.rows.length === 0) {
        const insertEngineerLpQueryText = 'INSERT INTO engineerlp (lp_id, eng_id) VALUES ($1, $2)';
  await req.pool.query(insertEngineerLpQueryText, [pathId, engineerId]);
}

        const accreditationExistsQueryText = 'SELECT * FROM accreditation WHERE engineer_id = $1 AND mip_id = $2';
        const accreditationExistsResult = await req.pool.query(accreditationExistsQueryText, [engineerId, mipId]);

        if (accreditationExistsResult.rows.length === 0) {
          const insertAccreditationQueryText = 'INSERT INTO accreditation (engineer_id, mip_id, isaccredited) VALUES ($1, $2, true)';
          await req.pool.query(insertAccreditationQueryText, [engineerId, mipId]);
        } else {
          const updateAccreditationQueryText = 'UPDATE accreditation SET isaccredited = true WHERE engineer_id = $1 AND mip_id = $2';
          await req.pool.query(updateAccreditationQueryText, [engineerId, mipId]);
        }
      } else {
        const updateAccreditationQueryText = 'UPDATE accreditation SET isaccredited = false WHERE engineer_id = $1 AND mip_id = $2';
        await req.pool.query(updateAccreditationQueryText, [engineerId, mipId]);
      }

      res.redirect(`/steps/${pathId}`);
    } catch (error) {
      console.error(error);
      res.render('steps', { name: req.session.user.engineer_name, stepsList: [], error: error });
    }
  }
});

async function areAllStepsCompleted(pathId, engineerId, pool) {
  try {
    const countQueryText = 'SELECT COUNT(*) AS total_steps FROM learningpathsteps WHERE lp_id = $1';
    const countResult = await pool.query(countQueryText, [pathId]);
    const totalSteps = countResult.rows[0].total_steps;

    const completedQueryText = 'SELECT COUNT(*) AS completed_steps FROM englpstepcompletion WHERE lp_step_id IN (SELECT lp_step_id FROM learningpathsteps WHERE lp_id = $1) AND engineer_id = $2 AND iscomplete = true';
    const completedResult = await pool.query(completedQueryText, [pathId, engineerId]);
    const completedSteps = completedResult.rows[0].completed_steps;

    return totalSteps === completedSteps;
  } catch (error) {
    console.error(error);
    return false;
  }
}

module.exports = router;
