const AWS = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');
const encrypted = process.env.zendesk;
const zendeskHost = 'logibot.zendesk.com';
const slackHost = 'slack.com';
const zendeskPathShowTicket = '/api/v2/tickets/';
const slackPostMessage='/api/chat.postMessage?';
let zendeskToken;
let tokenAccess;

function close(sessionAttributes, fulfillmentState,message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message
        },
    };
}


function attachOrderStatus(comments){
    data=[];
    i=0;
    comments.forEach(comment=>{
        ts=new Date(comment.created_at);
        color="#2D9EB2";
        if(i==0) color="#5B25FF";
        data.push({text:comment.plain_body,color:color,ts:ts.getTime()/1000});
        i++;
    });
    return JSON.stringify(data);
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

function connectHttps(hostname,method,pathUrl,params, callback) {
    const options={};
    options.method=method;
    options.hostname=hostname;
    options.path=pathUrl+querystring.stringify(params);
    if(method=='POST') options.headers= {
           "Content-Type": "application/x-www-form-urlencoded"
        };
    else options.headers= {
        "Content-Type": "application/json",
        "Authorization":"Basic "+zendeskToken
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



function processEvent(event,context,callback){
    readDDB("Team","team_id = :teamId",{":teamId":event.sessionAttributes.teamId},(errTeam,dataTeam)=>{
        if(errTeam) console.log("errTeam",JSON.stringify(errTeam, null, 2));
        tokenAccess=dataTeam.Items[0].bot.bot_access_token;
        getOrderZendesk(event.currentIntent.slots.trackingOrderId,res=>{
            console.log(res);
            if(res.error){
                console.log("zendeskErrResponse",res.error);
            }
            else {
                attach=attachOrderStatus(res.comments);
                console.log("attach",attach);
                params={
                    token:tokenAccess,channel:event.sessionAttributes.channelId,
                    text:"These below are records updated status for tracking order ID `"+event.currentIntent.slots.trackingOrderId+"`:",
                    attachments:attachOrderStatus(res.comments)
                }
                connectHttps(slackHost,'POST',slackPostMessage,params,resSlack=>{
                    callback(null,close(event.sessionAttributes,'Fulfilled',{contentType:"PlainText",content:"Okay"}));
                });
            }
            
            
        });
    });
}

function getOrderZendesk(id,callback){
    connectHttps(zendeskHost,'GET',zendeskPathShowTicket+id+'/comments.json',{},res=>{
        res=JSON.parse(res.body);
        callback(res);
    });
}
exports.handler = (event, context, callback) => {
    console.log(event);
    if (zendeskToken) {
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
            zendeskToken = data.Plaintext.toString('ascii');
            processEvent(event, context, callback);
        });
    }
};