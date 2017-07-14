const AWS = require('aws-sdk');
const botAlias='prod';
const botName='logibot';
const lexruntime = new AWS.LexRuntime({apiVersion: '2016-11-28'});
const https = require('https');
const querystring = require('querystring');
const crypto = require('crypto');
const encrypted = process.env.token;
const googleKeyEnc = process.env.googleKey;
const hostname='slack.com';
const hostGoogleMap = 'maps.googleapis.com';
const logibotHost = 'https://d29k6spz7jvo9f.cloudfront.net';
const slackGetProfilePath='/api/users.profile.get?';
const slackPostMessage='/api/chat.postMessage?';
let decrypted;
let googleKeyDec;
let tokenAccess;
let firstname;
let teamId;
let botUserId;
let mentionBot;
let response;



function attachmentConfirmCity(text){
    return JSON.stringify([{"pretext": text, "fallback": "", "callback_id": "confirmCity", "color": "#2D9EB2", "attachment_type": "default", "actions": [{"name": "yes", "text": "Yes, correct", "type": "button", "value": "yes", "style":"primary"}, {"name": "no", "text": "No, Let me correct it!", "type": "button", "value": "no"} ] }]);
}

function attachmentPaymentType(text){
    return JSON.stringify([{"pretext": text, "fallback": "", "callback_id": "paymentType", "color": "#2D9EB2", "attachment_type": "default", "actions": [{"name": "Cash", "text": "Cash", "type": "button", "value": "Cash"},{"name": "Debit Card", "text": "Debit Card", "type": "button", "value": "Debit Card"},{"name": "Credit Card", "text": "Credit Card", "type": "button", "value": "Credit Card"} ] }]);
}

function attachmentVehicleType(){
    return JSON.stringify([{"title": "Motorcycle","callback_id": "VehicleType", "color":"#FFC500", "fields": [{"title":"Less than 10KM","value":"Cost is $2","short":true},{"title":"More than 10KM","value":"Cost is $0.2/KM","short":true},{"title": "Dimension", "value": "70cm x 70cm x 70cm", "short": true },{"title": "Max Weight", "value": "20Kg", "short": true } ], "actions": [{"name": "motorcycle","text": "Choose Motorcyle", "style": "primary", "type": "button", "value": "motorcycle"} ], "thumb_url": logibotHost+"/assets/img/pickup-motorcycle.png"},
    {"title": "Pickup Truck","callback_id": "VehicleType", "color":"#8063D5", "fields": [{"title":"Less than 10KM","value":"Cost is $5","short":true},{"title":"More than 10KM","value":"Cost is $0.5/KM","short":true},{"title": "Dimension", "value": "200cm x 130cm x 120cm", "short": true }, {"title": "Max Weight", "value": "80Kg", "short": true } ], "actions": [{"name": "pickup", "text": "Choose Pickup Truck", "style": "primary", "type": "button", "value": "pickup truck"} ], "thumb_url": logibotHost+"/assets/img/pickup-truck.png"},
    {"title": "Box Truck", "callback_id": "VehicleType", "color":"#2A0077", "fields": [{"title":"Less than 10KM","value":"Cost is $8","short":true},{"title":"More than 10KM","value":"Cost is $0.8/KM","short":true},{"title": "Dimension", "value": "200cm x 130cm x 120cm", "short": true }, {"title": "Max Weight", "value": "160Kg", "short": true } ], "actions": [{"name": "box", "text": "Choose Box Truck", "style": "primary", "type": "button", "value": "box truck"} ], "thumb_url": logibotHost+"/assets/img/pickup-box.png"}]);
}

function attachRouteUrlCost(key){
    return JSON.stringify([{ "color": "#2D9EB2","title":"Please route me your customer location here","title_link":logibotHost+"/index.html?key="+key,"author_name":"Logibot Route Helper" }]);
}

function confirmCity(event){
    let actionButtonText,color;
    if(event.actions[0].value=="yes"){color="#5B25FF";actionButtonText="Yes, correct";} 
    else {actionButtonText="No, Let me correct it!";color="#FFC100";}
    return {
        attachments:[{"pretext": event.original_message.attachments[0].pretext, "footer": "by @"+event.user.name, "callback_id": "confirmCity", "color": color, "attachment_type": "default", "text": actionButtonText }]
    }
}

function VehicleType(event){
    console.log("attachement",event.original_message.attachments);
    const choose=event.actions[0].value;
    let attachment;
    switch (choose){
        case "motorcycle":
            attachment=event.original_message.attachments[0];
            break;
        case "pickup truck":
            attachment=event.original_message.attachments[1];
            break;
        case "box truck":
            attachment=event.original_message.attachments[2];
            break;
    }
    attachment=Object.assign(attachment,{actions:"","footer": "choosed by @"+event.user.name});
    return {
        text:event.original_message.text,
        attachments:[attachment]
    }
}

function paymentType(event){
    let choose=event.actions[0].value;
    let attachment=event.original_message.attachments[0];
    if(choose!="Cash") choose+=" - Our Courier will bring EDC machine for you";
    attachment=Object.assign(attachment,{text:choose,actions:"","footer": "choosed by @"+event.user.name});
    return {
        text:event.original_message.text,
        attachments:[attachment]
    }
}


function connectSlackApi(method,params,pathUrl, callback) {
    const options={};
    options.method=method;
    options.hostname=hostname;
    options.port=443;
    options.path=pathUrl+querystring.stringify(params);
    if(method=='POST') options.headers= {
           "Content-Type": "application/x-www-form-urlencoded"
        };
        
    const postReq = https.request(options, (res) => {
       const chunks = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            if (callback) {
                callback({
                    body: chunks.join(''),
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            }
        });
        return res;
    });
    postReq.end();
}
function connectHttps(method,params,hostname,pathUrl, callback) {
    const options={};
    options.method=method;
    options.hostname=hostname;
    options.path=pathUrl+querystring.stringify(params);
    if(method=='POST') options.headers= {
           "Content-Type": "application/x-www-form-urlencoded"
        };
        
    const postReq = https.request(options, (res) => {
       const chunks = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            if (callback) {
                callback({
                    body: chunks.join(''),
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                });
            }
        });
        return res;
    });
    postReq.end();
}

function postTextLex(userId,session,inputText,callback){
    const params = {
      botAlias: botAlias,
      botName: botName, 
      userId: userId, 
      inputText:inputText,
      sessionAttributes: session
    };
    lexruntime.postText(params, function(err, data) {
      callback(err, data);
    });
}

function getUser(userId,callback){
    readDDB("User","user_id = :userId and team_id = :teamId",{":userId":userId,":teamId":teamId},(err,data)=>{
        if (err) {
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
            callback(err);
        } else {
            if(data.Count>0){
                firstname=data.Items[0].first_name;
                callback(false);
            } else {
                params={token:tokenAccess.app,user:userId};
                connectSlackApi('GET',params,slackGetProfilePath,(response)=>{
                    res=JSON.parse(response.body);
                    profile=res.profile;
                    if(res.profile.email && res.profile.email!='' && res.profile.email!=null) email = res.profile.email;
                    else email = '-';
                    data={user_id:userId,team_id:teamId,first_name:profile.first_name,last_name:(profile.last_name!='')?profile.last_name:'-',real_name:profile.real_name,email:email};
                    console.log("dataUser",data);
                    putDDB('User',data,(err,data)=>{
                        if(err) console.log("Unable to putDDB User. Error:", JSON.stringify(err, null, 2));
                        firstname=res.profile.first_name;
                        callback(false);
                    });
                });
            }
            
        }
    });
}

function putDDB(table,data,callback){
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName:table,
        Item:data
    };
    docClient.put(params, (err, data)=> {
        callback(err,data);
    });
}

function readDDB(table,query,value,callback){
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName : table,
        KeyConditionExpression: query,
        ExpressionAttributeValues: value
    };
    docClient.query(params, (err, data) =>{
        callback(err,data);
    });
}

function updateDDB(table,key,updateExpression,expressionAttributeValues,callback){
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName:table,
        Key:key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues:expressionAttributeValues,
        ReturnValues:"UPDATED_NEW"
    };
    docClient.update(params, function(err, data) {
        callback(err, data);
    });
}

function readSessionLexDDB(team_channel,callback){
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName : 'SessionLex',
        KeyConditionExpression:"team_channel = :team_channel",
        FilterExpression:"active = :active",
        ExpressionAttributeValues: {":team_channel":team_channel,":active":true},
        Limit: 10,
        ScanIndexForward: false,
    };
    docClient.query(params, (err, data) =>{
        callback(err,data);
    });
}

function getEstimatedCostDistance(slots,callback){
    params={units:"meter",origins:slots.pickupCityAddress,destinations:slots.deliverCityAddress,key:googleKeyDec};
    connectHttps('GET',params,hostGoogleMap,"/maps/api/distancematrix/json?",(response)=>{
        res=JSON.parse(response.body);
        console.log(res.rows[0]["elements"]);
        const distance=res.rows[0]["elements"][0]["distance"]["value"]/1000;
        if(slots.vehicleType=='motorcycle') {cost=(distance*0.2).toFixed(2); min=2}
        else if(slots.vehicleType=='pickup truck') {cost=(distance*0.5).toFixed(2);min=5;}
        else if(slots.vehicleType=='box truck') {cost=(distance*0.8).toFixed(2);min=8;}
        if(cost<=min) cost=min;
        callback("*$"+cost+"* ("+res.rows[0]["elements"][0]["distance"]["text"]+")");
    });
}

function readDDBResponseAction(team_channel,responseTs,callback){
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName : 'SessionLex',
        KeyConditionExpression:"team_channel = :team_channel",
        FilterExpression:"responseAction = :responseAction and responseTs = :responseTs ",
        ExpressionAttributeValues: {":team_channel":team_channel,":responseAction":true,":responseTs":responseTs},
        Limit: 10,
        ScanIndexForward: false,
    };
    docClient.query(params, (err, data) =>{
        callback(err,data);
    });
}

function recognizeText(event,callback){
    const sessionId=teamId+event.channel+event.event_ts;
    console.log(sessionId);
    const inputTextSanit=event.text.replace(mentionBot,"");
    postTextLex(sessionId,{id:sessionId,type:"initial",teamChannel:teamId+event.channel,teamId:teamId,channelId:event.channel,user:firstname},inputTextSanit, (err, data)=> {
        console.log(data);
        if (err) {
            console.log("error PostLex", err.stack);
            return callback(false,false,data);
        } else{
            if(data.intentName===null) {
                const teamChannel=teamId+event.channel;
                readSessionLexDDB(teamChannel,(err,sessionLex)=>{
                    console.log(sessionLex);
                    if(sessionLex.Count>0){
                        console.log("lexS");
                        qSession=sessionLex.Items[0];
                        if(!qSession.responseAction) postTextLex(qSession.sessionId,{id:qSession.sessionId,teamId:teamId,channelId:event.channel,
                        user:firstname,type:"codeHook",ts:String(qSession.event_ts),teamChannel:teamChannel,slots:JSON.stringify(qSession.slots)},inputTextSanit, (err, dataLex)=> {
                            if(err) console.log("dataLex",err);
                            console.log(dataLex);
                            if(dataLex.dialogState=='ReadyForFulfillment' || dataLex.dialogState=='Failed' || dataLex.dialogState=='Fulfilled') {
                                updateDDB('SessionLex',{team_channel:teamChannel,event_ts:Number(dataLex.sessionAttributes.ts)},
                                "set active = :active, slots = :slots",{":active":false,":slots":dataLex.slots},(err,data)=>{
                                    if(err) console.log(err);
                                });
                            }
                            else return callback(true,true,dataLex);
                        });
                    } else {
                        return callback(true,false,data); 
                    }
                });
            } else if(data.intentName=='salutation' || data.intentName=='no' || data.intentName=='thank' || data.intentName=='yes'){
                return callback(true,false,data);
            } else {
                //create session baru
                return callback(true,true,data);
            }
        }
    });
}

function responseActionButton(event,callback){
    getUser(event.user.id,(err)=>{
        const teamChannel=teamId+event.channel.id;
        const channelId = event.channel.id;
        readDDBResponseAction(teamChannel,Number(event.original_message.ts),(err,data)=>{
            console.log("dataCI",data.Items[0]);
            qSession=data.Items[0];
            postTextLex(qSession.sessionId,{id:qSession.sessionId,user:firstname,type:"codeHook",ts:String(qSession.event_ts),teamChannel:teamChannel,teamId:teamId,channelId:channelId,slots:JSON.stringify(qSession.slots)},event.actions[0].value, (err, dataLex)=> {
                if(err) console.log("dataLex",err);
                console.log(dataLex);
                let LexSessRes=dataLex.sessionAttributes;
                paramsToSlack={token:tokenAccess.bot,channel:channelId,text:dataLex.message};
                Slots=dataLex.slots;
                responseAction=false;
                if(dataLex.slotToElicit=="addressRoute"){
                    getEstimatedCostDistance(Slots,(result)=>{
                        const jobId = crypto.createHash('sha256').update(LexSessRes.id).digest('hex');
                        data={
                            id:jobId.toUpperCase(),
                            sessionId:LexSessRes.id,
                            status:"getRoute",
                            slots: Slots,
                            name:LexSessRes.user,
                            teamId:teamId,
                            channel:event.channel.id,
                            userId:event.user.id
                        };
                        console.log("data",data);
                        putDDB('Jobs',data,(err,data)=>{
                            if(err) console.log("jobs insert error",err);
                        });
                        paramsToSlack={token:tokenAccess.bot,channel:channelId,text:dataLex.message+".\n"+"Your estimation cost is "+result,
                                attachments:attachRouteUrlCost(jobId.toUpperCase())};
                        connectSlackApi('POST',paramsToSlack,slackPostMessage,(response)=>{
                            res=JSON.parse(response.body);
                            if(LexSessRes.ts!=undefined) eventTs=Number(LexSessRes.ts);
                            else eventTs=Number(res.ts);
                            data={
                                team_channel:teamId+res.channel,
                                event_ts:eventTs,
                                active:false,
                                slots:Slots,
                                intenName:dataLex.intentName,
                                sessionId:LexSessRes.id,
                                lastUser:LexSessRes.user,
                                responseAction:responseAction,
                                responseTs:Number(res.ts)
                            };
                            putDDB('SessionLex',data,(err,data)=>{
                                console.log(err);
                                return callback(true);
                            });
                        });
                    });
                } else {
                    if(dataLex.slotToElicit=="vehicleType"){
                        attachKey={attachments:attachmentVehicleType(),text:dataLex.message};
                        paramsToSlack=Object.assign(paramsToSlack,attachKey);
                        responseAction=true;
                    }
                    if(dataLex.slotToElicit=="pickupCityAddress" || dataLex.slotToElicit=="deliverCityAddress"){
                        paramsToSlack=Object.assign(paramsToSlack,{text:dataLex.message+"\n_(Can be village, subdistrict, or city)_"});
                    }
                    if(dataLex.slotToElicit=="paymentType"){
                        attachKey={attachments:attachmentPaymentType(),text:dataLex.message};
                        paramsToSlack=Object.assign(paramsToSlack,attachKey);
                        responseAction=true;
                    }
                    connectSlackApi('POST',paramsToSlack,slackPostMessage,(response)=>{
                        res=JSON.parse(response.body);
                        if(LexSessRes.ts!=undefined) eventTs=Number(LexSessRes.ts);
                        else eventTs=Number(res.ts);
                        data={
                            team_channel:teamId+res.channel,
                            event_ts:eventTs,
                            active:true,
                            slots:Slots,
                            intenName:dataLex.intentName,
                            sessionId:LexSessRes.id,
                            lastUser:LexSessRes.user,
                            responseAction:responseAction,
                            responseTs:Number(res.ts)
                        };
                        putDDB('SessionLex',data,(err,data)=>{
                            console.log(err);
                            return callback(true);
                        });
                    });
                    
                }
            });
        });
    });
}

function responseMsg(event,callback){
    getUser(event.event.user,(err)=>{
        recognizeText(event.event,(err,createSession,resLex)=>{
            let LexSessRes=resLex.sessionAttributes;
            let responseAction=false;
            paramsToSlack={token:tokenAccess.bot,channel:event.event.channel,text:resLex.message};
            Slots=resLex.slots;
            if(resLex.dialogState=="ConfirmIntent") {
                Slots=JSON.parse(LexSessRes.slots);
                attachKey={attachments:attachmentConfirmCity(resLex.message),text:""};
                paramsToSlack=Object.assign(paramsToSlack,attachKey);
                responseAction=true;
            } else if(resLex.dialogState=="ElicitSlot"){
                if(resLex.slotToElicit=="vehicleType"){
                    attachKey={attachments:attachmentVehicleType(),text:resLex.message};
                    paramsToSlack=Object.assign(paramsToSlack,attachKey);
                    responseAction=true;
                }
                if(resLex.slotToElicit=="pickupCityAddress"){
                    paramsToSlack=Object.assign(paramsToSlack,{text:resLex.message+"\n_(Can be village, subdistrict, or city)_"});
                }
                if(resLex.slotToElicit=="deliverCityAddress"){
                    paramsToSlack=Object.assign(paramsToSlack,{text:resLex.message+"\n_(Can be village, subdistrict, or city)_"});
                }
                if(resLex.slotToElicit=="paymentType"){
                    attachKey={attachments:attachmentPaymentType(),text:resLex.message};
                    paramsToSlack=Object.assign(paramsToSlack,attachKey);
                    responseAction=true;
                }
            }
            connectSlackApi('POST',paramsToSlack,slackPostMessage,(response)=>{
                res=JSON.parse(response.body);
                if(createSession){
                    console.log("ts", LexSessRes.ts);
                    console.log("res", res);
                    if(LexSessRes.ts!=undefined) eventTs=Number(LexSessRes.ts);
                    else eventTs=Number(res.ts);
                    data={
                        team_channel:teamId+res.channel,
                        event_ts:eventTs,
                        active:true,
                        slots:Slots,
                        intenName:resLex.intentName,
                        sessionId:LexSessRes.id,
                        lastUser:LexSessRes.user,
                        responseAction:responseAction,
                        responseTs:Number(res.ts)
                    };
                    putDDB('SessionLex',data,(err,data)=>{
                        console.log("putDDB SessionLex",err);
                        return callback(true);
                    });
                }
            });
        });
    });
}

function getTokenAccess(event,callback){
    readDDB("Team","team_id = :teamId",{":teamId":teamId},(err,data)=>{
        if (err) {
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            tokenAccess={bot:data.Items[0].bot.bot_access_token,app:data.Items[0].access_token};
            botUserId=data.Items[0].bot.bot_user_id;
            mentionBot="<@"+botUserId+">";
            if(event.callback_id){
                responseActionButton(event,result=>{
                    callback(true);
                });
            } else if(event.event.type=="message" && event.event.username!='logibot' 
                && event.event.subtype!='bot_message' && event.event.subtype!='message_changed'
                && event.event.subtype!='group_join' && event.event.subtype!='channel_join'
                && event.event.subtype!='pinned_item' && event.event.subtype!='member_joined_channel'){
                    responseMsg(event,result=>{
                        callback(true);
                    });
            } else {
                callback(true);
            }
        }
    });
}

function processEvent(event, context, callback) {
    if(event.token==decrypted){
        if(event.team) teamId=event.team.id;
        else teamId=event.team_id;
        getTokenAccess(event,result=>{
            if(event.actions){
                if(event.callback_id=="confirmCity") response=confirmCity(event);
                if(event.callback_id=="VehicleType") response=VehicleType(event);
                if(event.callback_id=="paymentType") response=paymentType(event);
            } else response={challenge:event.challenge};
            return callback(null, response);
        });
    } else return callback(null, 'unknown');
}

exports.handler = (event, context, callback) => {
    if(event.urlencoded) {
        const urlencode=querystring.parse(event.urlencoded);
        event=JSON.parse(urlencode.payload);
    }
    console.log(event);
    if (decrypted) {
        processEvent(event, context, callback);
    } else {
        // Decrypt code should run once and variables stored outside of the function
        // handler so that these are decrypted once per container
        const kms = new AWS.KMS();
        kms.decrypt({ CiphertextBlob: new Buffer(encrypted, 'base64') }, (err, data) => {
            if (err) {
                console.log('Decrypt error:', err);
                return callback(err);
            }
            kms.decrypt({ CiphertextBlob: new Buffer(googleKeyEnc, 'base64') }, (err2, data2) => {
                decrypted = data.Plaintext.toString('ascii');
                googleKeyDec = data2.Plaintext.toString('ascii');
                processEvent(event, context, callback);
            });
        });
    }
};