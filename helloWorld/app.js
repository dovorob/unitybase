var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
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

module.exports = app;

const http = require('http');
const sqlite3 = require('sqlite3').verbose();

function getUserList (req, res) {
 res.writeHead(200, {'Content-Type': 'text/html'});

 let db = new sqlite3.Database('./db/nodeDB.db', (err) => {
   if (err) {
     console.error(err.message)
   }
   console.log('Connected to the nodeDB database.')
 })
//????????? ?????? ? ??
 let sql = `SELECT name, id FROM users ORDER BY name`;
//????????? ???? ?????? ???????
 res.write('<html><body>')
 let userList = '<p>Hello!</p>';
//?????????? ?????? ? ??
 db.all(sql, [], (err, rows) => {
   if (err) {
     throw err;
   }
//????????? html-??? ? ??????? ????????????? ??
   rows.forEach((row) => {
     userList += '<p>' + row.id + ' ' + row.name + '</p>';
     console.log(userList);
   })
//????????? ?????????? ? ??
   db.close((err) => {
     if (err) {
       console.error(err.message);
     }
     console.log('Close the database connection.');
   })
//????????? ? ?????? ??????? html-??? ? ??????? ?????????????
   if (userList) {
     res.write(userList);
   }                                                      
   res.end('</body></html>')
 })

}

http.createServer(getUserList).listen(3000)
console.log('listen on port 3000. \n Press Ctrl+C to terminate')


