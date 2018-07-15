const AWS = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');
const encrypted = process.env.zendesk;
const zendeskHost = 'logibot.zendesk.com';
const zendeskPathShowTicket = '/api/v2/tickets/';
let zendeskToken;


function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
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

function getOrderZendesk(id,callback){
    connectHttps(zendeskHost,'GET',zendeskPathShowTicket+id+'.json',{},res=>{
        res=JSON.parse(res.body);
        callback(res);
    });
}

function processEvent(event,context,callback){
    
    const source = event.invocationSource;
    const outputSessionAttributes = event.sessionAttributes || {};
    const Slots=event.currentIntent.slots;
    if (source === 'DialogCodeHook' && event.currentIntent.slots.trackingOrderId!==null) {
        getOrderZendesk(event.currentIntent.slots.trackingOrderId,resZendesk=>{
            if(resZendesk.error){
                return callback(null,elicitSlot(outputSessionAttributes,event.currentIntent.name,
                    Slots,"trackingOrderId",{contentType:"PlainText",
                    content:`Sorry ${outputSessionAttributes.user}, seems like tracking order ID \`${event.currentIntent.slots.trackingOrderId}\` is not exist.\n_Please try the another one_` }));
            }
            else { 
                console.log("res",delegate(outputSessionAttributes,event.currentIntent.slots));
                return callback(null,delegate(outputSessionAttributes,event.currentIntent.slots));
            }
        });
    } else return callback(null,delegate(outputSessionAttributes,event.currentIntent.slots));
    
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