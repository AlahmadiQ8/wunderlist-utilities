var crypto = require('crypto');
var querystring = require('querystring');
var express = require('express');
var bodyParser = require('body-parser');


const secret = crypto.randomBytes(16).toString('hex');
var app = express();


app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));


// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


// Config body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// index: main view 
app.get('/', function(request, response) {
  response.render('pages/index', {redirect_uri: '#nothing'});
});


// Redirect user to authenticate 
app.get('/auth', function (req, res) {
  // res.redirect('https://www.google.com/')
  res.redirect('https://www.wunderlist.com/oauth/authorize?' +
       querystring.stringify( { client_id: process.env.CLIENT_ID,
                               redirect_uri: 'http://wunderlist-parser.herokuapp.com/callback',
                               state: secret} ))
});


// Wunderlist redirects back to your site
app.get('/callback', function(req, res){
  if (req.query.state !== secret) {
    res.sendStatus(403);
  } else {
    console.log(req.query.code)
  }
})


// run app
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});