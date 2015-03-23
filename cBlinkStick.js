var bBlinkStickConsoleOutput = false;

var mBlinkStick = require("BlinkStick");
module.exports = cBlinkStick;

function cBlinkStick(oBlinkStickDevice, sSerialNumber) {
  if (this.constructor != arguments.callee) return new arguments.callee();
  var oThis = this;
  oThis.oBlinkStickDevice = oBlinkStickDevice;
  oThis.bDeviceBusy = false;
  oThis.uSequentialErrors = 0;
  oThis.sSerialNumber = sSerialNumber;
  oThis.uMode = undefined;
};
cBlinkStick.prototype.fGetSerialNumber = function cBlinkStick_fGetSerialNumber(fCallback) {
  var oThis = this;
  if (oThis.bDeviceBusy) {
    throw new Error("None of the methods of a cBlinkStick object are re-entrant!");
  } else if (oThis.sSerialNumber !== undefined) {
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fGetSerialNumbers > already finished, serial number = " + 
        oThis.sSerialNumber);
    process.nextTick(fCallback); // already done
  } else {
    // Add the callback to the list and start getting the serial number
    oThis.bDeviceBusy = true;
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fGetSerialNumber > started");
    (function cBlinkStick_fGetSerialNumber_Helper() {
      oThis.oBlinkStickDevice.getSerial(function (oError, sSerialNumber) {
        if (!oError) {
          oThis.uSequentialErrors = 0;
          oThis.sSerialNumber = sSerialNumber;
          console.log("cBlinkStick::fGetSerialNumber > finished, serial number = " + sSerialNumber);
        } else if (++oThis.uSequentialErrors < 10) {
          console.warn("cBlinkStick::fGetSerialNumber > error =", oError, "(retrying)");
          return process.nextTick(cBlinkStick_fGetSerialNumber_Helper); // try again
        };
        oThis.bDeviceBusy = false;
        process.nextTick(function() { fCallback(oError, sSerialNumber); });
      });
    })();
  };
};
cBlinkStick.prototype.fSwitchMode = function cBlinkStick_fSwitchMode(uMode, fCallback) {
  var oThis = this;
  if (oThis.bDeviceBusy) {
    throw new Error("None of the methods of a cBlinkStick object are re-entrant!");
  } else if (oThis.uMode !== undefined && oThis.uMode == uMode) {
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSwitchMode > already finished, mode = " + oThis.uMode);
    process.nextTick(fCallback); // already done
  } else {
    oThis.bDeviceBusy = true;
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSwitchMode > started");
    (function cBlinkStick_fSwitchMode_Helper() {
      oThis.oBlinkStickDevice.setMode(uMode, function (oError) {
        if (!oError) {
          oThis.uSequentialErrors = 0;
          oThis.uMode = uMode;
          console.log("cBlinkStick::fSwitchMode > finished, mode = " + uMode);
        } else if (++oThis.uSequentialErrors < 10) {
          console.warn("cBlinkStick::fSwitchMode > error =", oError, "(retrying)");
          return process.nextTick(cBlinkStick_fSwitchMode_Helper); // try again
        };
        oThis.bDeviceBusy = false;
        process.nextTick(function() { fCallback(oError); });
      });
    })();
  };
};
cBlinkStick.prototype.fGetMode = function cBlinkStick_fGetMode(fCallback) {
  var oThis = this;
  if (oThis.bDeviceBusy) {
    throw new Error("None of the methods of a cBlinkStick object are re-entrant!");
  } else if (oThis.uMode !== undefined) {
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fGetMode > already finished, mode = " + oThis.uMode);
    process.nextTick(fCallback); // already done
  } else {
    oThis.bDeviceBusy = true;
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fGetMode > started");
    (function cBlinkStick_fGetMode_Helper() {
      oThis.oBlinkStickDevice.getMode(function (oError, uMode) {
        if (!oError) {
          oThis.uSequentialErrors = 0;
          oThis.uMode = uMode;
          console.log("cBlinkStick::fGetMode > finished, mode = " + uMode);
        } else if (++oThis.uSequentialErrors < 10) {
          console.warn("cBlinkStick::fGetMode > error =", oError, "(retrying)");
          return process.nextTick(cBlinkStick_fGetMode_Helper); // try again
        };
        oThis.bDeviceBusy = false;
        process.nextTick(function() { fCallback(oError, uMode); });
      });
    })();
  };
};
cBlinkStick.prototype.fSetColor = function cBlinkStick_fSetColor(oColor, fCallback) {
  var oThis = this;
  if (oThis.bDeviceBusy) {
    throw new Error("None of the methods of a cBlinkStick object are re-entrant!");
  } else if (oThis.uMode === undefined) {
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSetColor > mode unknown, getting mode first");
    oThis.fGetMode(function() { fSetColor(oColor, fCallback); });
  } else if (oThis.uMode == 2) {
    // Set all 64 LEDs in all 3 channels to the provided color.
    var aoColors = []; for (var u = 0; u < 64; u++) { aoColors[u] = oColor; };
    var aaoColors = []; for (var u = 0; u < 3; u++) { aaoColors[u] = aoColors; };
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSetColor > mode = 2, calling fSetColors");
    oThis.fSetColors(aaoColors, fCallback);
  } else {
    var sRGBValue = oColor.sRGB;
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSetColor > started, color = " + sRGBValue);
    (function cBlinkStick_fSetColor_Helper() {
      oThis.oBlinkStickDevice.setColor(sRGBValue, function (oError) {
        if (!oError) {
          oThis.uSequentialErrors = 0;
          console.log("cBlinkStick::fSetColor > finished");
        } else if (++oThis.uSequentialErrors < 10) {
          console.warn("cBlinkStick::fSetColor > error =", oError, "(retrying)");
          return process.nextTick(cBlinkStick_fSetColor_Helper); // try again
        };
        oThis.bDeviceBusy = false;
        process.nextTick(function() { fCallback(oError); });
      });
    })();
  };
};
cBlinkStick.prototype.fSetColors = function cBlinkStick_fSetColors(aaoColors, fCallback) {
  if (oThis.bDeviceBusy) {
    throw new Error("None of the methods of a cBlinkStick object are re-entrant!");
  } else if (oThis.uMode === undefined) {
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSetColors > mode unknown, getting mode first");
    oThis.fGetMode(function() { fSetColors(aaoColors, fCallback); });
  } else if (oThis.uMode != 2) {
    throw new Error("Cannot call cBlinkStick::fSetColors on a BlinkStick in mode " + oThis.uMode);
  } else {
    oThis.bDeviceBusy = true;
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSetColors > started");
    // Convert colors to array with G,R,B [0-255] values
    if (aaoColors.length == 0) throw new Error("No multi-colors provided");
    if (aaoColors.length > 3) throw new Error("Too many multi-colors provided (" + aaoMultiColors.length + ")");
    var aauGRBValues = aaoColors.map(function (aoColors) {
      var auGRBValues = [];
      aoColors.forEach(function (oColor) { 
        var oColorRGBA = oColor.foGetRGBA();
        auGRBValues.push(oColorRGBA.uG, oColorRGBA.uR, oColorRGBA.uB); // GRB not RGB!
      });
      return auGRBValues;
    });
    var uChannelIndex = 0;
    bBlinkStickConsoleOutput && console.log("cBlinkStick::fSetColors > started");
    (function cBlinkStick_fSetColors_Helper() {
      bBlinkStickConsoleOutput && console.log("cBlinkStick::fSetColors > channel #" + uChannelIndex + " colors = [" + 
          aaoColors[uChannelIndex].map(function (oColor) { return oColor.sRGB; }).join(", ") + "]");
      oThis.oBlinkStickDevice.setColors(uChannelIndex, aauGRBValues[uChannelIndex], function (oError) {
        if (!oError) {
          oThis.uSequentialErrors = 0;
          if (++uChannelIndex < aauGRBValues.length) {
            return process.nextTick(cBlinkStick_fSetColors_Helper); // next channel;
          } else {
            console.log("cBlinkStick::fSetColors > finished");
          };
        } else if (++oThis.uSequentialErrors < 10) {
          console.warn("cBlinkStick::fSetColors > error =", oError, "(retrying)");
          return process.nextTick(cBlinkStick_fSetColors_Helper); // try again
        };
        oThis.bDeviceBusy = false;
        process.nextTick(function() { fCallback(oError); });
      });
    })();
  };
};
