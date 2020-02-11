const express = require('express');
const jsforce = require('jsforce');
const { dialogflow } = require('actions-on-google');
const {
  SimpleResponse,
  BasicCard,
  Image,
  Suggestions,
  Button
} = require('actions-on-google');

var port = process.env.PORT || 3000;
var conn = new jsforce.Connection({
  loginUrl : 'https://login.salesforce.com'
});

conn.login(process.env.username, process.env.password, function(err, userInfo) {
	if (err) { 
		return console.error(err); 
	}
	console.log(conn.accessToken);
	console.log(conn.instanceUrl);
	// logged in user property
	console.log("User ID: " + userInfo.id);
	console.log("Org ID: " + userInfo.organizationId);
});




//app instance
const app = dialogflow({
  debug: true
});
const expApp = express();

console.log('just before intent handler');

app.intent('Default Welcome Intent', (conv) => {
	
	conv.ask(new SimpleResponse({
		speech:'Hi, how is it going? You are now logged into your personal dev org',
		text:'Hi, how is it going? You are now logged into your personal dev org',
	}));
});

expApp.get('/', function (req, res) {
 res.send('Hello World!');
});
expApp.listen(port, function () {
 console.log('Example app listening on port !');
});
