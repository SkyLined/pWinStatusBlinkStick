var bBlinkStickConsoleOutput = false;

var mBlinkStick = require("BlinkStick");
module.exports = cBlinkSticksCollection;

function cBlinkSticksCollection() {
  if (this.constructor != arguments.callee) return new arguments.callee();
  var oThis = this;
  oThis.aoBlinkSticks = mBlinkStick.findAll();
  oThis.auSequentialBlinkStickErrors = oThis.aoBlinkSticks.map(function() { return 0; });
  oThis.asSerialNumbers = undefined;
  oThis.auModes = undefined;
  oThis.bColorsCanBeSet = false;
  oThis.oQueuedSingleColor = undefined;
  oThis.aaoQueuedMultiColors = undefined;
}

cBlinkSticksCollection.prototype.fGetSerialNumbers = function cBlinkSticksCollection_fSerialNumbers(fCallback) {
  var oThis = this;
  if (oThis.asSerialNumbers !== undefined) {
    if (oThis.asSerialNumbers.length == oThis.aoBlinkSticks.length) {
      bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fGetSerialNumbers > already finished");
      process.nextTick(fCallback); // already done
    } else {
      throw new Error("fGetSerialNumbers called twice before it is finished");
    }
  }
  oThis.asSerialNumbers = [];
  var uBlinkStickIndex = 0;
    bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fGetSerialNumbers > started");
  (function cBlinkSticksCollection_fSerialNumbers_Helper() {
    var oBlinkStick = oThis.aoBlinkSticks[uBlinkStickIndex];
    oBlinkStick.getSerial(function (oError, sSerialNumber) {
      if (oError) {
        if (++oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] > 10) throw oError;
        console.warn("Error getting BlinkStick serial number (retrying):", oError);
        process.nextTick(cBlinkSticksCollection_fSerialNumbers_Helper); // try again
      } else {
        oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] = 0;
        console.log("cBlinkSticksCollection::fGetSerialNumbers > #" + uBlinkStickIndex + " has serial number " + sSerialNumber);
        oThis.asSerialNumbers[uBlinkStickIndex] = sSerialNumber;
        if (++uBlinkStickIndex < oThis.aoBlinkSticks.length) {
          process.nextTick(cBlinkSticksCollection_fSerialNumbers_Helper); // next
        } else {
          bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fGetSerialNumbers > finished");
          process.nextTick(fCallback); //done
        };
      };
    });
  })();
};
cBlinkSticksCollection.prototype.fSelectSerialNumbers = function cBlinkSticksCollection_fSelectSerialNumbers(asSerialNumbers) {
  var oThis = this;
  if (oThis.asSerialNumbers === undefined) throw new Error("You need to call fGetSerialNumbers before calling fSelectSerialNumbers");
  bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSelectSerialNumbers > selected");
  for (var u = 0; u < oThis.asSerialNumbers.length; u++) {
    if (asSerialNumbers.indexOf(oThis.asSerialNumbers[u]) == -1) {
      oThis.aoBlinkSticks.splice(u, 1);
      oThis.auSequentialBlinkStickErrors.splice(u, 1);
      oThis.asSerialNumbers.splice(u, 1);
      if (oThis.auModes !== undefined) {
        oThis.auModes.splice(u, 1);
      }
      u--;
    }
  }
}

cBlinkSticksCollection.prototype.fSwitchModes = function cBlinkSticksCollection_fSwitchModes(uMode, fCallback) {
  var oThis = this;
  // Get serial numbers first if needed
  if (oThis.asSerialNumbers === undefined) {
    bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSwitchModes > calling fGetSerialNumbers first");
    return oThis.fGetSerialNumbers(function () {
      oThis.fSwitchModes(uMode, fCallback);
    });
  }
  if (oThis.auModes !== undefined) {
    if (oThis.auModes.length == oThis.aoBlinkSticks.length) {
      bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSwitchModes > already finished");
      process.nextTick(fCallback); // already done
    } else {
      throw new Error("fGetModes/fSwitchModes called twice before it is finished");
    }
  }
  oThis.auModes = [];
  var uBlinkStickIndex = 0;
  bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSwitchModes > started");
  (function cBlinkSticksCollection_fSwitchModes_Helper() {
    oThis.aoBlinkSticks[uBlinkStickIndex].setMode(uMode, function (oError) {
      if (oError) {
        if (++oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] > 10) throw oError;
        console.warn("Error setting BlinkStick mode (retrying):", oError);
        process.nextTick(cBlinkSticksCollection_fSwitchModes_Helper); // try again
      } else {
        console.log("cBlinkSticksCollection::fSwitchModes > #" + uBlinkStickIndex + " was switched to mode " + uMode);
        oThis.auModes[uBlinkStickIndex] = uMode;
        oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] = 0;
        if (++uBlinkStickIndex < oThis.aoBlinkSticks.length) {
          process.nextTick(cBlinkSticksCollection_fSwitchModes_Helper); // next
        } else {
          bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSwitchModes > finished");
          process.nextTick(fCallback); // done
        };
      };
    });
  })();
};
cBlinkSticksCollection.prototype.fGetModes = function cBlinkSticksCollection_fGetModes(fCallback) {
  var oThis = this;
  // Get serial numbers first if needed
  if (oThis.asSerialNumbers === undefined) {
    bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fGetModes > calling fGetSerialNumbers first");
    return oThis.fGetSerialNumbers(function () {
      oThis.fGetModes(fCallback);
    });
  }
  if (oThis.auModes !== undefined) {
    if (oThis.auModes.length == oThis.aoBlinkSticks.length) {
      bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fGetModes > already finished");
      process.nextTick(fCallback); // already done
    } else {
      throw new Error("fGetModes/fSwitchModes called twice before it is finished");
    }
  }
  oThis.auModes = [];
  var uBlinkStickIndex = 0;
  bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fGetModes > started");
  (function cBlinkSticksCollection_fGetModes_Helper() {
    oThis.aoBlinkSticks[uBlinkStickIndex].getMode(function (oError, uMode) {
      if (oError) {
        if (++oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] > 10) throw oError;
        console.log("Error getting BlinkStick mode (retrying):", oError);
        process.nextTick(cBlinkSticksCollection_fGetModes_Helper); // try again
      } else {
        console.log("cBlinkSticksCollection::fGetModes > #" + uBlinkStickIndex + " is in mode " + uMode);
        oThis.auModes[uBlinkStickIndex] = uMode;
        oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] = 0;
        if (++uBlinkStickIndex < oThis.aoBlinkSticks.length) {
          process.nextTick(cBlinkSticksCollection_fGetModes_Helper); // next
        } else {
          bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fGetModes > finished");
          process.nextTick(fCallback); // done
        };
      };
    });
  })();
}

cBlinkSticksCollection.prototype.fSetColors = function cBlinkSticksCollection_fSetColors(oSingleColor, aaoMultiColors) {
  var oThis = this;
  if (oThis.auModes === undefined) throw new Error("fGetModes/fSwitchModes must be called before setting colors");
  if (oThis.bBusySettingColors) {
    bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSetColors > queued");
    // The code is already busy setting the colors. Once that's done it'll check if it needs to change them again
    // by looking at the value of these properties:
    oThis.oQueuedSingleColor = oSingleColor;
    oThis.aaoQueuedMultiColors = aaoMultiColors;
    // The above effectively queues the color change until the code is ready to do so. However, if another call to
    // fSetColors is made before this happens, that call will overwrite the colors set by this call. This is similar to
    // frame dropping in videos.
    return;
  }
  oThis.bBusySettingColors = true;
  bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSetColors > started");
  // Convert colors to array with G,R,B [0-255] values for multi-led BlinkSticks:
  if (aaoMultiColors.length == 0) throw new Error("No multi-colors provided");
  if (aaoMultiColors.length > 3) throw new Error("Too many multi-colors provided (" + aaoMultiColors.length + ")");
  var aauGRBValues = aaoMultiColors.map(function (aoMultiColors) {
    var auGRBValues = [];
    aoMultiColors.forEach(function (oColor) { 
      var oColorRGBA = oColor.foGetRGBA();
      auGRBValues.push(oColorRGBA.uG, oColorRGBA.uR, oColorRGBA.uB); // GRB not RGB!
    });
    return auGRBValues;
  });
  // Convert color to #RRGGBB string value
  var sRGBValue = oSingleColor.sRGB;
  // Set each BlinkStick
  var uBlinkStickIndex = 0;
  var uChannelIndex = 0;
  (function cBlinkSticksCollection_fSetColors_Helper() {
    var oBlinkStick = oThis.aoBlinkSticks[uBlinkStickIndex];
    if (oThis.auModes[uBlinkStickIndex] == 2) {
      bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSetColors > #" + uBlinkStickIndex +
          ", channel #" + uChannelIndex + " = [" + aaoMultiColors[uChannelIndex].map(function (oColor) {
          return oColor.sRGB; }).join(", ") + "]");
      oBlinkStick.setColors(uChannelIndex, aauGRBValues[uChannelIndex], cBlinkSticksCollection_fSetColors_Callback);
    } else {
      bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSetColors > #" + uBlinkStickIndex + 
          " = " + sRGBValue);
      oBlinkStick.setColor(sRGBValue, cBlinkSticksCollection_fSetColors_Callback);
    }
    function cBlinkSticksCollection_fSetColors_Callback(oError) {
      if (oError) {
        if (++oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] > 10) throw oError;
        console.log("Error setting BlinkStick color (retrying):", oError);
        process.nextTick(cBlinkSticksCollection_fSetColors_Helper); // try again
      } else {
        oThis.auSequentialBlinkStickErrors[uBlinkStickIndex] = 0;
        if (oThis.auModes[uBlinkStickIndex] == 2 && ++uChannelIndex < aauGRBValues.length) {
          process.nextTick(cBlinkSticksCollection_fSetColors_Helper); // next channel;
        } else if (++uBlinkStickIndex < oThis.aoBlinkSticks.length) {
          uChannelIndex = 0;
          process.nextTick(cBlinkSticksCollection_fSetColors_Helper); // next BlinkStick
        } else if (oThis.oQueuedSingleColor !== undefined) {
          oSingleColor = oThis.oQueuedSingleColor; oThis.oQueuedSingleColor = undefined;
          aaoMultiColors = oThis.aaoQueuedMultiColors; oThis.aaoQueuedMultiColors = undefined;
          bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSetColors > finished, starting next in queue");
          process.nextTick(function () {
            oThis.bBusySettingColors = false; // done with previous color
            oThis.fSetColors(oSingleColor, aaoMultiColors); // apply queued color change
          });
        } else {
          bBlinkStickConsoleOutput && console.log("cBlinkSticksCollection::fSetColors > finished");
          oThis.bBusySettingColors = false; // done
        };
      };
    }
  })();
};
