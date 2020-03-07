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

const expApp = express().use(bodyParser.json());

//app instance
const app = dialogflow({
  debug: true
});

var oauth2 = new jsforce.OAuth2({
  
  clientID: process.env.SALESFORCE_CONSUMER_KEY,
  clientSecret: process.env.SALESFORCE_CONSUMER_SECRET,
  redirectUri : 'http://localhost:3000/oauth/callback'
});




/*conn.login(process.env.username, process.env.password, function(err, userInfo) {
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
});*/


var oppInfo = function(oppName,fieldNames){
	return new Promise((resolve,reject)=>{
		console.log('**options** ' +options);
		conn.apex.get("/getOpptyInfo?oppName="+oppName+"&fieldNames="+fieldNames,options,function(err, res){
			if (err) {
				reject(err);
			}
			else{
				resolve(res);
			}
		});
	});
};


var createTask = function(oppName,taskSubject,taskPriority,conFName){
	return new Promise((resolve,reject)=>{
		
		conn.apex.get("/createTask?oppName="+oppName+"&taskSubject="+taskSubject+"&taskPriority="+taskPriority+"&contactFirstName="+conFName,options,function(err, res){
			if (err) {
				reject(err);
			}
			else{
				resolve(res);
			}
		});
	});
};

var logMeeting = function(meetingNotes,oppName,conFName){
	return new Promise((resolve,reject)=>{
		
		conn.apex.get("/logMeeting?oppName="+oppName+"&meetingNotes="+meetingNotes+"&contactFirstName="+conFName,options,function(err, res){
			if (err) {
				reject(err);
			}
			else{
				resolve(res);
			}
		});
	});
};

var logMeetingToday = function(meetingNotes,oppName,conFName){
	return new Promise((resolve,reject)=>{
		var followUpLtrTdy = 'Yes';
		conn.apex.get("/logMeeting?oppName="+oppName+"&meetingNotes="+meetingNotes+"&contactFirstName="+conFName+"&followUpLater="+followUpLtrTdy,options,function(err, res){
			if (err) {
				reject(err);
			}
			else{
				resolve(res);
			}
		});
	});
};


var updateOppty = function(fieldNames,fieldValues,oppName){
	return new Promise((resolve,reject)=>{
		
		conn.apex.get("/updateOpptyInfo?oppName="+oppName+"&fieldNames="+fieldNames+"&fieldValues="+fieldValues,options,function(err, res){
			if (err) {
				reject(err);
			}
			else{
				resolve(res);
			}
		});
	});
};


app.intent('Default Welcome Intent', (conv) => {
	
	conv.ask(new SimpleResponse({
		speech:'Hi, how is it going? You are being guided to the login page',
		text:'Hi, how is it going? You are being guided to the login page',
	}));
	//
	// Get authorization url and redirect to it.
	//

	expApp.get('/oauth2/auth', function(req, res) {
	  res.redirect(oauth2.getAuthorizationUrl({ scope : 'api id web' }));
	});

	//
	// Pass received authorization code and get access token
	//
	expApp.get('/oauth2/callback', function(req, res) {
	  var conn = new jsforce.Connection({ oauth2 : oauth2 });
	  var code = req.param('code');
	  conn.authorize(code, function(err, userInfo) {
		if (err) { return console.error(err); }
		// Now you can get the access token, refresh token, and instance URL information.
		// Save them to establish connection next time.
		console.log(conn.accessToken);
		console.log(conn.refreshToken);
		console.log(conn.instanceUrl);
		console.log("User ID: " + userInfo.id);
		console.log("Org ID: " + userInfo.organizationId);
		// ...
		res.send('success'); // or your desired response
		options = { Authorization: 'Bearer '+conn.accessToken};
	  });
	});
});

app.intent('Get Opportunity Info', (conv, {oppName,fieldNames} ) => {
	
	const opName = conv.parameters['oppName'];
	const fldNames = conv.parameters['fieldNames'];
	
	console.log('**conv parameters oppName** ' +opName);
	console.log('**conv parameters fieldNames** ' +fldNames);
	
	return oppInfo(opName,fldNames).then((resp) => {
		conv.ask(new SimpleResponse({
			speech:resp,
			text:resp,
		}));
	});
});

app.intent('Create Task on Opportunity', (conv, {oppName,taskSubject,taskPriority,contactFirstName} ) => {
	
	const opName = conv.parameters['oppName'];
	const tskSbj = conv.parameters['taskSubject'];
	const tskPr = conv.parameters['taskPriority'];
	const conFName = conv.parameters['contactFirstName'];
	
	return createTask(opName,tskSbj,tskPr,conFName).then((resp) => {
		conv.ask(new SimpleResponse({
			speech:resp,
			text:resp,
		}));
	});
});

app.intent('Log Meeting Notes', (conv, {meetingNotes} ) => {
	
	const meetingNt = conv.parameters['meetingNotes'];
	console.log('*** con context ** '+conv.contexts);
	const opName = conv.contexts.get('createtaskonopportunity-followup').parameters['oppName'];
	const conFName = conv.contexts.get('createtaskonopportunity-followup').parameters['contactFirstName']
	
	return logMeeting(meetingNt,opName,conFName).then((resp) => {
		conv.ask(new SimpleResponse({
			speech:resp,
			text:resp,
		}));
	});
});

app.intent('Update Opportunity', (conv, {fieldNames,fieldValues} ) => {
	
	const fldNames = conv.parameters['fieldNames'];
	const fldVal= conv.parameters['fieldValues'];
	const opName = conv.contexts.get('createtaskonopportunity-followup').parameters['oppName'];
	
	return updateOppty(fldNames,fldVal,opName).then((resp) => {
		conv.ask(new SimpleResponse({
			speech:resp,
			text:resp,
		}));
		
		conv.ask('Would you like to setup a follow up meeting later today');
  		conv.ask(new Suggestions('Yes', 'No'));
	});
});

app.intent('Update Opportunity - yes', (conv) => {
	
	const opName = conv.contexts.get('createtaskonopportunity-followup').parameters['oppName'];
	const conFName = conv.contexts.get('createtaskonopportunity-followup').parameters['contactFirstName']
	
	return logMeetingToday('follow up meeting',opName,conFName).then((resp) => {
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
