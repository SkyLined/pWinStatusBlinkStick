// --- Parse arguments ---------------------------------------------------------
var bCPUConsoleOutput =                 false;
var bNetConsoleOutput =                 false;
var bColorConsoleOutput =               false;
var foParseArguments = require("../foParseArguments");
var oArguments = foParseArguments({
  "adxParameters": [
    {
      "sName": "serial-number",
      "sTypeDescription": "string",
      "auRepeat": [0, Infinity],
      "sHelpText": "Serial numbers of BlinkSticks to use",
    },
  ],
  "dxSwitches": {
    "mode-normal": {
      "sHelpText": "Use normal mode for single LED attached to BlinkStick/BlinkStick Pro",
      "asExcludesSwitches": ["mode-inverse", "mode-multi-led", "mode-dual-led"],
    },
    "mode-inverse": {
      "sHelpText": "Use inverse mode for IKEA dioder attached to BlinkStick Pro",
      "asExcludesSwitches": ["mode-normal", "mode-multi-led", "mode-dual-led"],
    },
    "mode-multi-led": {
      "sHelpText": "Use WS2812 mode for multiple LEDs attached to a BlinkStick Pro",
      "asExcludesSwitches": ["mode-normal", "mode-inverse"],
    },
    "dual-led": {
      "sHelpText": "Show CPU usage and Network latency on alternating LEDs (requires WS2812 mode)",
      "asExcludesSwitches": ["mode-normal", "mode-inverse"],
    },
    "show-blinksticks": {
      "sHelpText": "Output the serial numbers and modes of all selected BlinkSticks",
    },
  },
  "dxOptions": {
    "cpu-polling": {
      "sTypeDescription": "uint",
      "sHelpText": "Interval between CPU usage checks in ms",
      "xDefaultValue": 40,
    },
    "cpu-average": {
      "sTypeDescription": "uint",
      "sHelpText": "Interval over which CPU usage is averaged in ms",
      "xDefaultValue": 2000,
    },
    "cpu-heartbeat": {
      "sTypeDescription": "uint-uint",
      "sHelpText": "Interval of the \"heartbeat\" for idle and 100% CPU usage in ms",
      "xDefaultValue": [3000, 1000],
    },
    "net-polling": {
      "sTypeDescription": "uint",
      "sHelpText": "Interval between net connection checks in ms",
      "xDefaultValue": 100,
    },
    "net-timeout": {
      "sTypeDescription": "uint",
      "sHelpText": "Timeout for net connections in ms",
      "xDefaultValue": 500,
    },
    "net-average": {
      "sTypeDescription": "uint",
      "sHelpText": "Interval over which net latency is averaged in ms",
      "xDefaultValue": 5000,
    },
    "net-url": {
      "sTypeDescription": "string",
      "sHelpText": "URL to request for net connection tests",
      "xDefaultValue": "http://clients3.google.com/generate_204",
    },
    "frame-rate": {
      "sTypeDescription": "uint",
      "sHelpText": "Interval between BlinkStick color updates in ms",
      "xDefaultValue": parseInt(1000/24), // 24 fps would be nice
    },
    "night-time-brightness": {
      "sTypeDescription": "float01",
      "sHelpText": "Night time brightness as compared to day time brightness",
      "xDefaultValue": 0.25,
    },
  }
});
if (!oArguments) process.exit();
var nCPUPollingInterval =         oArguments.dxOptions["cpu-polling"];
var nCPUAverageInterval =         oArguments.dxOptions["cpu-average"];
var nCPUIdleHeartBeatInterval =   oArguments.dxOptions["cpu-heartbeat"][0];
var nCPUBusyHeartBeatInterval =   oArguments.dxOptions["cpu-heartbeat"][1];
var nNetInterval =                oArguments.dxOptions["net-polling"];
var nNetTimeout =                 oArguments.dxOptions["net-timeout"];
var nNetAverageInterval =         oArguments.dxOptions["net-average"];
var sNetTargetUrl =               oArguments.dxOptions["net-url"];
var bBlinkStickMode0 =            oArguments.dbSwitches["mode-normal"];
var bBlinkStickMode1 =            oArguments.dbSwitches["mode-inverse"];
var bBlinkStickMode2 =            oArguments.dbSwitches["mode-multi-led"];
var bBlinkStickDualLed =          oArguments.dbSwitches["dual-led"];
var bBlinkStickShowDetails =      oArguments.dbSwitches["show-blinksticks"];
var uBlinkStickUpdateInterval =   oArguments.dxOptions["frame-rate"];
var nNightTimeBrightness =        oArguments.dxOptions["night-time-brightness"];
var asBlinkStickSerialNumbers =   oArguments.dxParameters["serial-numbers"];
// --- Gather CPU usage data ---------------------------------------------------
var cWinPerfCounter = require("cWinPerfCounter"),
    oPerfCounter = new cWinPerfCounter("\\Processor(_Total)\\% Processor Time");
var nAverageCPUUsage = 0;
var aoCPUUsageSamples = [];
setInterval(function () {
  try {
    var nCPUUsage = oPerfCounter.fnGetValue();
  } catch (oError) {
    console.log("Cannot get CPU usage performance counter:", oError);
    var nCPUUsage = undefined;
  }
  var nSampleTime = new Date().valueOf();
  var uSampleCount = aoCPUUsageSamples.length;
  aoCPUUsageSamples = aoCPUUsageSamples.filter(function (oSample) {
    return oSample.nDateValue >= nSampleTime - nCPUAverageInterval;
  });
  var bCPUUsageNeedsRecalculation = uSampleCount != aoCPUUsageSamples;
  if (nCPUUsage !== undefined && nCPUUsage !== null) {
    bCPUConsoleOutput && console.log("nCPUUsage = " + nCPUUsage);
    aoCPUUsageSamples.push(new cSample(nSampleTime, nCPUUsage / 100)); // Convert % to [0-1]
    bCPUUsageNeedsRecalculation = true;
  }
  if (bCPUUsageNeedsRecalculation) {
    bCPUConsoleOutput && console.log("aoCPUUsageSamples = " + JSON.stringify(aoCPUUsageSamples));
    nAverageCPUUsage = aoCPUUsageSamples ? average(aoCPUUsageSamples.map(function (oSample) { return oSample.nValue; })) : undefined;
    bCPUConsoleOutput && console.log("nAverageCPUUsage = " + nAverageCPUUsage);
    fUpdateBlinkSticks();
  }
}, nCPUPollingInterval);
// --- Gather Network ping data ------------------------------------------------
var nNetworkLatency = 0;
var mHTTP = require("http");
var nMinimalNetDuration = nNetTimeout;
var aoNetSamples = [];
var uCounter = 0;
setInterval(function () {
  var uIndex = uCounter++;
  var nRequestStartTime = new Date().valueOf();
  var uTimeout = setTimeout(function () {
    handleNet(null, null);
  }, nNetTimeout);
  bNetConsoleOutput && console.log("Net: Sending request #" + uIndex + "...");
  oRequest = mHTTP.get(sNetTargetUrl);
  oRequest.on("error", function (oError) {
    console.log("Cannot request network latency test page:", oError);
    handleNet(oError, null);
  });
  oRequest.on("response", function (oResponse) {
    handleNet(null, oResponse);
  });
  function handleNet(oError, oResponse) {
    var uSampleCount = aoNetSamples.length;
    var nSampleTime = new Date().valueOf();
    aoNetSamples = aoNetSamples.filter(function (oSample) {
      return oSample.nDateValue >= nSampleTime - nNetAverageInterval;
    });
    var bNetworkLatencyNeedsRecalculation = uSampleCount != aoNetSamples.length;
    if (uTimeout !== null) {
      clearTimeout(uTimeout);
      uTimeout = null;
      if (oResponse) {
        sMessage = "response for #" + uIndex + ": " + oResponse.statusCode;
        nNetDuration = nSampleTime - nRequestStartTime;
        if (nNetDuration < nMinimalNetDuration) {
          nMinimalNetDuration = nNetDuration;
        }
      } else if (oError) {
        sMessage = "error for #" + uIndex + ": " + oError;
        nNetDuration = nNetTimeout;
      } else {
        sMessage = "timeout for #" + uIndex;
        nNetDuration = nNetTimeout;
      }
      aoNetSamples.push(new cSample(nSampleTime, nNetDuration));
      bNetworkLatencyNeedsRecalculation = true;
    }
    if (bNetworkLatencyNeedsRecalculation) {
      if (aoNetSamples) {
        nAverageNetDuration = average(aoNetSamples.map(function (oSample) { return oSample.nValue; }));
        nNetworkLatency = (nAverageNetDuration - nMinimalNetDuration) / (nNetTimeout - nMinimalNetDuration);
      } else {
        nNetworkLatency = undefined;
      }
      bNetConsoleOutput && console.log("Net: " + sMessage + ": " + nNetDuration + " => " + nAverageNetDuration + 
          "/" + nNetTimeout + " => " + nNetworkLatency);
      fUpdateBlinkSticks();
    }
  }
}, nNetInterval);
// --- Update BlinkStick colors ------------------------------------------------
var mColor = require("mColor"),
    cBlinkSticksCollection = require("./cBlinkSticksCollection.js"),
    oBlinkSticksCollection = undefined;
var nLastBlinkStickTime, nHeartBeatCounter;
if (asBlinkStickSerialNumbers) {
  cBlinkSticksCollection.fCreateForSerialNumbers(asBlinkStickSerialNumbers, fBlinkSticksCollectionCreatedCallback);
} else {
  cBlinkSticksCollection.fCreateForAll(fBlinkSticksCollectionCreatedCallback);
}
function fBlinkSticksCollectionCreatedCallback(oError, _oBlinkSticksCollection) {
  oBlinkSticksCollection = _oBlinkSticksCollection;
  // If needed, show the serial numbers of (selected) BlinkSticks
  if (bBlinkStickShowDetails) {
    oBlinkSticksCollection.aoBlinkSticks.forEach(function (oBlinkStick) {
      console.log("Serial number " + oBlinkStick.sSerialNumber + " is in mode " + oBlinkStick.uMode);
    });
  };
  // If needed, switch the mode of the (selected) BlinkSticks
  var uSwitchToMode = (
    bBlinkStickMode0 ? 0 :
    bBlinkStickMode1 ? 1 :
    bBlinkStickMode2 ? 2 :
    undefined
  );  
  if (uSwitchToMode !== undefined) {
    oBlinkSticksCollection.fSwitchModes(uSwitchToMode, function () {
      fBlinkSticksModeSwitchedCallback();
    });
  } else {
    fBlinkSticksModeSwitchedCallback();
  }
}
function fBlinkSticksModeSwitchedCallback() {
  nLastBlinkStickTime = new Date().valueOf();
  nHeartBeatCounter = 0;
  var oBlack = mColor.cRGBA("black");
  var aoAllBlack = new Array(64); for (var u = 0; u < aoAllBlack.length; u++) aoAllBlack[u] = oBlack;
  var aaoAllBlack = new Array(3); for (var u = 0; u < aaoAllBlack.length; u++) aaoAllBlack[u] = aoAllBlack;
  oBlinkSticksCollection.fSetColors(oBlack, aaoAllBlack);
  fUpdateBlinkSticks();
}

var uBlinkStickUpdateTimeout;
function fUpdateBlinkSticks() {
  // In case there is no update from CPU usage or network in a while, the BlinkSticks still need to get updated to
  // show the heartbeat.
  if (uBlinkStickUpdateTimeout !== undefined) clearTimeout(uBlinkStickUpdateTimeout);
  uBlinkStickUpdateTimeout = setTimeout(fUpdateBlinkSticks, uBlinkStickUpdateInterval);
  // Get a number that goes from 0 - 2 PI based on the time of day (0 and 2 PI are midnight.
  // Use it to create a sine like value that goes to 0 around midday and goes up to 1 at midnight.
  // It's slightly more complex than a simple sin to make it look slightly more like a square wave.
  var oDate = new Date(),
      nTimeIndex =  Math.PI * 2 * ((oDate.getSeconds() / 60 + oDate.getMinutes()) / 60 + oDate.getHours()) / 24,
      nNightTimeMultiplier = (1 + Math.cos(nTimeIndex) + Math.cos(nTimeIndex) * (Math.cos(nTimeIndex * 4 + Math.PI) + 1) / 10) / 2,
      nNightTimeBrightnessAdjustment = 1 + (nNightTimeBrightness - 1) * Math.max(0, Math.min(1, nNightTimeMultiplier));
  
  // Use elapsed time and CPU usage to increase heartbeat timer. Getting the sine of this timer will yield a value that
  // is used to adjusting the luminosity to similuate a heartbeat.
  var nCurrentTime = oDate.valueOf(),
      nActualBlinkStickInterval = nCurrentTime - nLastBlinkStickTime;
  nLastBlinkStickTime = nCurrentTime;
  bColorConsoleOutput && console.log("nActualBlinkStickInterval = " + nActualBlinkStickInterval);
  var nHeartBeatInterval = nCPUIdleHeartBeatInterval + (nCPUBusyHeartBeatInterval - nCPUIdleHeartBeatInterval) * nAverageCPUUsage;
  bColorConsoleOutput && console.log("nHeartBeatInterval = " + nHeartBeatInterval);
  nHeartBeatCounter += nActualBlinkStickInterval / nHeartBeatInterval;
  bColorConsoleOutput && console.log("nHeartBeatCounter = " + nHeartBeatCounter);
  var nHeartBeat = 1 - 0.5 * Math.cos(nHeartBeatCounter * Math.PI * 2); // start at 0
  bColorConsoleOutput && console.log("nHeartBeat = " + nHeartBeat);
  
  // CPU usage: Hue changes from green to red with higher CPU usage.
  // Luminosity changes with heartbeat and increases with higher CPU usage.
  var nCPUHue = nAverageCPUUsage === undefined ? 0 : (1 - nAverageCPUUsage * nAverageCPUUsage) / 3; // G(1/3) -> R(0)
  var nCPULuminosity = 0.15 * nHeartBeat + (nAverageCPUUsage === undefined ? 0.2 : 0.2 * nAverageCPUUsage);
  nCPULuminosity *= nNightTimeBrightnessAdjustment; // night-time adjustment
  var oCPUColorHSLA = new mColor.cHSLA(nCPUHue, 1, nCPULuminosity);
  bColorConsoleOutput && console.log("nAverageCPUUsage = " + nAverageCPUUsage + ", nCPUHue = " + nCPUHue + 
      ", nCPULuminosity = " + nCPULuminosity + ", color = " + oCPUColorHSLA.sRGB);
  
  // Network latency: Hue changes from greem to blue with higher latency.
  // Luminosity changes with heartbeat and increases with higher latency.
  var nNetworkHue = nNetworkLatency === undefined ? 2 / 3 : (1 + nNetworkLatency * nNetworkLatency) / 3; // G(1/3) -> B(2/3)
  var nNetworkLuminosity = 0.15 * nHeartBeat + (nNetworkLatency === undefined ? 0.2 : 0.2 * nNetworkLatency);
  nNetworkLuminosity *= nNightTimeBrightnessAdjustment; // night-time adjustment
  var oNetworkColorHSLA = new mColor.cHSLA(nNetworkHue, 1, nNetworkLuminosity);
  bColorConsoleOutput;// &&
  bNetConsoleOutput && console.log("nNetworkLatency = " + nNetworkLatency + ", nNetworkHue = " + nNetworkHue + 
      ", nNetworkLuminosity = " +  nNetworkLuminosity + ", color: " + oNetworkColorHSLA.sRGB);
  
  // Single color: Blue overlays the CPU usage color with higher network latency (through opacity)
  var nBlueOpacity = 0.8 * (nNetworkLatency === undefined ? 1 : nNetworkLatency * nNetworkLatency);
  var oNetworkOverlayColorHSLA = new mColor.cHSLA(2/3, 1, 0.5 * nNightTimeBrightnessAdjustment, nBlueOpacity);
  var oSingleColorHSLA = oNetworkOverlayColorHSLA.foOver(oCPUColorHSLA);
  bColorConsoleOutput && console.log("nBlueOpacity = " + nBlueOpacity + ", overlay color = " +
      oNetworkOverlayColorHSLA.sRGB + ", single color = " + oSingleColorHSLA.sRGB);
  oBlinkSticksCollection.fSetColors(oSingleColorHSLA, [[oCPUColorHSLA, oNetworkColorHSLA]]);
};
// --- Helper functions --------------------------------------------------------
function average(anValues) {
  var nAverage = 0;
  anValues.forEach(function(nValue) {
    nAverage += nValue / anValues.length;
  });
  return nAverage;
}

function cSample(nDateValue, nValue) {
  this.nDateValue = nDateValue;
  this.nValue = nValue;
}
