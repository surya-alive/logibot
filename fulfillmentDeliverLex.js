const AWS = require('aws-sdk');
const s3Bucket = new AWS.S3( { params: {Bucket: 'logibot'} } );
const https = require('https');
const querystring = require('querystring');
const encrypted = process.env.zendesk;
const zendeskHost = 'logibot.zendesk.com';
const logibotHost = 'https://d29k6spz7jvo9f.cloudfront.net';
let zendeskToken;

let job;
let tokenAccess;
let imageStaticMap;


function attachmentsHelper(){
    return JSON.stringify([{ "color": "#2D9EB2", "attachment_type": "default",
        "fields": [{"title":"Shipping Cost","value":"$"+job.cost,"short":true},
        {"title":"Distance","value":job.distance+" km","short":true},
        {"title":"Carried by","value":job.slots.vehicleType.toUpperCase(),"short":true},
        {"title":"Payment Type","value":job.slots.paymentType,"short":true},
        {"title":"Pickup Address","value":job.start_address},
        {"title":"Delivery Address","value":job.end_address},
        ],
        "image_url":logibotHost+`/map-static/${job.key}/route-map.png`
    }]);
}

function connectImageMap(params, callback) {
    const options={};
    options.method='GET';
    options.hostname='maps.googleapis.com';
    options.port=443;
    options.headers={"Content-Type":"text/html,application/xhtml+xml"};
    options.path='/maps/api/staticmap?'+params;
        
    const postReq = https.request(options, (res) => {
       const data = [];

        res.on('data', (chunk)=> {
            data.push(chunk);
        }).on('end', ()=> {
            const buffer = Buffer.concat(data);
            if (callback) {
                callback({
                    content: buffer
                });
            }
        });
    });
    postReq.end();
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

function connectSlackApi(params, callback) {
    const options={};
    options.method='POST';
    options.hostname='slack.com';
    options.port=443;
    options.path='/api/chat.postMessage?'+querystring.stringify(params);
    options.headers= {
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

function connectZendesk(data, callback) {
    const options={};
    options.method="POST";
    options.hostname=zendeskHost;
    options.path='/api/v2/tickets.json';
    options.headers= {
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
    postReq.write(data);
    postReq.end();
}

function sendDetailOrder(ticketId){
    paramsToSlack={token:tokenAccess,channel:job.channel,text:'Thank you, <@'+job.userId+'>! The order has been placed successfully\nYour tracking order ID is `'+ticketId+'`',
        attachments:attachmentsHelper()};
    connectSlackApi(paramsToSlack,(response)=>{
        res=JSON.parse(response.body);
    });
}

function processEvent(event,context,callback){
    readDDB("Jobs","id = :id",{":id":event.sessionAttributes.JobsId},(err,data)=>{
        if(err) console.log("errJobsRead",JSON.stringify(err, null, 2));
        job=data.Items[0];
        readDDB("Team","team_id = :teamId",{":teamId":job.teamId},(errTeam,dataTeam)=>{
            if(errTeam) console.log("errTeam",JSON.stringify(errTeam, null, 2));
            tokenAccess=dataTeam.Items[0].bot.bot_access_token;
            ticket={
                ticket:{
                    subject:"Placed Order from Slack"+` [${dataTeam.Items[0].team_name}, ${job.name}]`,
                    description:"Pickup Address: "+job.start_address+"\nDelivery Address: "+job.end_address,
                    type:"task",
                    tags:["sales"],
                    custom_fields:[{id:114095637393,value:job.name},{id:114095591334,value:job.cost},{id:114095643114,value:job.distance},
                        {id:114095651314,value:job.slots.paymentType},{id:114095637553,value:job.slots.vehicleType},
                        {id:114095644734,value:job.start_point},{id:114095638933,value:job.end_point}
                    ]
                }
            }
            connectZendesk(JSON.stringify(ticket),res=>{
                res=JSON.parse(res.body);
                params='path=enc:'+job.waypoints+'&size=800x600'+'&markers=color:green|label:A|'+job.start_point[0]+','+job.start_point[1]+'&markers=color:red|label:B|'+
                    job.end_point[0]+','+job.end_point[1];
                connectImageMap(params,body=>{
                    data = {Key: `map-static/${job.key}/route-map.png`, Body: body.content, ContentEncoding: 'base64',ContentType: 'image/png',ACL:'public-read'};
                    s3Bucket.putObject(data, function(err, data){
                        sendDetailOrder(res.ticket.id);
                    });
                });
            });
        });
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