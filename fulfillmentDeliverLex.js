const AWS = require('aws-sdk');
const https = require('https');
const querystring = require('querystring');
const s3 = new AWS.S3();
let job;
let tokenAccess;


function attachmentsHelper(){
    params='path=enc:'+job.waypoints+'&size=600x400'+'&markers=color:green|label:A|'+job.start_point[0]+','+job.start_point[1]+'&markers=color:red|label:B|'+
            job.end_point[0]+','+job.end_point[1];
    imageStaticMap="https://maps.googleapis.com/maps/api/staticmap?"+params;
    return JSON.stringify([{ "color": "#2D9EB2", "attachment_type": "default",
        "fields": [{"title":"Shipping Cost","value":"$"+job.cost,"short":true}],
        "image_url":imageStaticMap
    }]);
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

function sendDetailOrder(){
    
    paramsToSlack={token:tokenAccess,channel:job.channel,text:'Thank you, <@'+job.userId+'>! \nYour order has been placed successfully',
        attachments:attachmentsHelper()};
    connectSlackApi(paramsToSlack,(response)=>{
        res=JSON.parse(response.body);
    });
}

exports.handler = (event, context, callback) => {
    console.log(event);
    readDDB("Jobs","id = :id",{":id":event.sessionAttributes.JobsId},(err,data)=>{
        if(err) console.log("errJobsRead",JSON.stringify(err, null, 2));
        job=data.Items[0];
        readDDB("Team","team_id = :teamId",{":teamId":job.teamId},(errTeam,dataTeam)=>{
            if(errTeam) console.log("errTeam",JSON.stringify(errTeam, null, 2));
            tokenAccess=dataTeam.Items[0].bot.bot_access_token;
            sendDetailOrder();
        });
    });
};