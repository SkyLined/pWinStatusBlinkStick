// --- Parse arguments ---------------------------------------------------------
var bCPUConsoleOutput =                 false;
var bNetConsoleOutput =                 false;
var bBlinkStickConsoleOutput =          false;
var foParseArguments = require("foParseArguments");
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
    "dioder": {
      "sHelpText": "Inverse BlinkStick colors for use with an IKEA dioder",
    },
    "show-serials": {
      "sHelpText": "Output the serial numbers of all selected BlinkSticks",
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
    "framerate": {
      "sTypeDescription": "uint",
      "sHelpText": "Interval between BlinkStick color updates in ms",
      "xDefaultValue": 1,
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
var bBlinkStickDioder =           oArguments.dbSwitches["dioder"];
var bBlinkStickShowSerials =      oArguments.dbSwitches["show-serials"];
var nBlinkStickRefreshInterval =  oArguments.dxOptions["framerate"];
var asBlinkStickSerialNumbers =   oArguments.dxParameters["serial-numbers"];
// --- Gather CPU usage data ---------------------------------------------------
var cWinPerfCounter = require("cWinPerfCounter"),
    oPerfCounter = new cWinPerfCounter("\\Processor(_Total)\\% Processor Time");
var nAverageCPUUsage = 0;
var aoCPUUsageSamples = [];
setInterval(function () {
  try {
    var nCPUUsage = oPerfCounter.fnGetValue();
  } catch (e) {
    return;
  }
  bCPUConsoleOutput && console.log("nCPUUsage = " + nCPUUsage);
  var nSampleTime = new Date().valueOf();
  aoCPUUsageSamples = aoCPUUsageSamples.filter(function (oSample) {
    return oSample.nDateValue >= nSampleTime - nCPUAverageInterval;
  });
  if (nCPUUsage != null) {
    aoCPUUsageSamples.push(new cSample(nSampleTime, nCPUUsage / 100)); // Convert % to [0-1]
  }
  bCPUConsoleOutput && console.log("aoCPUUsageSamples = " + JSON.stringify(aoCPUUsageSamples));
  nAverageCPUUsage = aoCPUUsageSamples ? average(aoCPUUsageSamples.map(function (oSample) { return oSample.nValue; })) : undefined;
  bCPUConsoleOutput && console.log("nAverageCPUUsage = " + nAverageCPUUsage);
}, nCPUPollingInterval);
// --- Gather Network ping data ------------------------------------------------
var nNetworkLatency = 0;
var mHTTP = require("http");
var nMinimalNetDuration = nNetTimeout;
var aoNetSamples = [];
var uCounter = 0;
setInterval(function () {
  var uIndex = uCounter++;
  var nNetStartTime = new Date().valueOf();
  var uTimeout = setTimeout(function () {
    handleNet(null, null);
  }, nNetTimeout);
  bNetConsoleOutput && console.log("Net: Sending request #" + uIndex + "...");
  oRequest = mHTTP.get(sNetTargetUrl);
  oRequest.on("error", function (oError) {
    handleNet(oError, null);
  });
  oRequest.on("response", function (oResponse) {
    handleNet(null, oResponse);
  });
  function handleNet(oError, oResponse) {
    if (uTimeout !== null) {
      clearTimeout(uTimeout);
      uTimeout = null;
      var nNetEndTime = new Date().valueOf();
      if (oResponse) {
        sMessage = "response for #" + uIndex + ": " + oResponse.statusCode;
        nNetDuration = nNetEndTime - nNetStartTime;
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
      aoNetSamples = aoNetSamples.filter(function (oSample) {
        return oSample.nDateValue >= nNetEndTime - nNetAverageInterval;
      });
      aoNetSamples.push(new cSample(nNetEndTime, nNetDuration));
      nAverageNetDuration = aoNetSamples ? average(aoNetSamples.map(function (oSample) { return oSample.nValue; })) : undefined;
      nNetworkLatency = (nAverageNetDuration - nMinimalNetDuration) / (nNetTimeout - nMinimalNetDuration);
      bNetConsoleOutput && console.log("Net: " + sMessage + ": " + nNetDuration + " => " + nAverageNetDuration + 
          "/" + nNetTimeout + " => " + nNetworkLatency);
    }
  }
}, nNetInterval);
// --- Update BlinkStick colors ------------------------------------------------
var mBlinkStick = require("BlinkStick"),
    aoBlinkSticks = mBlinkStick.findAll();
if (asBlinkStickSerialNumbers) {
  var asFoundSerialNumbers = [];
  var aoAllBlinkSticks = aoBlinkSticks;
  aoBlinkSticks = [];
  aoAllBlinkSticks.forEach(function (oBlinkStick) {
    oBlinkStick.getSerial(function (oError, sSerialNumber) {
      if (oError) throw oError;
      var uIndex = asBlinkStickSerialNumbers.indexOf(sSerialNumber);
      if (uIndex != -1) {
        aoBlinkSticks.push(oBlinkStick);
        asBlinkStickSerialNumbers.splice(uIndex, 1);
      }
      asFoundSerialNumbers.push(sSerialNumber);
      if (asFoundSerialNumbers.length == aoAllBlinkSticks.length) {
        if (asBlinkStickSerialNumbers.length) {
          console.log("Cannot find BlinkStick with serial numbers " + asBlinkStickSerialNumbers.join(", "));
          process.exit(1);
        }
        if (bBlinkStickShowSerials) {
          console.log("Serial numbers: " + asFoundSerialNumbers.join(", "));
        }
        startBlinkSticks();
      }
    });
  });
} else if (bBlinkStickShowSerials) {
  var asFoundSerialNumbers = [];
  aoBlinkSticks.forEach(function (oBlinkStick) {
    oBlinkStick.getSerial(function (oError, sSerialNumber) {
      if (oError) throw oError;
      asFoundSerialNumbers.push(sSerialNumber);
      if (asFoundSerialNumbers.length == aoBlinkSticks.length) {
        console.log("Serial numbers: " + asFoundSerialNumbers.join(", "));
        startBlinkSticks();
      }
    });
  });
} else {
  startBlinkSticks();
}
function startBlinkSticks() {
  if (aoBlinkSticks.length == 0) {
    console.log("Cannot find any BlinkSticks");
    process.exit(1);
  }
  if (bBlinkStickDioder) {
    aoBlinkSticks.forEach(function(oBlinkStick) {
      oBlinkStick.setInverse(true);
    });
  }
  var mColor = require("mColor");
  var nLastBlinkStickTime = new Date().valueOf();
  var nHeartBeatCounter = 0;
  setInterval(function () {
    var nCurrentTime = new Date().valueOf();
    var nActualBlinkStickInterval = nCurrentTime - nLastBlinkStickTime;
    nLastBlinkStickTime = nCurrentTime;
    bBlinkStickConsoleOutput && console.log("nActualBlinkStickInterval = " + nActualBlinkStickInterval);
    var nHeartBeatInterval = nCPUIdleHeartBeatInterval + (nCPUBusyHeartBeatInterval - nCPUIdleHeartBeatInterval) * nAverageCPUUsage;
    bBlinkStickConsoleOutput && console.log("nHeartBeatInterval = " + nHeartBeatInterval);
    nHeartBeatCounter += nActualBlinkStickInterval / nHeartBeatInterval;
    bBlinkStickConsoleOutput && console.log("nHeartBeatCounter = " + nHeartBeatCounter);
    var nHeartBeat = 1 + 0.5 * Math.sin(nHeartBeatCounter * Math.PI * 2);
    bBlinkStickConsoleOutput && console.log("nHeartBeat = " + nHeartBeat);
    // Hue changes from green to red with higher CPU usage.
    var nHue = (
        nAverageCPUUsage === undefined ? 0 :
        (1 - nAverageCPUUsage * nAverageCPUUsage) / 3
    );
    bBlinkStickConsoleOutput && console.log("nHue = " + nHue);
    // Luminosity changes with heartbeat and increases with higher CPU usage.
    var nLuminosity = (
        0.15 * nHeartBeat +
        (nAverageCPUUsage === undefined ? 0.2 : 0.2 * nAverageCPUUsage)
    );
    bBlinkStickConsoleOutput && console.log("nLuminosity = " + nLuminosity);
    // Blue overrides the color based on the network latency (through opacity)
    var nBlueOpacity = nNetworkLatency * nNetworkLatency;
    bBlinkStickConsoleOutput && console.log("nBlueOpacity = " + nBlueOpacity);
    // Combine Hue and Saturation into color
    var oNetworkColorRGBA = new mColor.cRGBA(0, 0, 1, 0.8 * nBlueOpacity);
    var oCPUColorHSLA = new mColor.cHSLA(nHue, 1, nLuminosity);
    var sColor = oNetworkColorRGBA.foOver(oCPUColorHSLA).sRGB;
    bBlinkStickConsoleOutput && console.log("sColor = " + sColor);
    aoBlinkSticks.forEach(function (oBlinkStick) {
      oBlinkStick.setColor(sColor);
    });
  }, nBlinkStickRefreshInterval);
}
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