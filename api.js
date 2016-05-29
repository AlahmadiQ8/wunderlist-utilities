
var request = require('request');

module.exports = function() {

  function getToken(code, callback) {
    request.post({
      url: 'https://www.wunderlist.com/oauth/access_token',
      json: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: code,
      }
    }, callback(error, res, json));
  }

}