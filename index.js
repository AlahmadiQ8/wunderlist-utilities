
var express     = require('express');
var querystring = require('querystring');
var bodyParser  = require('body-parser');
var client      = require('redis').createClient(process.env.REDIS_URL);
var session     = require('express-session')
var RedisStore  = require('connect-redis')(session);
var morgan      = require('morgan')
var Promise     = require("bluebird");
var api         = require('./api.js')
var apiPromise  = Promise.promisifyAll(require('./api.js'));

var app         = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));

// Views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Config body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  name: 'server-session-cookie-id',
  secret: process.env.SECRET,
  saveUninitialized: true,
  cookie: { httpOnly: true, 
            secure: false, 
            maxAge: null,},
  store: new RedisStore({client: client}),
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

// Process api call
function processApiCall(res, err, apires, json){
  if (err) {
    console.log(err);
    console.log('reached here')
    res.sendStatus(500);
    res.end();
  } else if (apires.statusCode != 201) {
    console.log(`${json.error.type}: ${apires.statusCode} ${json.error.message}`);
    console.log('no here')
    res.render('pages/error', {message: `${json.error.type}: ${apires.statusCode} ${json.error.message}`, error: ''});
    res.end()
  }
}

// Index: main view 
app.get('/', function(req, res) {
  if (!req.session.token) {
    res.render('pages/index', {button: {text: 'Login', href: '/auth'}});  
  } else {
    res.redirect('/parser');
  }
  
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
  var title = req.body.title;
  var tasks = req.body.tasks.split(/\r?\n/).filter(function(str) {
    return /\S/.test(str);
  })
  if (!tasks.length) {
    req.session.error = '<b>Error:</b> No tasks given in the tasks feild'
  }

  // create list
  api.createList(req.session.token, title, function(err, apires, json){

    // check successful api call 
    processApiCall(res, err, apires, json)

    var listId = json.id;

    // forEach is synch (blocking). but should switch to promises in the future 
    // create tasks
    Promise.each(tasks, function(task, index) {
      return apiPromise.createTaskAsync(req.session.token, listId, task)
             .then(function(resTask){
                console.log(resTask.statusCode)
                console.log('created task id ' + index)
      })
    }).catch( function(err){
      res.render('pages/error', {message: "Server error occured", error: err})
      res.end()
    });
    // apiPromise.createTaskAsync(req.session.token, listId, tasks[0]).then(function(resTask) {
    //   if (apires.statusCode == 201) {
    //     console.log('successfully created task')
    //     console.log(resTask.body)
    //   }
    // })
    // tasks.forEach(function(task, index, arr) {
    //   api.createTask(req.session.token, listId, task, function(errTask, apiresTask, jsonTask){

    //     // check successful api call 
    //     console.log('creating task')
    //     console.log('\t' + task)
    //     console.log('\t' + index)
    //     processApiCall(res, errTask, apiresTask, jsonTask)

    //   })
    // })

    req.session.success = `<b>${title}</b> list created successfully`;
    res.redirect('/parser')
  })
  
})


// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('pages/error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('pages/error', {
    message: err.message,
    error: {}
  });
});


// run app
app.listen(app.get('port'), '0.0.0.0', function() {
  console.log('Node app is running on port', app.get('port'));
});