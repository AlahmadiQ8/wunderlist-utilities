
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
  }

}