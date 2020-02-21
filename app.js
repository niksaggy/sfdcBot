const express = require('express');
const bodyParser = require('body-parser');
const jsforce = require('jsforce');
const { dialogflow } = require('actions-on-google');
const {
  SimpleResponse,
  BasicCard,
  Image,
  Suggestions,
  Button
} = require('actions-on-google');

var options;
var port = process.env.PORT || 3000;
var conn = new jsforce.Connection({
  loginUrl : 'https://login.salesforce.com'
});

conn.login(process.env.username, process.env.password, function(err, userInfo) {
	if (err) { 
		return console.error(err); 
	}
	else{
		console.log(conn.accessToken);
		console.log(conn.instanceUrl);
		// logged in user property
		console.log("User ID: " + userInfo.id);
		console.log("Org ID: " + userInfo.organizationId);
		options = { Authorization: 'Bearer '+conn.accessToken};
	}
});




//app instance
const app = dialogflow({
  debug: true
});

const expApp = express().use(bodyParser.json());

var oppInfo = function(conv){
	return new Promise((resolve,reject)=>{
		console.log(options);
		conn.apex.get("/OppInfoSrvc?oppName="+conv.oppName+"&fieldNames="+conv.fieldNames,options,function(err, res){
			if (err) {
				reject(err);
			}
			else{
				resolve(result);
			}
		});
	});
};


app.intent('Default Welcome Intent', (conv) => {
	
	conv.ask(new SimpleResponse({
		speech:'Hi, how is it going? You are now logged into your personal dev org',
		text:'Hi, how is it going? You are now logged into your personal dev org',
	}));
});

app.intent('Get Opportunity Info', (conv) => {
	return oppInfo().then((resp) => {
		conv.ask(new SimpleResponse({
			speech:resp,
			text:resp,
		}));
	});
});


expApp.get('/', function (req, res) {
 res.send('Hello World!');
});
expApp.listen(port, function () {
 expApp.post('/fulfillment', app);
 console.log('Example app listening on port !');
});
