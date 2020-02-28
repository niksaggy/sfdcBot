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
		console.log('**options** ' +options);
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
		console.log('**options** ' +options);
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


app.intent('Default Welcome Intent', (conv) => {
	
	conv.ask(new SimpleResponse({
		speech:'Hi, how is it going? You are now logged into your personal dev org',
		text:'Hi, how is it going? You are now logged into your personal dev org',
	}));
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


expApp.get('/', function (req, res) {
 res.send('Hello World!');
});
expApp.listen(port, function () {
 expApp.post('/fulfillment', app);
 console.log('Example app listening on port !');
});
