
var request = require('request');

var headers = function(token) {
  return {
    'X-Access-Token' : token,
    'X-Client-ID' : process.env.CLIENT_ID
  }
}

module.exports = {

  getToken: function getToken(code, callback) {
    request.post({
      url : 'https://www.wunderlist.com/oauth/access_token',
      json : {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: code,
      }
    }, callback);
  },

  createList: function createList(token, title, callback) {
    request.post({
      url : 'https://a.wunderlist.com/api/v1/lists',
      headers : headers(token),
      json : { title : title },
      }, callback)
  },

  createTask: function createTask(token, listId, task, callback) {
    request.post({
      url : 'https://a.wunderlist.com/api/v1/tasks',
      headers : headers(token),
      json : { list_id: listId, title: task.title, completed: false, due_date: task.due_date  }
    }, callback)
  },

  getLists: function getList(token, callback) {
    request.get({
      url : 'https://a.wunderlist.com/api/v1/lists',
      headers : headers(token)
    }, callback)
  }

}
