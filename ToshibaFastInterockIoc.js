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

b.pinMode(reflPowLvlPwmPin, b.ANALOG_OUTPUT);
b.pinMode(resetPin, b.OUTPUT);
b.pinMode(pinSwitchControlPin, b.OUTPUT);
b.pinMode(tripPin, b.INPUT);
b.pinMode(tripTypePin, b.INPUT);
b.pinMode(arcTripTypePin, b.INPUT);
b.attachInterrupt(tripPin, true, b.RISING, handleTrip);
b.pinMode(bbBootLedPin, b.OUTPUT);

var subscribeTopics = "toshibaFastInterlock/set";
var publishTopics   = "toshibaFastInterlock/get";

client.on ('connect', function () {subscribeToTopics();})
client.on('message', function (topic, message) {newMessage(topic, message);})
setInterval(blinky, 1000);

function subscribeToTopics()
{
    client.subscribe(subscribeTopics); 
    console.log('Subscribing to: ' + subscribeTopics);
    intIoc();
}

function newMessage(topic, message) 
{
  console.log("Topic = " + topic + " Message = " + message.toString());
  if (subscribeTopics.localeCompare(topic) == 0)
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
    var mqttObj = {"reflPowLvl":reflPowLvl.toString(), "pinSwitch":pinSwitchState, "trip":tripVal, "tripType":tripType};
    console.log('Publishing to: ' + publishTopics + ' ' + JSON.stringify(mqttObj));
    client.publish(publishTopics, JSON.stringify(mqttObj));
}

function intIoc()
{
    console.log('Initializing IOC');

    b.analogWrite(reflPowLvlPwmPin, reflPowLvl);
    b.digitalWrite(resetPin, b.LOW);
    b.digitalWrite(pinSwitchControlPin, b.LOW);
    pinSwitchState = "OFF";
    b.digitalWrite(bbBootLedPin, b.HIGH);
    updateReadings();
}

function handleTrip()
{
    if (b.digitalRead(tripPin) == b.HIGH)
    {
        b.digitalWrite(pinSwitchControlPin, b.LOW);
        pinSwitchState = "OFF";
    }
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