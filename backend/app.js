process.env.NODE_ENV = 'production';

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var compression = require('compression');
var helmet = require('helmet');

var deleteOldFiles = require('./deleteOldFiles');
var blastpRouter = require('./routes/blastp');
var downloadRouter = require('./routes/download');

var app = express();
app.use(cors());
app.use(compression());
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/api/blastp', blastpRouter);
app.use('/api/download', downloadRouter);

// serving react app
app.use(express.static(path.join(__dirname, 'frontend-build')));
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'frontend-build', 'index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//clean up / deleting old files
deleteOldFiles.cleanUp();

module.exports = app;
