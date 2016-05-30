var crypto = require('crypto');
var querystring = require('querystring');
var https = require('https')

var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session')
var FileStore = require('session-file-store')(session);
var morgan = require('morgan')

var api = require('./api.js')

var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Config body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// session configuration
app.use(session({
  name: 'server-session-cookie-id',
  secret: process.env.SECRET,
  saveUninitialized: true,
  cookie: { httpOnly: true, 
            secure: false, 
            maxAge: null,},
  store: new FileStore(),
  resave: false,
}))


// for message flashing
var flash = function(type, text) {
  var classes = (type === 'success' ? 'chip green lighten-4 green-text text-darken-1' : 'chip red lighten-4 red-text text-lighten-1')
  return {
    classes: classes,
    text: text + '<i class="material-icons">close</i>'}
};
// Session-persisted flash message middleware
app.use(function(req, res, next){
  var err = req.session.error;
  var msg = req.session.success;
  delete req.session.error;
  delete req.session.success;
  res.locals.message = '';
  if (err) res.locals.message = flash('error', err);
  if (msg) res.locals.message = flash('success', msg);
  next();
});


// index: main view 
app.get('/', function(req, res) {
  if (typeof(req.session.token) == "undefined") {
    var button = {text: 'Login', href: '/auth'}
  } else {
    var button = {text: 'Logout', href: '/logout'}
  }
  res.render('pages/index', {button: button});  
});


// Redirect user to authenticate 
app.get('/auth', function (req, res) {
  res.redirect('https://www.wunderlist.com/oauth/authorize?' +
       querystring.stringify( { client_id: process.env.CLIENT_ID,
                               redirect_uri: 'http://wunderlist-parser.herokuapp.com/callback',
                               state: process.env.SECRET} ))
});

// Logout 
app.get('/logout', (req, res) => {
  req.session.destroy( ()=> {
    res.redirect('/')
  })
})


// Wunderlist redirects back to your site
app.get('/callback', function(req, res){
  if (req.query.state !== process.env.SECRET) {
    res.sendStatus(403);
  } else {
    console.log(req.query.code)
    api.getToken(req.query.code, function(err, apires, json) {
      if (err) {
        console.log(err)
      } else {
        console.log(json)
        req.session.token = json.access_token;
      };
      res.redirect('/parser');
    })
    
  }
})


// parser page
app.get('/parser', function(req, res){
  if (req.query)
  res.render('pages/parser')
})

app.post('/parser', function(req, res){
  var title = req.body.title
  api.createList(req.session.token, title, function(err, apires, json){
    if (!error && response.statusCode == 201) {
      req.session.success = `<b>${title}</b> list created...`
    }
    console.log(json)
  })
  req.session.error = 'omg omg succeeded'
  res.redirect('/parser')
})

// run app
app.listen(app.get('port'), '0.0.0.0', function() {
  console.log('Node app is running on port', app.get('port'));
});