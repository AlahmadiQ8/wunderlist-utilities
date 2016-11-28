var env = process.env.NODE_ENV

var express     = require('express');
var querystring = require('querystring');
var bodyParser  = require('body-parser');
var client      = (env == 'production') ?
                  require('redis').createClient(process.env.REDIS_URL)
                  : undefined
var session     = require('express-session')
var RedisStore  = (env == 'production')  ? require('connect-redis')(session) : undefined
var FileStore   = (env == 'development') ? require('session-file-store')(session) : undefined
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
var sessionOptions = {
  name: 'server-session-cookie-id',
  secret: process.env.SECRET,
  saveUninitialized: true,
  cookie: { httpOnly: true, 
            secure: false, 
            maxAge: null,},
  resave: false,
  maxAge: (1000 * 60 * 60) * 2,
}
sessionOptions.store = (env == 'production') 
                       ? new RedisStore({client: client})
                       : new FileStore;
app.use(session(sessionOptions))


// for message flashing
var flash = function(type, text) {
  var classes = (type === 'success' ? 'chip green lighten-4 green-text text-darken-1' : 'chip red lighten-4 red-text text-lighten-1')
  return {
    classes: classes,
    text: text + '<i class="material-icons js-dismiss">close</i>'}
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
  var query = { 
    client_id: process.env.CLIENT_ID,
    state: process.env.SECRET
  }
  query.redirect_uri = (env == 'production') 
                       ? 'http://wunderlist-parser.herokuapp.com/callback'
                       : 'http://192.168.0.8:5000/callback';
  res.redirect('https://www.wunderlist.com/oauth/authorize?' +
       querystring.stringify(query))
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
app.get('/parser', function(req, res, next) {
  if (!req.session.token) {
    res.redirect('/auth');
  } else {
    next();
  }
}, function(req, res){
  api.getLists(req.session.token, function(err, apires, json){
    res.render('pages/parser', {lists: JSON.parse(json)})
  })
})


// proccess post request
app.post('/parser', function(req, res){

  var title = req.body.title;

  req.body.existingListId;

  var tasks = req.body.tasks.split(/\r?\n/).filter(function(str) {
    return /\S/.test(str);
  })
  if (!tasks.length) {
    req.session.error = '<b>Error:</b> No tasks given in the tasks feild'
    res.redirect('/parser');
    return;
  }

  // Parse dates from task into a due date
  tasks = tasks.map(function(task){

    var title = task;
    var due_date = null;

    // Formats accepted: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
    var regex = /(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.](\d{4})/;

    if (regex.test(title)) {
      var parsed = title.match(regex);
      console.log(parsed[3] + '-' + (parsed[2].length < 2 ? '0' : '') + parsed[2] + '-' + (parsed[1].length < 2 ? '0' : '') + parsed[1] + 'T00:00:00');
      due_date = new Date(parsed[3] + '-' + (parsed[2].length < 2 ? '0' : '') + parsed[2] + '-' + (parsed[1].length < 2 ? '0' : '') + parsed[1] + 'T00:00:00').toISOString();
      title = title.replace(regex, '').trim();
    }

    return { title: title, due_date: due_date };
  });

  // create list
  var promise = req.body.existingListId
                ? new Promise.resolve("")
                : apiPromise.createListAsync(req.session.token, title);
  promise
  .then(function(apires){
    if (apires && apires.statusCode != 201) {
      console.log(`${json.error.type}: ${apires.statusCode} ${json.error.message}`);
      req.session.error = `${json.error.type}: ${apires.statusCode} ${json.error.message}`
      res.redirect('/parser');
    }

    var listId = req.body.existingListId || apires.body.id;
    listId = Number(listId);
    console.log(`list id is ${listId}`);

    return Promise.each(tasks, function(task, index) {
      return apiPromise.createTaskAsync(req.session.token, listId, task)
             .then(function(resTask){
                if (resTask && resTask.statusCode != 201) {
                  console.log('error creating a task')
                  console.log(`${resTask.body.error.type}: ${resTask.statusCode} ${resTask.body.message}`);
                  return Promise.reject(new Error("error creating a task"))
                } else {
                  console.log(resTask.body.title)
                  console.log('created task id ' + index)
                }
      })
    })
  })
  .then(function() {
      if (title) { 
        req.session.success = `<b>${title}</b> list created successfully`; 
      }
      else { 
        req.session.success = `Tasks appended successfully`; 
      }
      res.redirect('/parser')
  }).catch(function(err){
    req.session.error = `${err.message}`;
    res.redirect('/parser');
  })
})


// run app
app.listen(app.get('port'), '0.0.0.0', function() {
  console.log('Node app is running on port', app.get('port'));
});