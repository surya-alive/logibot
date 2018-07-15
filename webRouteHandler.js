const AWS = require('aws-sdk');
const botAlias='prod';
const botName='logibot';
const lexruntime = new AWS.LexRuntime({apiVersion: '2016-11-28'});
exports.handler = (event, context, callback) => {
    // TODO implement
    console.log(event);
    if(!event.key) callback(null, "unknown");
    else processEvent(event, context, callback);
};

function processEvent(event, context, callback) {
    readDDB("Jobs","id = :id",{":id":event.key},(err,data)=>{
        if (err) {
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
            callback(err);
        } else {
            if(data.Count==0){
                callback(null,{result:"notfound"});
            }else if(event.type=="post"){
                postEvent(event,data.Items[0],callback)
            } else {
                if(data.Items[0].status=="getRoute") callback(null,{result:"found",data:data.Items[0]});
                callback(null,{result:"done"});
            }
        }
    });

}
function postEvent(event,data,callback){
    data=Object.assign(event,{name:data.name,slots:data.slots,sessionId:data.sessionId,id:data.id,
        channel:data.channel,teamId:data.teamId,userId:data.userId});
    putDDB('Jobs',data,(errJobs,dataJobs)=>{
        console.log(errJobs);
        const params = {
          botAlias: botAlias,
          botName: botName, 
          userId: data.sessionId, 
          inputText:'done',
          sessionAttributes: {JobsId:data.id}
        };
        lexruntime.postText(params, function(errLex, dataLex) {
          console.log("errLex",errLex);
          console.log("dataLex",dataLex);
        });
        
        callback(null,{status:"done"});
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