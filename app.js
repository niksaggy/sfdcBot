const express = require('express');
const bodyParser = require('body-parser');
const jsforce = require('jsforce');
const { dialogflow } = require('actions-on-google');
const {
  SimpleResponse,
  BasicCard,
  SignIn,
  Image,
  Suggestions,
  Button
} = require('actions-on-google');

var options;
var timeOut = 3600;

var port = process.env.PORT || 3000;
var conn = {};

const expApp = express().use(bodyParser.json());
expApp.use(bodyParser.urlencoded());
//app instance
const app = dialogflow({
  debug: true
});

const oauth2 = new jsforce.OAuth2({
    clientId: process.env.SALESFORCE_CONSUMER_KEY,
    clientSecret: process.env.SALESFORCE_CONSUMER_SECRET,
    redirectUri: 'https://sfdcadminbot.herokuapp.com/callback'
});

expApp.get('/authorize', function(req, res) {
	var queryParams = req.query;
	console.log('this is the first request: '+req);
	res.redirect(oauth2.getAuthorizationUrl({ state: queryParams.state }));
	
});

expApp.get('/callback', function(req,res) {
    var queryParams = req.query;
    console.log('Request came for access callback');
    console.log('Query params in callback uri is ', req.query);
    let redirectUri = `${process.env.GOOGLE_REDIRECT_URI}?code=${queryParams.code}&state=${queryParams.state}`;
    console.log('Google redirecturi is ', redirectUri);
    res.redirect(redirectUri);
});


expApp.post('/token', function(req, res) {
    console.log('Request came for accesstoken');
    
    console.log('query params are-->', req.body);
	console.log('req query-->', req.query);
	
    res.setHeader('Content-Type', 'application/json');
    if (req.body.client_id != process.env.SALESFORCE_CONSUMER_KEY) {
        console.log('Invalid Client ID');
        return res.status(400).send('Invalid Client ID');
    }
    if (req.body.client_secret != process.env.SALESFORCE_CONSUMER_SECRET) {
        console.log('Invalid Client Ksecret');
        return res.status(400).send('Invalid Client ID');
    }
    if (req.body.grant_type) {
        if (req.body.grant_type == 'authorization_code') {
            console.log('Fetching token from salesforce');
            oauth2.requestToken(req.body.code, (err, tokenResponse) => {
                if (err) {
                    console.log(err.message);
                    return res.status(400).json({ "error": "invalid_grant" });
                }
				console.log('Token respons: ',tokenResponse);
				
                var googleToken = {
                    token_type: tokenResponse.token_type,
                    access_token: tokenResponse.access_token,
                    refresh_token: tokenResponse.refresh_token,
                    expires_in: timeOut
                };
                console.log('Token response for auth code', googleToken);
				//options = { Authorization: 'Bearer '+tokenResponse.access_token};
                res.status(200).json(googleToken);

            });
        } 
		else if (req.body.grant_type == 'refresh_token') {
            console.log('Fetching refresh token from salesforce');
            oauth2.refreshToken(req.body.refresh_token, (err, tokenResponse) => {
                if (err) {
                    console.log(err.message);
                    return res.status(400).json({ "error": "invalid_grant" });
                }
				console.log('Token response in refresh token: ',tokenResponse);
                var googleToken = { token_type: tokenResponse.token_type, access_token: tokenResponse.access_token, expires_in: timeOut };
				
                console.log('Token response for auth code', googleToken);
				//options = { Authorization: 'Bearer '+tokenResponse.access_token};
                res.status(200).json(googleToken);
            });
        }
    } else {
        res.send('Invalid parameter');
    }
});


var oppInfo = function(oppName,fieldNames,conn){
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


var createTask = function(oppName,taskSubject,taskPriority,conFName,conn){
	return new Promise((resolve,reject)=>{
		console.log('this is the js force connerction instance opened: ',conn);
		//console.log('this contains the access token to be used in calling the service on salesforce: ',options);
		conn.apex.get("/createTask?oppName="+oppName+"&taskSubject="+taskSubject+"&taskPriority="+taskPriority+"&contactFirstName="+conFName,function(err, res){
			if (err) {
				console.log('error is --> ',err);
				reject(err);
			}
			else{
				console.log('res is --> ',res);
				resolve(res);
			}
		});
	});
};

var logMeeting = function(meetingNotes,oppName,conFName,conn){
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

var logMeetingToday = function(meetingNotes,oppName,conFName,conn){
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


var updateOppty = function(fieldNames,fieldValues,oppName,conn){
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
	
	console.log('Request came for account link flow start');	
    	if(!conv.user.access.token){
      		conv.ask(new SignIn());
    	}
    	else{
        	conv.ask('You are already signed in ');
    	}
	
});

app.intent('Get SignIn Info', (conv, params, signin) => {    
	console.log('Sign in info Intent');    
	console.log('Sign in content-->',signin);       
	if (signin.status === 'OK') {         
		console.log('this is used for calling webservices in salesforce : ' + options);
		conv.ask('Hola, thanks for signing in! What do you want to do next?')       ;
	} 
	else {         
		conv.ask('Something went wrong in the sign in process');       
	}     
}); 

app.intent('Get Opportunity Info', (conv, {oppName,fieldNames} ) => {
	
	const opName = conv.parameters['oppName'];
	const fldNames = conv.parameters['fieldNames'];
	
	console.log('**conv parameters oppName** ' +opName);
	console.log('**conv parameters fieldNames** ' +fldNames);
	
	
	conn = new jsforce.Connection({
	  instanceUrl : process.env.INSTANCE_URL,
	  accessToken : conv.user.access.token
	});
	
	return oppInfo(opName,fldNames,conn).then((resp) => {
		conv.ask(new SimpleResponse({
			speech:resp,
			text:resp,
		}));
	});
});

app.intent('Create Task on Opportunity', (conv, {oppName,taskSubject,taskPriority,contactFirstName} ) => {
	console.log('conv: ',conv);
	console.log('Access token from conv inside intent: ',conv.user.access.token);
	const opName = conv.parameters['oppName'];
	const tskSbj = conv.parameters['taskSubject'];
	const tskPr = conv.parameters['taskPriority'];
	const conFName = conv.parameters['contactFirstName'];
	console.log('Instance URL as stored in heroku process variable: ',process.env.INSTANCE_URL);
	conn = new jsforce.Connection({
	  instanceUrl : process.env.INSTANCE_URL,
	  accessToken : conv.user.access.token
	});
	return createTask(opName,tskSbj,tskPr,conFName,conn).then((resp) => {
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
	
	conn = new jsforce.Connection({
	  instanceUrl : process.env.INSTANCE_URL,
	  accessToken : conv.user.access.token
	});
	
	return logMeeting(meetingNt,opName,conFName,conn).then((resp) => {
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
	
	conn = new jsforce.Connection({
	  instanceUrl : process.env.INSTANCE_URL,
	  accessToken : conv.user.access.token
	});
	
	return updateOppty(fldNames,fldVal,opName,conn).then((resp) => {
		conv.ask(new SimpleResponse({
			speech:resp,
			text:resp,
		}));
		
		conv.ask('Would you like to setup a follow up meeting later today');
  		conv.ask(new Suggestions('Yes', 'No'));
	});
});

app.intent('Update Opportunity - yes', (conv) => {
	
	const cntxt = conv.contexts.get('updateopportunity-followup');
	
	const opName = conv.contexts.get('updateopportunity-followup').parameters['oppName'];
	const conFName = conv.contexts.get('updateopportunity-followup').parameters['contactFirstName'];
	
	conn = new jsforce.Connection({
	  instanceUrl : process.env.INSTANCE_URL,
	  accessToken : conv.user.access.token
	});
	
	return logMeetingToday('follow up meeting',opName,conFName,conn).then((resp) => {
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
