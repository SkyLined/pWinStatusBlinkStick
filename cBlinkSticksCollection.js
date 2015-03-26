module.exports = cBlinkSticksCollection;

var bBlinkStickConsoleOutput = false;

var mBlinkStick = require("BlinkStick"),
    cBlinkStick = require("./cBlinkStick");

function cBlinkSticksCollection(aoBlinkSticks) {
  if (this.constructor != arguments.callee) return new arguments.callee(aoBlinkSticks);
  var oThis = this;
  oThis.aoBlinkSticks = aoBlinkSticks;
  oThis.bBusySettingColors = false;
  oThis.oQueuedSingleColor = undefined;
  oThis.aaoQueuedMultiColors = undefined;
};
cBlinkSticksCollection.fCreateForAll = function cBlinkSticksCollection_foGetAll(fCallback) {
  // callback args: oError, oBlinkSticksCollection
  var aoBlinkSticks = mBlinkStick.findAll().map(function (oBlinkStickDevice) { return new cBlinkStick(oBlinkStickDevice); });
  cBlinkSticksCollection.fCreateForBlinkSticks(aoBlinkSticks, fCallback);
}
cBlinkSticksCollection.fCreateForSerialNumbers = 
    function cBlinkSticksCollection_foGetForSerialNumbers(asSerialNumbers, fCallback) {
  // callback args: oError, oBlinkSticksCollection
  if (!asSerialNumbers || asSerialNumbers.length == 0) throw new Error("No serial numbers provided");
  var aoBlinkSticks = [], oLastError = undefined;
  (function cBlinkSticksCollection_foGetForSerialNumbers_Helper() {
    var sSerialNumber = asSerialNumbers[aoBlinkStickDevices.length];
    mBlinkStick.findBySerial(sSerialNumber, function (oBlinkStickDevice) {
      if (!oBlinkStickDevice) {
        oLastError = new Error("Cannot find BlinkStick with serial number \"" + sSerialNumber + "\"");
      }
      aoBlinkSticks.push(new cBlinkStick(oBlinkStickDevice, sSerialNumber));
      if (aoBlinkSticks.length < asSerialNumbers.length) {
        cBlinkSticksCollection_foGetForSerialNumbers_Helper(); // find next
      } else if (oLastError) {
        process.nextTick(function () { fCallback(oLastError, undefined); });
      } else {
        cBlinkSticksCollection.fCreateForBlinkSticks(aoBlinkSticks, fCallback);
      };
    });
  })();
};
cBlinkSticksCollection.fCreateForBlinkSticks = 
    function cBlinkSticksCollection_fCreateForBlinkSticks(aoBlinkSticks, fCallback) {
  // callback args: oError, oBlinkSticksCollection
  var uIndex = 0, oLastError = undefined;
  aoBlinkSticks.forEach(function (oBlinkStick) {
    oBlinkStick.fGetSerialNumber(function (oError, sSerialNumber) {
      if (oError) oLastError = oError;
      oBlinkStick.fGetMode(function (oError, uMode) {
        if (oError) oLastError = oError;
        if (++uIndex == aoBlinkSticks.length) {
          var oBlinkSticksCollection = oLastError ? undefined : new cBlinkSticksCollection(aoBlinkSticks);
          process.nextTick(function () { fCallback(oLastError, oBlinkSticksCollection); });
        };
      });
    });
  });
}
cBlinkSticksCollection.prototype.fSwitchModes = function cBlinkSticksCollection_fSwitchModes(uMode, fCallback) {
  var uIndex = 0, oLastError = undefined;
  oThis.aoBlinkSticks.forEach(function (oBlinkStick) {
    oBlinkStick.fSwitchMode(uMode, function (oError) {
      if (oError) oLastError = oError;
      if (++uIndex == oThis.aoBlinkSticks) {
        process.nextTick(function () { fCallback(oLastError); });
      };
    });
  });
};

cBlinkSticksCollection.prototype.fSetColors = function cBlinkSticksCollection_fSetColors(oSingleColor, aaoMultiColors) {
  var oThis = this;
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
  var uColorsSet = 0;
  oThis.aoBlinkSticks.forEach(function (oBlinkStick) {
    oBlinkStick.fGetMode(function () {
      if (oBlinkStick.uMode == 2) {
        oBlinkStick.fSetColors(aaoMultiColors, fSetColorCallback);
      } else {
        oBlinkStick.fSetColor(oSingleColor, fSetColorCallback);
      }
    });
    function fSetColorCallback() {
      if (++uColorsSet == oThis.aoBlinkSticks.length) {
        oThis.bBusySettingColors = false; // Done setting colors
        if (oThis.oQueuedSingleColor !== undefined) { // If there are other colors queued, set it again.
          oSingleColor = oThis.oQueuedSingleColor; oThis.oQueuedSingleColor = undefined;
          aaoMultiColors = oThis.aaoQueuedMultiColors; oThis.aaoQueuedMultiColors = undefined;
          oThis.fSetColors(oSingleColor, aaoMultiColors);
        }
      }
    }
  });
};
