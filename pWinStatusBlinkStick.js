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
    "multi-led": {
      "sHelpText": "Set all LEDs attached to a BlinkStick Pro",
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
var bBlinkStickDioder =           oArguments.dbSwitches["dioder"];
var bBlinkStickMultiLED =         oArguments.dbSwitches["multi-led"];
var bBlinkStickShowSerials =      oArguments.dbSwitches["show-serials"];
var asBlinkStickSerialNumbers =   oArguments.dxParameters["serial-numbers"];
var nNightTimeBrightness =        oArguments.dxOptions["night-time-brightness"];
if (bBlinkStickDioder && bBlinkStickMultiLED) {
  console.log("The --dioder and --multi-led switch are mutually exclusive");
  process.exit(1);
}
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
    mColor = require("mColor"),
    aoBlinkSticks = mBlinkStick.findAll(),
    uSequentialBlinkStickErrors = 0;
if (aoBlinkSticks.length == 0) {
  console.log("Cannot find any BlinkSticks");
  process.exit(1);
};
var nLastBlinkStickTime, nHeartBeatCounter;
fGetBlinkStickSerialNumbers(aoBlinkSticks, function (doBlinkStick_by_sSerialNumber) {
  // If needed, create a copy of doBlinkStick_by_sSerialNumber with only the requested BlinkSticks
  if (asBlinkStickSerialNumbers) {
    var doAllBlinkStick_by_sSerialNumber = doBlinkStick_by_sSerialNumber;
    doBlinkStick_by_sSerialNumber = {};
    asBlinkStickSerialNumbers.forEach(function (sSerialNumber) {
      var oBlinkStick = doBlinkStick_by_sSerialNumber[sSerialNumber];
      if (!oBlinkStick) throw new Error("Cannot find blink stick with serial number " + sSerialNumber);
      doBlinkStick_by_sSerialNumber[sSerialNumber] = oBlinkStick;
    });
  };
  // If needed, show the serial numbers of (selected) BlinkSticks
  if (bBlinkStickShowSerials) {
    console.log("Serial numbers: " + Object.keys(doBlinkStick_by_sSerialNumber).join(", "));
  };
  // Done with serial numbers: turn dictionary back into array
  aoBlinkSticks = []
  for (var sSerialNumber in doBlinkStick_by_sSerialNumber) {
    aoBlinkSticks.push(doBlinkStick_by_sSerialNumber[sSerialNumber]);
  }
  fSwitchBlinkStickModes(aoBlinkSticks, function () {
    nLastBlinkStickTime = new Date().valueOf();
    nHeartBeatCounter = 0;
    var oBlack = mColor.cRGBA("black");
    fSetBlinkStickColors(aoBlinkSticks, oBlack, function () {
      process.on("SIGINT", function () {
        fSetBlinkStickColors(aoBlinkSticks, oBlack, function () {
          process.exit();
        });
      });
      fUpdateBlinkSticks();
    });
  });
});


function fGetBlinkStickSerialNumbers(aoBlinkSticks, fCallback) {
  // callback args: doBlinkStick_by_sSerialNumber
  var uBlinkStickIndex = 0;
  doBlinkStick_by_sSerialNumber = {};
  fGetBlinkStickSerialNumbersHelper();
  function fGetBlinkStickSerialNumbersHelper() {
    aoBlinkSticks[uBlinkStickIndex].getSerial(function (oError, sSerialNumber) {
      if (oError) {
        if (++uSequentialBlinkStickErrors > 10) throw oError;
        fGetBlinkStickSerialNumbersHelper(); // try again
      } else {
        uSequentialBlinkStickErrors = 0;
        doBlinkStick_by_sSerialNumber[sSerialNumber] = aoBlinkSticks[uBlinkStickIndex];
        if (++uBlinkStickIndex < aoBlinkSticks.length) {
          fGetBlinkStickSerialNumbersHelper(); // next
        } else {
          fCallback(doBlinkStick_by_sSerialNumber); //done
        };
      };
    });
  };
};

function fSwitchBlinkStickModes(aoBlinkSticks, fCallback) {
  var uBlinkStickIndex = 0;
  var uMode = (
    bBlinkStickDioder ? 1 :
    bBlinkStickMultiLED ? 2 :
    0
  )
  fSwitchBlinkStickModesHelper();
  function fSwitchBlinkStickModesHelper() {
    aoBlinkSticks[uBlinkStickIndex].setMode(uMode, function (oError) {
      if (oError) {
        if (++uSequentialBlinkStickErrors > 10) throw oError;
        fSwitchBlinkStickModesHelper(); // try again
      } else {
        uSequentialBlinkStickErrors = 0;
        if (++uBlinkStickIndex < aoBlinkSticks.length) {
          fSwitchBlinkStickModesHelper(); // next
        } else {
          fCallback(); // done
        };
      };
    });
  };
};

function fSetBlinkStickColors(aoBlinkSticks, oColor, fCallback) {
  var uBlinkStickIndex = 0;
  if (bBlinkStickMultiLED) {
    var auColors = [];
    for (var uIndex = 0; uIndex < 64; uIndex++) {
      auColors.push(oColor.uG, oColor.uR, oColor.uB); // GRB not RGB!
    }
    var uChannelIndex = 0;
    fSetBlinkStickMultiLEDColorsHelper();
    function fSetBlinkStickMultiLEDColorsHelper() {
      aoBlinkSticks[uBlinkStickIndex].setColors(uChannelIndex, auColors, function (oError) {
        if (oError) {
          if (++uSequentialBlinkStickErrors > 10) throw oError;
          bBlinkStickConsoleOutput && console.log("Error setting BlinkStick color:", oError);
          fSetBlinkStickMultiLEDColorsHelper(); // try again
        } else {
          uSequentialBlinkStickErrors = 0;
          if (++uChannelIndex < 3) {
            fSetBlinkStickMultiLEDColorsHelper(); // next channel;
          } else if (++uBlinkStickIndex < aoBlinkSticks.length) {
            uChannelIndex = 0;
            fSetBlinkStickMultiLEDColorsHelper(); // next BlinkStick
          } else {
            fCallback(); // done
          };
        };
      });
    };
  } else {
    fSetBlinkStickColorsHelper();
    function fSetBlinkStickColorsHelper() {
      aoBlinkSticks[uBlinkStickIndex].setColor(oColor.sRGB, function (oError) {
        if (oError) {
          if (++uSequentialBlinkStickErrors > 10) throw oError;
          bBlinkStickConsoleOutput && console.log("Error setting BlinkStick color:", oError);
          fSetBlinkStickColorsHelper(); // try again
        } else {
          uSequentialBlinkStickErrors = 0;
          if (++uBlinkStickIndex < aoBlinkSticks.length) {
            fSetBlinkStickColorsHelper(); // next
          } else {
            fCallback(); // done
          };
        };
      });
    };
  }
};

function fUpdateBlinkSticks() {
  var nCurrentTime = new Date().valueOf();
  var nActualBlinkStickInterval = nCurrentTime - nLastBlinkStickTime;
  nLastBlinkStickTime = nCurrentTime;
  bBlinkStickConsoleOutput && console.log("nActualBlinkStickInterval = " + nActualBlinkStickInterval);
  var nHeartBeatInterval = nCPUIdleHeartBeatInterval + (nCPUBusyHeartBeatInterval - nCPUIdleHeartBeatInterval) * nAverageCPUUsage;
  bBlinkStickConsoleOutput && console.log("nHeartBeatInterval = " + nHeartBeatInterval);
  nHeartBeatCounter += nActualBlinkStickInterval / nHeartBeatInterval;
  bBlinkStickConsoleOutput && console.log("nHeartBeatCounter = " + nHeartBeatCounter);
  var nHeartBeat = 1 - 0.5 * Math.cos(nHeartBeatCounter * Math.PI * 2); // start at 0
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
  var oNetworkColorHSLA = new mColor.cHSLA(2/3, 1, 0.5, 0.8 * nBlueOpacity);
  var oCPUColorHSLA = new mColor.cHSLA(nHue, 1, nLuminosity);
  var oColorHSLA = oNetworkColorHSLA.foOver(oCPUColorHSLA);
  var oDate = new Date();
  // Get a number that goes from 0 - 2 PI based on the time of day (0 and 2 PI are midnight.
  var nTimeIndex =  Math.PI * 2 * ((oDate.getSeconds() / 60 + oDate.getMinutes()) / 60 + oDate.getHours()) / 24;
  // Use it to create a sine like value that goes to 0 around midday and goes up to 1 at midnight.
  // It's slightly more complex than a simple sin to make it look slightly more like a square wave.
  var nNightTimeMultiplier = Math.max(0, Math.min(1, (1 + Math.cos(nTimeIndex) + Math.cos(nTimeIndex) * (Math.cos(nTimeIndex * 4 + Math.PI) + 1) / 10) / 2));
  // Use the sine-line value to determine the final brightness.
  oColorHSLA.nL *= 1 + (nNightTimeBrightness - 1) * nNightTimeMultiplier;
  var oColorRGBA = oColorHSLA.foGetRGBA();
  bBlinkStickConsoleOutput && console.log("oColorRGBA = " + oColorRGBA.sRGB);
  fSetBlinkStickColors(aoBlinkSticks, oColorRGBA, function () {
    fUpdateBlinkSticks();
    // Timeout because https://forums.blinkstick.com/t/node-js-callbacks-causing-stack-overflow/150
  });
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
