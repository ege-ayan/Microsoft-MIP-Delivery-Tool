const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { Pool } = require('pg');

const loginRouter = require('./routes/login');
const dashboardRouter = require('./routes/dashboard');
const pathsRouter = require('./routes/paths');
const registerRouter = require('./routes/register');
const statisticsRouter = require('./routes/statistics');
const idcheckRouter = require('./routes/idcheck');
const stepsRouter = require('./routes/steps');
const addmipRouter = require('./routes/addmip');
const modifydashboardRouter = require('./routes/modifydashboard');
const modifyRouter = require('./routes/modify');
const accreditationsRouter = require('./routes/accreditations');

const app = express();

const pool = new Pool({
  user: 'postgres',
  host: '20.203.212.232',
  database: 'internprj',
  password: 'postgres',
  port: 5435,
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.pool = pool;
  next();
});

app.use('/', loginRouter);
app.use('/login', loginRouter);
app.use('/dashboard', dashboardRouter);
app.use('/paths', pathsRouter);
app.use('/register', registerRouter);
app.use('/statistics', statisticsRouter);
app.use('/idcheck', idcheckRouter);
app.use('/steps', stepsRouter);
app.use('/addmip', addmipRouter);
app.use('/modifydashboard', modifydashboardRouter);
app.use('/modify', modifyRouter);
app.use('/accreditations', accreditationsRouter);

app.use(function(req, res, next) {
  next(createError(404));
});


app.use(function(err, req, res, next) {

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;