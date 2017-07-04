const AWS = require('aws-sdk');

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
            } else {
                callback(null,{result:"found",data:data.Items[0]});
            }
        }
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