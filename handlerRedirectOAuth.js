const AWS = require('aws-sdk');
const url = require('url');
const https = require('https');
const querystring = require('querystring');

const clientId = process.env.CLIENT_ID;
const encrypted = process.env.SECRET;
const hostname = 'slack.com';
const pathUrl = '/api/oauth.access?';
let secret;

function processEvent(event, context, callback) {
    if(event.params.querystring.hasOwnProperty('code')){
        credential={
            client_id:clientId,
            client_secret:secret,
            code:event.params.querystring.code
        };
        getOauthAccess(credential,(response)=>{
            res=JSON.parse(response.body);
            if(res.ok){
                var docClient = new AWS.DynamoDB.DocumentClient()
                var table = "Team";
                var params = {
                    TableName:table,
                    Item:res
                };
                docClient.put(params, function(err, data) {
                    if (err) {
                        callback( null,'Something went wrong!');
                        console.log(err);
                    } else {
                        callback( null,'Thank You, you have successfully installed logibot (:');
                    }
                });
            } else {
                callback( null,'Something went wrong!');
            }
        });
    }
    
}

function getTokenFromClient(code){
    console.log(code);
}

function getOauthAccess(credential, callback) {
    const options={
        method:'GET',
        hostname:hostname,
        port: 443,
        path:pathUrl+querystring.stringify(credential)
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

exports.handler = (event, context, callback) => {
    if (secret) {
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
            secret = data.Plaintext.toString('ascii');
            processEvent(event, context, callback);
        });
    }
};