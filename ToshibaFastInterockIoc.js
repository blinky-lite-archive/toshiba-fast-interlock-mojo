const mqtt = require('mqtt');  
var b = require('bonescript');
const client = mqtt.connect('tcp://broker.shiftr.io:1883',{username:'45357989',password: new Buffer('bad7813039046c87'), clientId: 'toshibaFastInterlockIoc'});

var reflPowLvlPwmPin = 'P9_42';
var resetPin = 'P8_7';
var pinSwitchControlPin = 'P8_8';
var tripPin = 'P8_9';
var tripTypePin = 'P8_10';
var arcTripTypePin = 'P8_12';
var bbBootLedPin = 'P8_18';
var reflPowLvl = 0.143;
var pinSwitchState = "OFF";
var blinkLightOn = false;
var gabby = true;
var mqttObjReadings = {};
var tripCounter = 0;
var tripcounterTimeArray = [new Date().getTime()];
var tripcounterTimeArrayMaxSize = 10;
var tripRate = 0;
var tripDate = tripcounterTimeArray[0];

b.pinMode(reflPowLvlPwmPin, b.ANALOG_OUTPUT);
b.pinMode(resetPin, b.OUTPUT);
b.pinMode(pinSwitchControlPin, b.OUTPUT);
b.pinMode(tripPin, b.INPUT);
b.pinMode(tripTypePin, b.INPUT);
b.pinMode(arcTripTypePin, b.INPUT);
b.attachInterrupt(tripPin, true, b.RISING, handleTrip);
b.pinMode(bbBootLedPin, b.OUTPUT);
var subscribeTopics = "toshibaFastInterlock/#";
var publishTopics   = "toshibaFastInterlock/get";

client.on ('connect', function () {subscribeToTopics();})
client.on('message', function (topic, message) {newMessage(topic, message);})
setInterval(blinky, 1000);
setInterval(updateReadings, 10000);

function subscribeToTopics()
{
    client.subscribe("toshibaFastInterlock/set"); 
    console.log('Subscribing to: ' + "toshibaFastInterlock/set");
    client.subscribe('toshibaFastInterlock/status'); 
    console.log('Subscribing to: ' + 'toshibaFastInterlock/status');
    intIoc();
}

function newMessage(topic, message) 
{
  if (gabby) console.log("Topic = " + topic + " Message = " + message.toString());
  if (topic == "toshibaFastInterlock/set")
  {
      var objJSON = JSON.parse(message.toString());
      if (!("undefined" === typeof objJSON.reflPowLvl))
      {
          reflPowLvl = parseFloat(objJSON.reflPowLvl);
          b.analogWrite(reflPowLvlPwmPin, reflPowLvl);
      }
      if (!("undefined" === typeof objJSON.reset))
      {
          if (objJSON.reset.localeCompare("TRUE") == 0)
          {
              b.digitalWrite(resetPin, b.HIGH);
              setTimeout(function() {b.digitalWrite(resetPin, b.LOW);}, 1);
          }
      }
      if (!("undefined" === typeof objJSON.pinSwitch))
      {
          if (b.digitalRead(tripPin) == b.LOW)
          {
              if (objJSON.pinSwitch.localeCompare("ON") == 0)
              {
                  b.digitalWrite(pinSwitchControlPin, b.HIGH);
                  pinSwitchState = "ON";
              }
              if (objJSON.pinSwitch.localeCompare("OFF") == 0)
              {
                  b.digitalWrite(pinSwitchControlPin, b.LOW);
                  pinSwitchState = "OFF";
              }
          }
      }
      updateReadings();
  }
  if (topic == 'toshibaFastInterlock/status')
  {
      client.publish('toshibaFastInterlock/echo', JSON.stringify(mqttObjReadings));
  }
}

function updateReadings()
{
    var tripVal = "FALSE";
    var tripType = "none";
    if (b.digitalRead(tripPin) == b.HIGH)
    {
        tripVal = "TRUE";
        tripType = "reflPower";
        if (b.digitalRead(tripTypePin) == b.HIGH) 
        {
            tripType = "arcDet";
            if (b.digitalRead(arcTripTypePin) == b.HIGH)  tripType = "aftDet";
        }
    }
    mqttObjReadings = {"reflPowLvl":reflPowLvl.toString(), "pinSwitch":pinSwitchState, "trip":tripVal, "tripType":tripType, 'tripCounter':tripCounter.toString(), 'tripRate':tripRate.toString(), 'tripDate':tripDate.toString()};
    if (gabby) console.log('Publishing to: ' + publishTopics + ' ' + JSON.stringify(mqttObjReadings));
    client.publish(publishTopics, JSON.stringify(mqttObjReadings));
}

function intIoc()
{
    console.log('Initializing IOC');

    b.analogWrite(reflPowLvlPwmPin, reflPowLvl);
    b.digitalWrite(resetPin, b.LOW);
    b.digitalWrite(pinSwitchControlPin, b.LOW);
    pinSwitchState = "OFF";
    b.digitalWrite(bbBootLedPin, b.HIGH);
}

function handleTrip()
{
    if (b.digitalRead(tripPin) == b.HIGH)
    {
        b.digitalWrite(pinSwitchControlPin, b.LOW);
        pinSwitchState = "OFF";
    }
    tripCounter = tripCounter + 1;
    tripDate = new Date().getTime();
    tripcounterTimeArray.push(tripDate);
    if (tripcounterTimeArray.length > tripcounterTimeArrayMaxSize) tripcounterTimeArray.splice(0,1);
    tripRate = (tripcounterTimeArray[tripcounterTimeArray.length - 1] - tripcounterTimeArray[0]) / 3600000.0;
    tripRate = Math.round(100.0* tripcounterTimeArray.length / tripRate) / 100;
//    console.log('Trip count = ' + tripCounter + ' Trip rate = ' + tripRate);
    
    updateReadings();
}

function blinky()
{
    if (blinkLightOn)
    {
        b.digitalWrite(bbBootLedPin, b.LOW);
        blinkLightOn = false;
    }
    else
    {
        b.digitalWrite(bbBootLedPin, b.HIGH);
        blinkLightOn = true;
    }
}
