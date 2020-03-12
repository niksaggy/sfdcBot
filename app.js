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
var port = process.env.PORT || 3000;

const expApp = express().use(bodyParser.json());

//app instance
const app = dialogflow({
  debug: true
});

var conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com'
});

/*var oauth2 = new jsforce.OAuth2({
  
  clientID: process.env.SALESFORCE_CONSUMER_KEY,
  clientSecret: process.env.SALESFORCE_CONSUMER_SECRET,
  redirectUri : '${req.protocol}://${req.get('host')}/${process.env.REDIRECT_URI}'

});*/

//
// Get authorization url and redirect to it.
//



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

expApp.get('/oauth2/auth', function(req, res) {
	const oauth2 = new jsforce.OAuth2({
		clientId: process.env.SALESFORCE_CONSUMER_KEY,
		clientSecret: process.env.SALESFORCE_CONSUMER_SECRET,
		redirectUri: 'https://sfdcadminbot.herokuapp.com/getAccessToken'
	});
	res.redirect(oauth2.getAuthorizationUrl({}));
});

//
// Pass received authorization code and get access token
//
expApp.get('/getAccessToken', function(req,resp) {
	console.log('should be here ');
	const oauth2 = new jsforce.OAuth2({
		clientId: process.env.SALESFORCE_CONSUMER_KEY,
		clientSecret: process.env.SALESFORCE_CONSUMER_SECRET,
		redirectUri: 'https://sfdcadminbot.herokuapp.com/getAccessToken'
	});

	const conn = new jsforce.Connection({ oauth2 : oauth2 });
		console.log('req query code '+req.query.code);
		conn.authorize(req.query.code, function(err, userInfo) {
		if (err) {
            console.log('Error happened at authorization-->',err);
			return resp.send(err.message);
		}
		const conn2 = new jsforce.Connection({
			instanceUrl : conn.instanceUrl,
			accessToken : conn.accessToken
		});
		conn2.identity(function(err, res) {
		if (err) { 
            console.log('Error happened at identity-->',err);
            return resp.send(err.message); 
        }
		  console.log("user ID: " + res.user_id);
		  console.log("organization ID: " + res.organization_id);
		  console.log("username: " + res.username);
		  console.log("display name: " + res.display_name);
		  options = { Authorization: 'Bearer '+conn.accessToken};
		  resp.redirect(`https://oauth-redirect.googleusercontent.com/r/salesforcebot-qjksum?code=${req.query.code}&state=true`);
		});
	});
	
});


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
		console.log('this is the access token before calling rest service: '+options);
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
	
	console.log('Request came for account link flow start');	
    	if(!conv.user.accessToken){
      		conv.ask(new SignIn());
    	}
    	else{
        	conv.ask('You are already signed in ');
    	}
	

	
	/*conv.ask(new SimpleResponse({
		speech:'Hi, how is it going? You are being guided to the login page',
		text:'Hi, how is it going? You are being guided to the login page',
	}));*/
});

app.intent('Get SignIn Info', (conv, params, signin) => {    
	console.log('Sign in info Intent');    
	console.log('Sign in content-->',signin);       
	if (signin.status === 'OK') {         
		const access = conv.user.access.token   
		options = { Authorization: 'Bearer '+access};
		console.log('access token: ' + access);
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
