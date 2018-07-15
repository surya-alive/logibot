const https = require('https');
const querystring = require('querystring');
const hostGoogleMap = 'maps.googleapis.com';
const pathGoogleMap = '/maps/api/geocode/json?';
let cityGoogleResult;

// Helpers
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

function confirmIntent(sessionAttributes, intentName, slots, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ConfirmIntent',
            intentName,
            slots,
            message
        },
    };
}

function close(sessionAttributes, fulfillmentState, message, responseCard) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
            responseCard,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
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

function compareSlots(prevSlots,currSlots){
    let diffSlot="";
   for(let slot in prevSlots){
        if(prevSlots[slot]!==currSlots[slot]) {
            diffSlot = slot;
            continue;
        }
   }
   return diffSlot;
}

function validateSlotCityAddress(slot,value,callback){
        params={address:value};
        connectHttps('GET',params,hostGoogleMap,pathGoogleMap,(response)=>{
            res=JSON.parse(response.body);
            if(res.status=="OK") {
                cityGoogleResult=res.results[0].address_components[0].long_name;
                console.log("userInput",value.toUpperCase());
                console.log("google",cityGoogleResult.toUpperCase());
                if(cityGoogleResult.toUpperCase()==value.toUpperCase()) {
                    callback("yes");
                    console.log('dsameSlotvalue');
                }
                else {
                    callback("confirm"); console.log('diffSlotvalue');
                }
            } else {
                callback("notfound");
                console.log('notFound');
            }
        });
    
    callback(true,false);
}

function dispatch(intentRequest,callback){
    const source = intentRequest.invocationSource;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    const currentSlot=intentRequest.currentIntent.slots;
    if (source === 'DialogCodeHook') {
        if(outputSessionAttributes.type=='codeHook'){
            const slot=compareSlots(JSON.parse(outputSessionAttributes.slots),intentRequest.currentIntent.slots);
            if(intentRequest.currentIntent.confirmationStatus=="Confirmed") {
                outputSessionAttributes.slots=JSON.stringify(currentSlot);
                return callback(delegate(outputSessionAttributes,intentRequest.currentIntent.slots));
            }
            if(intentRequest.currentIntent.confirmationStatus=="Denied"){
                let SessSlot=JSON.parse(outputSessionAttributes.slots);
                SessSlot[slot]=null;
                outputSessionAttributes.slots=JSON.stringify(SessSlot);
                return callback(elicitSlot(outputSessionAttributes,intentRequest.currentIntent.name,
                    currentSlot,slot,{contentType:"PlainText",content:"Where is it?" }));
            }
            if(slot=="pickupCityAddress" || slot=="deliverCityAddress"){
                valueSlot=intentRequest.currentIntent.slots[slot];
                validateSlotCityAddress(slot,valueSlot,(validate)=>{
                    if(validate=="yes") {
                        return callback(delegate(outputSessionAttributes,intentRequest.currentIntent.slots));
                    } else if(validate=="confirm"){
                        currentSlot[slot]=cityGoogleResult;
                        return callback(confirmIntent(outputSessionAttributes,intentRequest.currentIntent.name,
                            currentSlot,{contentType:"PlainText",content:`Did you mean ${cityGoogleResult}?` }));
                    }
                    else if(validate=="notfound"){
                        console.log("rst elicitSlot");
                        return callback(elicitSlot(outputSessionAttributes,intentRequest.currentIntent.name,
                            currentSlot,slot,{contentType:"PlainText",content:`Sorry, We couldn't find ${valueSlot}, please try another one?` }));
                    }
                });
            }
            // using `else` so that this callback not running while waiting promise above statement
            else callback(delegate(outputSessionAttributes,intentRequest.currentIntent.slots));
            
        } else return callback(delegate(outputSessionAttributes,intentRequest.currentIntent.slots));
    }
}
exports.handler = (event, context, callback) => {
    console.log(event);
    dispatch(event,(response)=>{
        console.log("response ",response);
        callback(null, response);
    });
};