const express = require('express');
const router = express.Router();

router.get('/:mipId', async function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    const mipId = req.params.mipId;
    const pool = req.pool;

    try {
      await pool.query('BEGIN');

      // Get MIP name
      const mipNameQueryText = 'SELECT mip_name FROM mip WHERE mip_id = $1';
      const mipNameRes = await pool.query(mipNameQueryText, [mipId]);
      const mipName = mipNameRes.rows[0].mip_name;

      // Get paths and steps for the MIP
      const pathsQueryText = 'SELECT * FROM learningpath WHERE mip_id = $1';
      const pathsRes = await pool.query(pathsQueryText, [mipId]);
      const paths = pathsRes.rows;

      for (let path of paths) {
        const stepsQueryText = 'SELECT * FROM learningpathsteps WHERE lp_id = $1';
        const stepsRes = await pool.query(stepsQueryText, [path.learningpath_id]);
        path.steps = stepsRes.rows;
      }

      await pool.query('COMMIT');

      res.render('modify', {
        name: req.session.user.engineer_name,
        mipId: mipId,
        mipName: mipName,
        paths: paths
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('Error in transaction', error.stack);
      res.status(500).json({ message: 'Error occurred while retrieving MIP data.' });
    }
  }
});

router.post('/modifymip', async function(req, res, next) {
  const pool = req.pool;
  const mipId = req.body.mipId;
  const mipName = req.body.mipName;
  const paths = req.body.paths;

  try {
    await pool.query('BEGIN');

    // Retrieve all related steps in the Learning Path Steps
    const selectLpStepsQueryText = 'SELECT lp_step_id FROM learningpathsteps WHERE lp_id IN (SELECT learningpath_id FROM learningpath WHERE mip_id = $1)';
    const lpStepIds = (await pool.query(selectLpStepsQueryText, [mipId])).rows.map(row => row.lp_step_id);

    // Delete related rows from englpstepcompletion table
    for (let lpStepId of lpStepIds) {
      const deleteEngLpStepCompQueryText = 'DELETE FROM englpstepcompletion WHERE lp_step_id = $1';
      await pool.query(deleteEngLpStepCompQueryText, [lpStepId]);
    }

    // Delete rows from learningpathsteps table for existing paths that are not present in the updated paths
    const existingPathsQueryText = 'SELECT learningpath_id FROM learningpath WHERE mip_id = $1';
    const existingPathsRes = await pool.query(existingPathsQueryText, [mipId]);
    const existingPathIds = existingPathsRes.rows.map(row => row.learningpath_id);

    for (let existingPathId of existingPathIds) {
      const foundPath = paths.find(path => path.pathId === existingPathId);

      if (!foundPath) {
        // Delete rows from englpstepcompletion table for the path
        const deleteEngLpStepCompQueryText = 'DELETE FROM englpstepcompletion WHERE lp_step_id IN (SELECT lp_step_id FROM learningpathsteps WHERE lp_id = $1)';
        await pool.query(deleteEngLpStepCompQueryText, [existingPathId]);

        // Delete rows from learningpathsteps table for the path
        const deleteStepsQueryText = 'DELETE FROM learningpathsteps WHERE lp_id = $1';
        await pool.query(deleteStepsQueryText, [existingPathId]);

        // Delete row from learningpath table for the path
        const deletePathQueryText = 'DELETE FROM learningpath WHERE learningpath_id = $1';
        await pool.query(deletePathQueryText, [existingPathId]);
      }
    }

    // Update MIP name
    const mipQueryText = 'UPDATE mip SET mip_name = $1 WHERE mip_id = $2';
    await pool.query(mipQueryText, [mipName, mipId]);

    // Insert or update paths and steps
    for (let path of paths) {
      let pathId;

      if (path.pathId && existingPathIds.includes(path.pathId)) {
        // Existing path, update steps
        pathId = path.pathId;
      } else {
        // New path, insert path and steps
        const newPathQueryText = 'INSERT INTO learningpath(mip_id, name) VALUES($1, $2) RETURNING learningpath_id';
        const newPathRes = await pool.query(newPathQueryText, [mipId, path.pathName]);
        pathId = newPathRes.rows[0].learningpath_id;
      }

      // Delete existing steps before inserting new ones
      const deleteStepsQueryText = 'DELETE FROM learningpathsteps WHERE lp_id = $1';
      await pool.query(deleteStepsQueryText, [pathId]);

      // Insert new steps
      for (let step of path.steps) {
        const newStepQueryText = 'INSERT INTO learningpathsteps(lp_id, lp_step_name) VALUES($1, $2) RETURNING lp_step_id';
        const newStepRes = await pool.query(newStepQueryText, [pathId, step]);
        const lpStepId = newStepRes.rows[0].lp_step_id;

        // Check if there are associated engineerlp records for the step
        const associatedEngineerLpQueryText = 'SELECT englp_id FROM engineerlp WHERE lp_id = $1';
        const associatedEngineerLpRes = await pool.query(associatedEngineerLpQueryText, [pathId]);

        if (associatedEngineerLpRes.rows.length > 0) {
          const englpIds = associatedEngineerLpRes.rows.map(row => row.englp_id);

          // Insert records into englpstepcompletion table for each englp_id and lp_step_id combination
          const insertEngLpStepCompQueryText = 'INSERT INTO englpstepcompletion (englp_id, lp_step_id) VALUES ($1, $2)';
          for (let englpId of englpIds) {
            await pool.query(insertEngLpStepCompQueryText, [englpId, lpStepId]);
          }
        }
      }
    }

    await pool.query('COMMIT');
    res.status(200).json({ message: 'MIP modified successfully.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error in transaction', error.stack);
    res.status(500).json({ message: 'Error occurred while modifying MIP.' });
  }
});


router.delete('/deletemip/:mipId', async function(req, res, next) {
  const pool = req.pool;
  const mipId = req.params.mipId;

  try {
    await pool.query('BEGIN');

    // Retrieve all related steps in the Learning Path Steps
    const selectLpStepsQueryText = 'SELECT lp_step_id FROM learningpathsteps WHERE lp_id IN (SELECT learningpath_id FROM learningpath WHERE mip_id = $1)';
    const lpStepIds = (await pool.query(selectLpStepsQueryText, [mipId])).rows.map(row => row.lp_step_id);

    // Delete related rows from englpstepcompletion table
    for (let lpStepId of lpStepIds) {
      const deleteEngLpStepCompQueryText = 'DELETE FROM englpstepcompletion WHERE lp_step_id = $1';
      await pool.query(deleteEngLpStepCompQueryText, [lpStepId]);
    }

    // Delete rows from accreditation table
    const deleteAccreditationQueryText = 'DELETE FROM accreditation WHERE mip_id = $1';
    await pool.query(deleteAccreditationQueryText, [mipId]);

    // Delete rows from learningpathsteps table
    const deleteStepsQueryText = 'DELETE FROM learningpathsteps WHERE lp_id IN (SELECT learningpath_id FROM learningpath WHERE mip_id = $1)';
    await pool.query(deleteStepsQueryText, [mipId]);

    // Delete rows from engineerlp table
    const deleteEngineerLpQueryText = 'DELETE FROM engineerlp WHERE lp_id IN (SELECT learningpath_id FROM learningpath WHERE mip_id = $1)';
    await pool.query(deleteEngineerLpQueryText, [mipId]);

    // Delete rows from learningpath table
    const deletePathsQueryText = 'DELETE FROM learningpath WHERE mip_id = $1';
    await pool.query(deletePathsQueryText, [mipId]);

    // Delete the MIP
    const deleteMipQueryText = 'DELETE FROM mip WHERE mip_id = $1';
    await pool.query(deleteMipQueryText, [mipId]);

    await pool.query('COMMIT');
    res.status(200).json({ message: 'MIP deleted successfully.' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error in transaction', error.stack);
    res.status(500).json({ message: 'Error occurred while deleting MIP.' });
  }
});


module.exports = router;
