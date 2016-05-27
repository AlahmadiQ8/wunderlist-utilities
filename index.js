var express = require('express');

var app = express();

app.set('port', (process.env.PORT || 5000));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// index: main view 
app.get('/', function(request, response) {
  response.render('pages/index');
});

// run app
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});